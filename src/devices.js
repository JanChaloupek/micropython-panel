// devices.js
const cp = require("child_process");
const { logger } = require("./logging");

/**
 * Hlídá, jaké desky jsou připojené k počítači.
 *
 * Rozšíření samo desky nehledá (v Node.js by to bez nativních modulů
 * nešlo spolehlivě na všech systémech). Místo toho spouští příkaz
 * z nastavení `micropython.devicesCommand`, typicky:
 *
 *     python .vscode/deska.py devices --json
 *
 * Příkaz musí vypsat JSON ve tvaru:
 *
 *     { "version": 1,
 *       "devices": [
 *         { "platform": "circuitpython" | "micropython" | "bootloader" | "other",
 *           "port": "COM5" | null,          // sériový port
 *           "drive": "F:\\" | null,         // USB disk (CircuitPython, bootloader)
 *           "name": "ELECFREAKS PICO:ED",   // jméno desky
 *           "firmware": "Adafruit CircuitPython 9.2.7 ..." | null,
 *           "note": "..." | null }          // upozornění (např. chybí port)
 *       ] }
 *
 * Aby zbytečně nezatěžoval počítač, příkaz se spouští jen tehdy,
 * když je panel s tlačítky vidět, a nikdy dvakrát najednou.
 * Příkaz nesmí otevírat sériové porty (deska.py je neotevírá),
 * jinak by kolidoval s REPL nebo Serial Monitorem.
 */
class DeviceMonitor {
    /**
     * @param {string|undefined} command - příkaz z nastavení (prázdný = funkce vypnutá)
     * @param {number} intervalSeconds - jak často obnovovat, když je panel vidět (0 = jen ručně)
     * @param {string|undefined} cwd - pracovní složka (kořen projektu)
     * @param {vscode.OutputChannel} out - výstupní kanál pro logování
     */
    constructor(command, intervalSeconds, cwd, out) {
        this.command = (command || "").trim();
        this.interval = Math.max(0, Number(intervalSeconds) || 0) * 1000;
        this.cwd = cwd;
        this.out = out;
        this.views = new Set();     // připojené webview: { post(msg), visible }
        this.running = false;
        this.timer = null;
        this.state = this.command
            ? { status: "loading" }
            : { status: "disabled" };
    }

    /** Je funkce zapnutá (je nastavený příkaz)? */
    get enabled() {
        return this.command.length > 0;
    }

    /**
     * Připojí webview, které chce dostávat seznam desek.
     * Vrací objekt pro nastavení viditelnosti a odpojení.
     *
     * @param {(msg: object) => void} post - funkce, která pošle zprávu do webview
     * @param {boolean} visible - je webview právě vidět?
     */
    addView(post, visible) {
        const view = { post, visible };
        this.views.add(view);
        post({ devices: this.state });
        this._onVisibilityChange();
        return {
            setVisible: (v) => {
                view.visible = v;
                if (v) post({ devices: this.state });
                this._onVisibilityChange();
            },
            dispose: () => {
                this.views.delete(view);
                this._onVisibilityChange();
            }
        };
    }

    /** Okamžitě zjistí desky znovu (tlačítko ↻ v panelu). */
    refresh() {
        if (!this.enabled || this.running) return;
        this.running = true;
        this._broadcast({ ...this.state, refreshing: true });

        const options = {
            cwd: this.cwd,
            timeout: 15000,
            windowsHide: true,
            // Python má na Windows do roury jinak kódování podle systému (cp1250)
            env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", NO_COLOR: "1" }
        };
        cp.exec(this.command, options, (err, stdout, stderr) => {
            this.running = false;
            this.state = parseDevices(err, stdout, stderr);
            if (this.state.status === "error") {
                logger.warn(this.out, `Devices command failed: ${this.state.message}`);
            }
            this._broadcast(this.state);
            this._schedule();
        });
    }

    /** Zastaví automatické obnovování (při deaktivaci rozšíření). */
    dispose() {
        clearTimeout(this.timer);
        this.timer = null;
        this.views.clear();
    }

    // --- vnitřní funkce ---

    _anyVisible() {
        for (const v of this.views) if (v.visible) return true;
        return false;
    }

    _onVisibilityChange() {
        if (this._anyVisible()) {
            // Panel se právě ukázal: když nic neběží ani nečeká, zjistíme desky hned
            if (!this.running && !this.timer) this.refresh();
        } else {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    _schedule() {
        clearTimeout(this.timer);
        this.timer = null;
        if (this.interval > 0 && this._anyVisible()) {
            this.timer = setTimeout(() => {
                this.timer = null;
                this.refresh();
            }, this.interval);
        }
    }

    _broadcast(state) {
        for (const v of this.views) {
            if (v.visible) v.post({ devices: state });
        }
    }
}

/**
 * Převede výstup příkazu na stav pro panel:
 *   { status: "ok", devices: [...], updated: "12:34:56" }
 *   { status: "error", message: "..." }
 */
function parseDevices(err, stdout, stderr) {
    const text = String(stdout || "");
    const start = text.indexOf("{");
    if (start >= 0) {
        try {
            const data = JSON.parse(text.slice(start));
            if (Array.isArray(data.devices)) {
                return {
                    status: "ok",
                    devices: data.devices,
                    updated: new Date().toLocaleTimeString()
                };
            }
        } catch (e) {
            // pokračujeme na chybové hlášení níže
        }
    }
    const detail = String(stderr || "").trim() || (err && err.message) || text.trim() || "neznámá chyba";
    return { status: "error", message: detail.split(/\r?\n/).slice(-3).join(" ") };
}

module.exports = { DeviceMonitor, parseDevices };
