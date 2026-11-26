// extension.js
const vscode = require('vscode');
const { logger } = require('./logging');
const { getSetting, findDeskaProject } = require('./settings');
const { registerDynamicCommands } = require('./commands');
const { createStatusButtons, openPanel, MicroPythonSidebarProvider } = require('./ui');
const { DeviceMonitor } = require('./devices');

let restoredPanel = null; // sem si serializer uloží panel
let deviceMonitor = null;

/** Text v panelu, když otevřená složka není projekt pro desku. */
const NOT_BOARD_NOTICE =
    "Tato složka není projekt pro desku s MicroPythonem nebo CircuitPythonem " +
    "(chybí main.py, code.py, boot.py i .vscode/deska.py). " +
    "Otevřete startovací projekt kurzu (File → Open Folder).";

/**
 * Detekuje, zda je aktuální workspace projekt pro MicroPython nebo CircuitPython.
 *
 * Projekt se pozná podle toho, že obsahuje:
 *  - main.py, code.py nebo boot.py
 *  - nebo nástroj .vscode/deska.py
 *
 * Tato detekce zabraňuje aktivaci rozšíření v projektech,
 * kde by nedávalo smysl (např. webové projekty, C#, atd.).
 *
 * @returns {Promise<boolean>} - true pokud jde o projekt pro desku
 */
async function isBoardProject() {
    const pyFiles = await vscode.workspace.findFiles("**/{main.py,code.py,boot.py}", "**/node_modules/**", 1);
    const tools = await vscode.workspace.findFiles("**/.vscode/deska.py", null, 1);
    return pyFiles.length > 0 || tools.length > 0;
}

/**
 * Hlavní aktivační funkce rozšíření.
 *
 * Provádí:
 *  1) vytvoření logovacího kanálu
 *  2) detekci projektu pro desku
 *  3) načtení nastavení (commands, enableStatusToolbar, devicesCommand)
 *  4) registraci serializeru pro obnovu panelu v editoru
 *  5) registraci dynamických příkazů (tlačítek)
 *  6) vytvoření tlačítek ve status baru (jen ta bez statusBar: false)
 *  7) obnovení panelu z minulé relace
 *  8) panel v postranní liště (Activity Bar)
 *  9) příkazy Open Panel, Commands a Refresh Devices
 * 10) nabídku na přenačtení okna po změně nastavení
 *
 * Moduly:
 *  - settings.js  → načítání nastavení
 *  - commands.js  → dynamické příkazy (terminál)
 *  - devices.js   → seznam připojených desek
 *  - ui.js        → status bar, panel v editoru, panel v postranní liště
 *
 * @param {vscode.ExtensionContext} context - kontext rozšíření
 */
async function activate(context) {

    // 1) Vytvoření logovacího kanálu
    const out = vscode.window.createOutputChannel("MicroPython & CircuitPython Panel");
    logger.info(out, "Extension activated.");

    // 2) Detekce projektu
    //    Kontextový klíč micropython.boardProject řídí, jestli je vidět ikona
    //    panelu a příkazy v paletě (viz "when" v package.json).
    const isBoard = await isBoardProject();
    await vscode.commands.executeCommand("setContext", "micropython.boardProject", isBoard);
    if (!isBoard) {
        logger.warn(out, "Not a MicroPython / CircuitPython project → extension will not initialize.");
        // Panel se přesto může otevřít (např. z minulé relace). Bez zaregistrovaného
        // poskytovatele by VS Code donekonečna ukazoval načítání - proto vysvětlení.
        const idle = new DeviceMonitor("", 0, undefined, out);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider("micropython.sidebarPanel",
                new MicroPythonSidebarProvider(context, [], idle, out, NOT_BOARD_NOTICE))
        );
        return;
    }
    logger.info(out, "Board project detected.");

    // 3) Načtení nastavení
    const commands = getSetting("commands", out) || [];
    const projectDir = findDeskaProject() || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    deviceMonitor = new DeviceMonitor(
        getSetting("devicesCommand", out),
        getSetting("devicesRefreshSeconds", out) ?? 5,
        projectDir,
        out
    );
    context.subscriptions.push({ dispose: () => deviceMonitor.dispose() });
    logger.info(out, deviceMonitor.enabled
        ? `Device list enabled: ${deviceMonitor.command}`
        : "Device list disabled (micropython.devicesCommand is empty).");

    // 4) Serializer — jen uloží panel, obnovu udělá waitForSerializerAndRestore
    vscode.window.registerWebviewPanelSerializer("micropythonPanel", {
        async deserializeWebviewPanel(panel) {
            logger.info(out, "Serializer captured existing panel");
            restoredPanel = panel;
        }
    });

    // 5) Registrace dynamických příkazů
    registerDynamicCommands(context, commands, out);

    // 6) Status bar tlačítka
    if (getSetting("enableStatusToolbar", out)) {
        createStatusButtons(context, commands, out);
    }

    // 7) Obnova panelu z minulé relace — bezpečně, bez závodních podmínek
    //    (micropython.autoOpenPanel = false → panel z minulé relace se zavře)
    waitForSerializerAndRestore(context, commands, out, getSetting("autoOpenPanel", out) !== false);

    // 8) Panel v postranní liště (Activity Bar)
    const sidebarProvider = new MicroPythonSidebarProvider(context, commands, deviceMonitor, out);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("micropython.sidebarPanel", sidebarProvider)
    );

    // 9a) Otevření panelu jako záložky v editoru
    context.subscriptions.push(
        vscode.commands.registerCommand("micropython.openPanel", () => {
            openPanel(context, commands, deviceMonitor, out);
        })
    );

    // 9b) Rychlé menu (Command Palette → Commands), rozdělené podle skupin
    context.subscriptions.push(
        vscode.commands.registerCommand("micropython.showCommands", async () => {
            if (!commands.length) {
                vscode.window.showWarningMessage("MicroPython & CircuitPython: Žádné příkazy nejsou nakonfigurovány.");
                return;
            }
            const items = [];
            let lastGroup;
            for (const cmd of commands) {
                if (cmd.group && cmd.group !== lastGroup) {
                    items.push({ label: cmd.group, kind: vscode.QuickPickItemKind.Separator });
                    lastGroup = cmd.group;
                }
                items.push({
                    label: cmd.name,
                    description: cmd.label && cmd.label !== cmd.name ? cmd.label : undefined,
                    detail: cmd.command,
                    commandId: `micropython.runCommand.${cmd.id}`
                });
            }
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: "Vyberte příkaz pro desku…"
            });
            if (selected?.commandId) {
                vscode.commands.executeCommand(selected.commandId);
            }
        })
    );

    // 9c) Ruční obnovení seznamu desek
    context.subscriptions.push(
        vscode.commands.registerCommand("micropython.refreshDevices", () => deviceMonitor.refresh())
    );

    // 10) Nastavení se načítá jen při startu → po změně nabídneme přenačtení okna
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (!e.affectsConfiguration("micropython")) return;
            logger.info(out, "micropython.* settings changed");
            const choice = await vscode.window.showInformationMessage(
                "Nastavení panelu MicroPython & CircuitPython se změnilo. Projeví se po přenačtení okna.",
                "Přenačíst okno"
            );
            if (choice) {
                vscode.commands.executeCommand("workbench.action.reloadWindow");
            }
        })
    );

    logger.info(out, "Initialization complete.");
}

/**
 * Čeká na to, až serializer dodá panel, a pak ho obnoví.
 *
 * Tohle je jediné místo, kde se panel obnovuje.
 *
 * Zabraňuje:
 *  - duplikaci panelů
 *  - prázdným oknům
 *  - závodním podmínkám mezi activate() a serializerem
 */
async function waitForSerializerAndRestore(context, commands, out, autoOpen) {
    // čekáme max 2 sekundy, kontrolujeme každých 50 ms
    for (let i = 0; i < 40; i++) {
        if (restoredPanel) {
            if (!autoOpen) {
                logger.info(out, "autoOpenPanel is false → closing panel from previous session");
                restoredPanel.dispose();
                return;
            }
            logger.info(out, "Restoring panel after serializer");
            openPanel(context, commands, deviceMonitor, out, restoredPanel);
            return;
        }
        await new Promise(r => setTimeout(r, 50));
    }

    logger.info(out, "No panel to restore");
}

function deactivate() {
    if (deviceMonitor) deviceMonitor.dispose();
}

exports.activate = activate;
exports.deactivate = deactivate;
