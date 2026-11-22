// commands.js
const vscode = require('vscode');
const { logger } = require('./logging');

let term = null;

/**
 * Vrátí existující terminál "MicroPython" nebo vytvoří nový.
 *
 * Terminál se používá pro spouštění příkazů definovaných v nastavení
 * (micropython.commands). Všechny příkazy běží ve stejném terminálu,
 * aby se uživateli neotvíralo více oken.
 *
 * @returns {vscode.Terminal} - aktivní terminál pro MicroPython
 */
function ensureTerminal() {
    if (!term) term = vscode.window.createTerminal("MicroPython");
    term.show();
    return term;
}

/**
 * Dynamicky zaregistruje příkazy podle seznamu v nastavení:
 *   micropython.commands = [
 *      { id: "upload", name: "Upload", command: "mpremote run main.py" }
 *   ]
 *
 * Každý příkaz:
 *  - dostane vlastní ID: micropython.runCommand.<id>
 *  - po spuštění otevře terminál
 *  - pošle do něj text příkazu
 *
 * Tyto příkazy se pak používají:
 *  - ve status baru
 *  - v panelu
 *  - v command palette (přes showCommands)
 *
 * @param {vscode.ExtensionContext} context - kontext rozšíření
 * @param {Array<Object>} commands - seznam příkazů z nastavení
 * @param {vscode.OutputChannel} out - výstupní log kanál
 */
function registerDynamicCommands(context, commands, out) {
    // Ošetření zavření terminálu uživatelem (ikona koše v panelu terminálů)
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal(closedTerm => {
            if (closedTerm === term) {
                term = null;
                logger.info(out, "MicroPython terminal closed by user → reference cleared.");
            }
        })
    );

    if (!commands?.length) {
        logger.warn(out, "No commands configured → dynamic commands not registered.");
        return;
    }

    for (const cmd of commands) {
        const id = `micropython.runCommand.${cmd.id}`;

        context.subscriptions.push(
            vscode.commands.registerCommand(id, () => {
                const t = ensureTerminal();
                t.sendText(cmd.command);
                logger.info(out, `Running command: ${cmd.command}`);
            })
        );
    }

    logger.info(out, "Dynamic commands registered.");
}

module.exports = { registerDynamicCommands };
