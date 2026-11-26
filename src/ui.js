const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const { logger } = require('./logging');
const { findDeskaProject } = require('./settings');

/**
 * Vytvoří tlačítka ve status baru pro příkazy definované
 * v nastavení `micropython.commands`.
 *
 * Každé tlačítko:
 *  - má text (cmd.name)
 *  - volá dynamicky registrovaný příkaz `micropython.runCommand.<id>`
 *  - může mít vlastní barvu (cmd.color)
 *  - při `statusBar: false` se ve status baru NEzobrazí (jen v panelu)
 *
 * Pokud nejsou definovány žádné příkazy, funkce nic nevytvoří a zapíše varování do logu.
 *
 * @param {vscode.ExtensionContext} context
 *      Kontext rozšíření, používá se pro registraci status bar položek.
 *
 * @param {Array<Object>} commands
 *      Seznam příkazů načtených z nastavení. Každý objekt má strukturu:
 *      {
 *          id: string,
 *          name: string,
 *          command: string,
 *          color?: string,
 *          group?: string,       // nadpis skupiny v panelu
 *          platform?: string,    // "micropython" | "circuitpython"
 *          statusBar?: boolean   // false = jen v panelu
 *      }
 *
 * @param {vscode.OutputChannel} out
 *      Výstupní kanál pro logování.
 */
function createStatusButtons(context, commands, out) {
    if (!commands?.length) {
        logger.warn(out, "No commands configured → status bar not created.");
        return;
    }

    logger.info(out, "Creating status bar buttons…");

    // Priorita určuje pořadí zleva doprava: vyšší číslo = víc vlevo
    let priority = 100;
    for (const cmd of commands) {
        if (cmd.statusBar === false) {
            continue;
        }
        logger.info(out, `Creating status bar item: ${cmd.name} (${cmd.id})`);

        const btn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority--);
        btn.text = cmd.name;
        btn.command = `micropython.runCommand.${cmd.id}`;
        const what = cmd.label ? cmd.label.replace(/^\W+/, "") : cmd.name;
        btn.tooltip = `${cmd.group ? cmd.group + ": " : ""}${what}\n${cmd.command}`;

        if (cmd.color) {
            btn.color = cmd.color;
        }

        btn.show();
        context.subscriptions.push(btn);
    }

    logger.info(out, "Status bar buttons created.");
}

/**
 * Připraví webview (sidebar nebo panel v editoru) a propojí ho s rozšířením.
 *
 * Společné pro oba druhy pohledů:
 *  - načte HTML z `media/panel.html` a vloží do něj cesty k CSS/JS
 *    a bezpečnostní politiku (CSP), která povolí jen soubory rozšíření
 *  - přijímá zprávy z webview: { log }, { ready }, { command }, { refreshDevices }
 *  - posílá do webview: { commands } a { devices }
 *
 * Seznam desek dodává DeviceMonitor (devices.js). Ten příkaz pro zjištění
 * desek spouští jen tehdy, když je některý pohled vidět.
 *
 * @param {vscode.Webview} webview - webview, které se má naplnit
 * @param {object} opts
 * @param {vscode.ExtensionContext} opts.context
 * @param {Array<Object>} opts.commands - příkazy (tlačítka)
 * @param {import('./devices').DeviceMonitor} opts.devices - hlídač připojených desek
 * @param {vscode.OutputChannel} opts.out
 * @param {string} opts.label - jméno pohledu pro log ("Sidebar" / "Panel")
 * @param {boolean} opts.visible - je pohled právě vidět?
 * @param {string} [opts.notice] - text místo tlačítek (např. „není projekt pro desku“)
 * @returns {{ setVisible(v: boolean): void, dispose(): void }}
 */
function attachWebview(webview, { context, commands, devices, out, label, visible, notice }) {
    const media = vscode.Uri.joinPath(context.extensionUri, 'media');
    webview.options = {
        enableScripts: true,
        localResourceRoots: [media]
    };

    // Načtení HTML šablony a nahrazení placeholderů
    const htmlPath = path.join(context.extensionPath, 'media', 'panel.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/{{CSP}}/g, webview.cspSource);
    html = html.replace('{{CSS}}', webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.css')).toString());
    html = html.replace('{{JS}}', webview.asWebviewUri(vscode.Uri.joinPath(media, 'panel.js')).toString());
    webview.html = html;

    let deviceHandle = null;
    const post = (msg) => webview.postMessage(msg);

    const listener = webview.onDidReceiveMessage(msg => {
        if (msg.log) {
            logger.info(out, msg.log.message);
            return;
        }

        if (msg.ready) {
            logger.info(out, `${label} webview is ready → sending commands`);
            post({ commands, notice, os: process.platform });
            // Seznam desek začne chodit až teď, kdy webview umí zprávy přijímat
            if (!deviceHandle) {
                deviceHandle = devices.addView(post, visible);
            }
            return;
        }

        if (msg.refreshDevices) {
            devices.refresh();
            return;
        }

        if (msg.selectDevice) {
            const { platform, target } = msg.selectDevice;
            const tool = platform === "circuitpython" ? "cpy" : "mpy";
            const projectDir = findDeskaProject() || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const python = process.platform === "win32" ? "python" : "python3";
            const targetArg = target && target !== "auto" ? `"${target}"` : "auto";
            const cmd = `${python} .vscode/deska.py ${tool} select ${targetArg}`;
            logger.info(out, `${label} selecting device: ${cmd}`);
            cp.exec(cmd, { cwd: projectDir }, (err, stdout, stderr) => {
                if (err) {
                    logger.warn(out, `Select device failed: ${stderr || err.message}`);
                } else {
                    const res = (stdout || "").trim().split(/\r?\n/).slice(-1)[0];
                    logger.info(out, `Select result: ${res || targetArg}`);
                }
                devices.refresh();
            });
            return;
        }

        if (msg.command) {
            const targetCmd = msg.command.startsWith("micropython.")
                ? msg.command
                : `micropython.runCommand.${msg.command}`;
            logger.info(out, `${label} requested command execution: ${targetCmd}`);
            vscode.commands.executeCommand(targetCmd);
        }
    });

    return {
        setVisible(v) {
            visible = v;
            if (deviceHandle) deviceHandle.setVisible(v);
        },
        dispose() {
            listener.dispose();
            if (deviceHandle) deviceHandle.dispose();
        }
    };
}

/**
 * Otevře panel jako záložku v editoru (příkaz „Open Panel“).
 *
 * Panel se po restartu VS Code obnoví (viz serializer v extension.js).
 * Obsah je stejný jako v postranní liště.
 *
 * @param {vscode.ExtensionContext} context
 * @param {Array<Object>} commands
 * @param {import('./devices').DeviceMonitor} devices
 * @param {vscode.OutputChannel} out
 * @param {vscode.WebviewPanel|null} existingPanel - panel předaný serializerem
 */
function openPanel(context, commands, devices, out, existingPanel = null) {
    // Pokud serializer předal panel → použijeme ho, jinak vytvoříme nový
    const panel = existingPanel ?? vscode.window.createWebviewPanel(
        "micropythonPanel",
        "MicroPython & CircuitPython",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    // Ukládáme stav panelu pouze u nově vytvořeného panelu
    if (!existingPanel) {
        context.workspaceState.update("micropython.panelOpen", true);
    }

    const handle = attachWebview(panel.webview, {
        context, commands, devices, out, label: "Panel", visible: panel.visible
    });

    panel.onDidChangeViewState(e => handle.setVisible(e.webviewPanel.visible));
    panel.onDidDispose(() => {
        handle.dispose();
        context.workspaceState.update("micropython.panelOpen", false);
        logger.info(out, "Panel closed → state saved");
    });

    logger.info(out, existingPanel ? "Panel restored from previous session." : "Panel opened.");
}

/**
 * WebviewViewProvider pro panel v postranní liště (ikona v Activity Baru).
 *
 * Na rozdíl od panelu v editoru je postranní panel:
 *  - vždy snadno dostupný přes ikonu v Activity Baru
 *  - nezabírá místo v editoru
 *  - obnovuje ho po restartu sám VS Code
 */
class MicroPythonSidebarProvider {
    /**
     * @param {vscode.ExtensionContext} context - kontext rozšíření
     * @param {Array<Object>} commands - seznam příkazů z nastavení
     * @param {import('./devices').DeviceMonitor} devices - hlídač připojených desek
     * @param {vscode.OutputChannel} out - výstupní log kanál
     * @param {string} [notice] - text místo tlačítek (např. složka není projekt pro desku)
     */
    constructor(context, commands, devices, out, notice) {
        this._context = context;
        this._commands = commands;
        this._devices = devices;
        this._out = out;
        this._notice = notice;
    }

    /**
     * Vyvolá se automaticky, když VS Code zobrazí sidebar view.
     *
     * @param {vscode.WebviewView} webviewView - instance sidebar view
     */
    resolveWebviewView(webviewView) {
        const handle = attachWebview(webviewView.webview, {
            context: this._context,
            commands: this._commands,
            devices: this._devices,
            out: this._out,
            label: "Sidebar",
            visible: webviewView.visible,
            notice: this._notice
        });

        webviewView.onDidChangeVisibility(() => handle.setVisible(webviewView.visible));
        webviewView.onDidDispose(() => handle.dispose());

        logger.info(this._out, "Sidebar panel resolved.");
    }
}

module.exports = { createStatusButtons, openPanel, MicroPythonSidebarProvider };
