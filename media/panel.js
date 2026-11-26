const vscode = acquireVsCodeApi();

/**
 * Klientský skript panelu (běží uvnitř webview).
 *
 * Panel je RYCHLÝ PŘÍSTUP k základním akcím pro studenty, ne kopie všech
 * příkazů CLI. Skládá se z bloků – jeden blok na platformu (MicroPython,
 * CircuitPython). Každý blok ukazuje:
 *  - připojené desky té platformy (port, disk, jméno, firmware),
 *  - pár základních tlačítek (pole `group` a `platform` v nastavení).
 * Blok, pro který není připojená žádná deska, je ztlumený
 * (tlačítka ale fungují dál). Dole je odkaz na nápovědu CLI.
 *
 * Zprávy z rozšíření:
 *  - { commands, notice, os }  tlačítka; notice = text místo tlačítek;
 *                              os = process.platform (pro nápovědu CLI)
 *  - { devices }               seznam připojených desek (devices.js)
 *
 * Zprávy do rozšíření:
 *  - { ready: true }          webview je připravené
 *  - { command: id }          uživatel klikl na tlačítko
 *  - { refreshDevices: true } uživatel klikl na „↻“
 *  - { log: { message } }     ladicí zprávy do Output kanálu
 *
 * Všechny texty z nastavení i ze seznamu desek se vkládají přes
 * textContent (nikdy jako HTML), takže nemohou rozbít stránku.
 */

let commands = [];
let notice = null;
let os = "win32";
let devicesState = { status: "disabled" };

function logToExtension(message) {
    vscode.postMessage({ log: { message: `[Webview] ${message}` } });
}

/** Pomocná funkce: vytvoří element s třídou a textem. */
function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
}

window.addEventListener("message", event => {
    const msg = event.data || {};
    if (msg.commands) {
        commands = msg.commands;
        notice = msg.notice || null;
        os = msg.os || os;
    }
    if (msg.devices) {
        devicesState = msg.devices;
    }
    if (msg.commands || msg.devices) {
        render();
    }
});

// Po načtení webview dáme rozšíření vědět, že jsme připraveni
vscode.postMessage({ ready: true });
logToExtension("panel.js loaded, sent ready");

/** Vykreslí celý panel: záhlaví, bloky, patičku. */
function render() {
    renderHeader();

    const root = document.getElementById("toolbar");
    root.textContent = "";

    if (notice) {
        root.appendChild(el("div", "hint notice", notice));
        return;
    }
    if (!commands || commands.length === 0) {
        root.appendChild(el("div", "hint", "Žádné příkazy nejsou k dispozici."));
        return;
    }

    for (const block of groupCommands()) {
        root.appendChild(renderBlock(block));
    }
    root.appendChild(renderFooter());
}

/**
 * Záhlaví „Desky ↻“ se stavem zjišťování desek.
 * Když seznam desek není zapnutý (devicesCommand), záhlaví se skryje.
 */
function renderHeader() {
    const box = document.getElementById("devices");
    box.textContent = "";
    if (devicesState.status === "disabled" || notice) {
        box.hidden = true;
        return;
    }
    box.hidden = false;

    const head = el("div", "section-head");
    head.appendChild(el("span", "section-title", "Desky"));
    let state = "";
    if (devicesState.status === "loading") state = "hledám…";
    else if (devicesState.status === "ok" && devicesState.updated) state = devicesState.updated;
    head.appendChild(el("span", "header-state", state));
    const refresh = el("button", "icon-button", devicesState.refreshing ? "…" : "↻");
    refresh.title = "Znovu zjistit připojené desky";
    refresh.onclick = () => vscode.postMessage({ refreshDevices: true });
    head.appendChild(refresh);
    box.appendChild(head);

    if (devicesState.status === "error") {
        box.appendChild(el("div", "hint error", "Připojené desky se nepodařilo zjistit."));
        box.appendChild(el("div", "hint small", devicesState.message || ""));
    }
}

/** Seskupí tlačítka do bloků podle pole `group` (v pořadí z nastavení). */
function groupCommands() {
    const blocks = [];
    const byName = new Map();
    for (const cmd of commands) {
        const name = cmd.group || "";
        if (!byName.has(name)) {
            const b = { name, platform: cmd.platform, items: [] };
            byName.set(name, b);
            blocks.push(b);
        }
        byName.get(name).items.push(cmd);
    }
    return blocks;
}

/** Jeden blok: název platformy, připojené desky, tlačítka. */
function renderBlock(block) {
    const section = el("section", "block" + (block.platform ? ` platform-${block.platform}` : ""));
    const devices = devicesOf(block.platform);
    if (devices && devices.length === 0) section.classList.add("inactive");

    // Záhlaví bloku: název + stav připojení
    const head = el("div", "block-head");
    head.appendChild(el("span", "block-title", block.name || "Příkazy"));
    if (devices) {
        head.appendChild(el("span", "block-state", devices.length ? "připojena" : "nepřipojena"));
    }
    section.appendChild(head);

    // Připojené desky této platformy
    const hasMultiple = devices && devices.length > 1;
    for (const d of devices || []) {
        const dev = el("div", "block-device" + (hasMultiple ? " selectable" : "") + (d.active ? " is-active" : ""));
        if (hasMultiple) {
            const radio = el("span", "device-radio", d.active ? "●" : "○");
            dev.appendChild(radio);
            dev.title = d.active
                ? (d.selected ? "Ručně vybraná deska. Kliknutím vrátíte na automatický výběr." : "Aktivní deska (výchozí). Kliknutím potvrdíte ruční výběr.")
                : "Kliknutím vyberete tuto desku jako aktivní.";
            dev.onclick = () => {
                const target = (d.active && d.selected) ? "auto" : (d.port || d.drive);
                vscode.postMessage({ selectDevice: { platform: block.platform, target } });
            };
        } else if (d.active) {
            const dot = el("span", "device-dot", "●");
            dot.title = "Aktivní deska";
            dev.appendChild(dot);
        }

        const where = [d.port, d.drive].filter(Boolean).join(" · ");
        dev.appendChild(el("span", "where", where));
        if (d.name) dev.appendChild(el("span", "device-name", d.name));
        if (d.selected) {
            dev.appendChild(el("span", "device-badge", "vybrána"));
        }
        section.appendChild(dev);
        if (d.firmware) section.appendChild(el("div", "device-sub small", d.firmware));
        if (d.note) section.appendChild(el("div", "device-sub warn", d.note));
    }

    // Tlačítka (v panelu text `label`, jinak `name`)
    for (const cmd of block.items) {
        const btn = el("button", "command", cmd.label || cmd.name);
        btn.title = cmd.command || "";
        if (cmd.confirm) {
            // Nevratná akce: odsazená od ostatních, rozšíření se před spuštěním zeptá
            btn.classList.add("danger");
            btn.title += "\n(před spuštěním se zeptá)";
        }
        if (cmd.color) btn.style.setProperty("--btn-color", cmd.color);
        btn.onclick = () => {
            logToExtension(`Button clicked → ${cmd.id}`);
            vscode.postMessage({ command: cmd.id });
        };
        section.appendChild(btn);
    }
    return section;
}

/** Patička: deska v bootloaderu (pokud je) a odkaz na další příkazy v CLI. */
function renderFooter() {
    const foot = el("div", "footer");
    for (const d of devicesOf("bootloader") || []) {
        foot.appendChild(el("div", "hint warn",
            `Deska v režimu bootloaderu (${d.drive}): stiskněte RESET, nebo nahrajte firmware.`));
    }
    const win = os === "win32";
    const mpy = win ? ".\\mpy help" : "./mpy.sh help";
    const cpy = win ? ".\\cpy help" : "./cpy.sh help";
    foot.appendChild(el("div", "hint small", `Další příkazy v terminálu: ${mpy}  ·  ${cpy}`));
    return foot;
}

/**
 * Připojené desky dané platformy.
 *  - undefined: nevíme (blok nemá platformu, nebo seznam desek není k dispozici)
 *  - pole (může být prázdné): připojené desky
 */
function devicesOf(platform) {
    if (!platform || devicesState.status !== "ok") return undefined;
    return (devicesState.devices || []).filter(d => d.platform === platform);
}
