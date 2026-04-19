const vscode = acquireVsCodeApi();

logToExtension("panel.js loaded");

/**
 * Zapíše log do konzole webview a zároveň odešle strukturovaný log
 * do VS Code extension, kde se zobrazí v Output panelu.
 *
 * Používá se pro:
 *  - ladění webview
 *  - sledování vykreslování tlačítek
 *  - logování kliknutí
 *  - logování přijatých zpráv z extension
 *
 * @param {string} message
 *      Textová zpráva, která se má zalogovat.
 *
 * @param {any} [data=null]
 *      Volitelná doplňující data (např. objekt příkazu).
 */
function logToExtension(message, data = null) {
    console.log("[Webview]", message, data);

    vscode.postMessage({
        log: {
            message: `[Webview] ${message}`,
            data
        }
    });
}

/**
 * Listener pro zprávy z VS Code extension.
 *
 * Extension může poslat:
 *  - { commands: Array } → seznam příkazů pro vykreslení tlačítek
 *  - jiné zprávy (ignorují se, ale zalogují)
 *
 * Po přijetí příkazů se zavolá renderButtons().
 */
window.addEventListener("message", event => {
    logToExtension("Received message", event.data);

    if (event.data.commands) {
        logToExtension("Received commands", event.data.commands);
        renderButtons(event.data.commands);
    } else {
        logToExtension("Message has no commands field");
    }
});

// Po načtení webview dáme extension vědět, že jsme připraveni
vscode.postMessage({ ready: true });
logToExtension("Sent { ready: true } to extension");

/**
 * Vykreslí tlačítka v panelu podle seznamu příkazů.
 *
 * Každé tlačítko:
 *  - má text (cmd.name)
 *  - při kliknutí pošle { command: cmd.id } zpět do extension
 *  - může mít vlastní barvu (cmd.color)
 *
 * Funkce také:
 *  - zaloguje počet tlačítek (informativně)
 *  - zaloguje vytvoření každého tlačítka
 *  - zaloguje použitou barvu (pokud existuje)
 *
 * Pokud nejsou žádné příkazy, zobrazí se textová hláška.
 *
 * @param {Array<Object>} commands
 *      Seznam příkazů ve formátu:
 *      {
 *          id: string,
 *          name: string,
 *          color?: string
 *      }
 */
function renderButtons(commands) {
    logToExtension("Rendering buttons", commands);

    const toolbar = document.getElementById("toolbar");
    toolbar.innerHTML = "";

    if (!commands || commands.length === 0) {
        logToExtension("No commands to render");
        toolbar.textContent = "Žádné příkazy nejsou k dispozici.";
        return;
    }

    // ⭐ Informativní log – počet tlačítek
    logToExtension(`Total buttons to render: ${commands.length}`);

    for (const cmd of commands) {
        logToExtension(`Creating button: ${cmd.name}`, cmd);

        const btn = document.createElement("button");
        btn.textContent = cmd.name;

        if (cmd.color) {
            btn.style.setProperty("--btn-color", cmd.color);
            logToExtension(` → Applied color: ${cmd.color}`);
        }

        btn.onclick = () => {
            logToExtension(`Button clicked → sending command: ${cmd.id}`);
            vscode.postMessage({ command: cmd.id });
        };

        toolbar.appendChild(btn);
    }

    logToExtension("Buttons rendered successfully");
}
