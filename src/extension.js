// extension.js
const vscode = require('vscode');
const { logger } = require('./logging');
const { getSetting } = require('./settings');
const { registerDynamicCommands } = require('./commands');
const { createStatusButtons, openPanel, MicroPythonSidebarProvider } = require('./ui');

let restoredPanel = null; // sem si serializer uloží panel 

/**
 * Detekuje, zda je aktuální workspace MicroPython projekt.
 *
 * Projekt je považován za MicroPython, pokud obsahuje:
 *  - main.py, code.py nebo boot.py
 *  - nebo skripty ve .vscode: upload.ps1, list.ps1, wipe.ps1
 *
 * Tato detekce zabraňuje aktivaci rozšíření v projektech,
 * kde by nedávalo smysl (např. webové projekty, C#, atd.).
 *
 * @returns {Promise<boolean>} - true pokud jde o MicroPython projekt
 */
async function isMicroPythonProject() {
    const pyFiles = await vscode.workspace.findFiles("**/{main.py,code.py,boot.py}");
    const psScripts = await vscode.workspace.findFiles("**/.vscode/{upload.ps1,list.ps1,wipe.ps1}");
    return pyFiles.length > 0 || psScripts.length > 0;
}

/**
 * Hlavní aktivační funkce rozšíření.
 *
 * Provádí:
 *  1) vytvoření logovacího kanálu
 *  2) detekci MicroPython projektu
 *  3) načtení nastavení (commands, enableStatusToolbar)
 *  4) Registrace serializeru pro obnovu panelu
 *  5) registraci dynamických příkazů
 *  6) vytvoření status bar tlačítek
 *  7) obnoveni panelu z minulé relace
 *  8) registraci příkazu pro otevření panelu
 *
 * Všechny části jsou modulární a oddělené v samostatných souborech:
 *  - settings.js  → načítání nastavení
 *  - commands.js  → dynamické příkazy
 *  - ui.js        → status bar + panel
 *
 * @param {vscode.ExtensionContext} context - kontext rozšíření
 */
async function activate(context) {

    // 1) vytvoření logovacího kanálu 
    const out = vscode.window.createOutputChannel("MicroPython Panel");
    logger.info(out, "Extension activated.");

    // 2) Detekce projektu
    if (!await isMicroPythonProject()) {
        logger.warn(out, "Not a MicroPython project → extension will not initialize.");
        return;
    }
    logger.info(out, "MicroPython project detected.");

    // 3) Načtení příkazů z nastavení
    const commands = getSetting("commands", out);

    // 4) Serializer — jen uloží panel
    vscode.window.registerWebviewPanelSerializer("micropythonPanel", { 
        async deserializeWebviewPanel(panel, state) { 
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
    waitForSerializerAndRestore(context, commands, out);

    // 8) Sidebar panel (Activity Bar)
    const sidebarProvider = new MicroPythonSidebarProvider(context, commands, out);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("micropython.sidebarPanel", sidebarProvider)
    );

    // 9) Registrace příkazu pro otevření panelu (záložka v editoru — zachováno pro zpětnou kompatibilitu)
    context.subscriptions.push(
        vscode.commands.registerCommand("micropython.openPanel", () => {
            openPanel(context, commands, out);
        })
    );

    // 10) Registrace příkazu pro rychlé menu (Command Palette → MicroPython: Commands)
    context.subscriptions.push(
        vscode.commands.registerCommand("micropython.showCommands", async () => {
            if (!commands?.length) {
                vscode.window.showWarningMessage("MicroPython: Žádné příkazy nejsou nakonfigurovány.");
                return;
            }
            const items = commands.map(cmd => ({
                label: cmd.name,
                description: cmd.command,
                commandId: `micropython.runCommand.${cmd.id}`
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: "Vyberte MicroPython příkaz…"
            });
            if (selected) {
                vscode.commands.executeCommand(selected.commandId);
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
async function waitForSerializerAndRestore(context, commands, out) {
    // čekáme max 2 sekundy, kontrolujeme každých 50 ms
    for (let i = 0; i < 40; i++) {
        if (restoredPanel) {
            logger.info(out, "Restoring panel after serializer");
            openPanel(context, commands, out, restoredPanel);
            return;
        }
        await new Promise(r => setTimeout(r, 50));
    }

    logger.info(out, "No panel to restore");
}

exports.activate = activate;
