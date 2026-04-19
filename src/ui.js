const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { logger } = require('./logging');

/**
 * Vytvoří tlačítka ve status baru pro všechny příkazy definované
 * v nastavení `micropython.commands`.
 *
 * Každé tlačítko:
 *  - má text (cmd.name)
 *  - volá dynamicky registrovaný příkaz `micropython.runCommand.<id>`
 *  - může mít vlastní barvu (cmd.color)
 *
 * Pokud nejsou definovány žádné příkazy, funkce nic nevytvoří a zapíše varování do logu.
 *
 * @param {vscode.ExtensionContext} context
 *      Kontext rozšíření, používá se pro registraci status bar položek.
 *
 * @param {Array<Object>} commands
 *      Seznam příkazů načtených z uživatelského nastavení.
 *      Každý objekt má strukturu:
 *      {
 *          id: string,
 *          name: string,
 *          color?: string
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

    for (const cmd of commands) {
        logger.info(out, `Creating status bar item: ${cmd.name} (${cmd.id})`, cmd);

        const btn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        btn.text = cmd.name;
        btn.command = `micropython.runCommand.${cmd.id}`;

        if (cmd.color) {
            btn.color = cmd.color;
            logger.info(out, ` → Applied color: ${cmd.color}`);
        }

        btn.show();
        context.subscriptions.push(btn);
    }

    logger.info(out, "Status bar buttons created.");
}


/**
 * Otevře webview panel s UI pro MicroPython.
 *
 * Panel:
 *  - načte HTML z `media/panel.html`
 *  - vloží správné cesty k CSS a JS pomocí `asWebviewUri`
 *  - pošle do webview seznam příkazů (commands)
 *  - přijímá zprávy z webview (logy, kliknutí, ready signál)
 *
 * Webview běží izolovaně, takže HTML/CSS/JS musí být načteny
 * přes `extensionUri` a `asWebviewUri`.
 *
 * Komunikace probíhá obousměrně:
 *  - webview → extension: { log }, { ready }, { command }
 *  - extension → webview: { commands }
 *
 * @param {vscode.ExtensionContext} context
 *      Kontext rozšíření, používá se pro přístup k cestám a registraci panelu.
 *
 * @param {Array<Object>} commands
 *      Seznam příkazů načtených z uživatelského nastavení.
 *      Posílá se do webview pro vykreslení tlačítek.
 *
 * @param {vscode.OutputChannel} out
 *      Výstupní kanál pro logování.
 */
function openPanel(context, commands, out, existingPanel = null) {
    // Pokud serializer předal panel → použijeme ho 
    // Pokud ne → vytvoříme nový panel
    const panel = existingPanel ?? vscode.window.createWebviewPanel(
        "micropythonPanel",
        "MicroPython Panel",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    // Ukládáme stav panelu pouze u nově vytvořeného panelu 
    if (!existingPanel) {
        context.workspaceState.update("micropython.panelOpen", true);

        panel.onDidDispose(() => {
            context.workspaceState.update("micropython.panelOpen", false);
            logger.info(out, "Panel closed → state saved");
        });
    }

    // Načtení HTML šablony
    const htmlPath = path.join(context.extensionPath, 'media', 'panel.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Cesty k CSS a JS
    const cssUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'panel.css')
    );

    const jsUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'media', 'panel.js')
    );

    // Nahrazení placeholderů
    html = html.replace('{{CSS}}', cssUri.toString());
    html = html.replace('{{JS}}', jsUri.toString());

    // Nastavení HTML do panelu
    panel.webview.html = html;

    /**
     * Listener pro zprávy z webview.
     *
     * Webview může poslat:
     *  - { log: { message, data } } → zapisuje se do logu rozšíření
     *  - { ready: true } → webview je připraveno, extension pošle příkazy
     *  - { command: string } → uživatel klikl na tlačítko, spustí se příkaz
     */
    panel.webview.onDidReceiveMessage(msg => {
        if (msg.log) {
            logger.info(out, msg.log.message, msg.log.data ?? "");
            return;
        }

        if (msg.ready) {
            logger.info(out, "Webview is ready → sending commands");
            panel.webview.postMessage({ commands });
            return;
        }

        if (msg.command) {
            logger.info(out, `Webview requested command execution: ${msg.command}`);
            vscode.commands.executeCommand(msg.command);
            return;
        }
    });

    logger.info(out, existingPanel ? "Panel restored from previous session." : "Panel opened.");
}

module.exports = { createStatusButtons, openPanel };
