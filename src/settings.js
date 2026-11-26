// settings.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { logger } = require("./logging");

/**
 * Najde v otevřených složkách nástroj `.vscode/deska.py`
 * (projekty kurzu – MicroPython i CircuitPython v jednom souboru).
 *
 * @returns {string|null} - cesta ke složce projektu, nebo null
 */
function findDeskaProject() {
    for (const folder of vscode.workspace.workspaceFolders || []) {
        if (fs.existsSync(path.join(folder.uri.fsPath, ".vscode", "deska.py"))) {
            return folder.uri.fsPath;
        }
    }
    return null;
}

/** Příkaz pro Python podle systému (Windows: python, jinde python3). */
function pythonCommand() {
    return process.platform === "win32" ? "python" : "python3";
}

/**
 * Výchozí tlačítka pro projekty s `.vscode/deska.py`, když v nastavení
 * žádná nejsou (běžně je zapisuje `python .vscode/deska.py vscode`).
 *
 * Panel je rychlý přístup k ZÁKLADNÍM akcím – ostatní příkazy jsou
 * v terminálu (mpy help, cpy help). Stejná sada je v deska.py (PANEL_BUTTONS).
 */
function deskaDefaultCommands() {
    const py = pythonCommand();
    const run = (args) => `${py} .vscode/deska.py ${args}`;
    const mp = { group: "MicroPython", platform: "micropython" };
    const cp = { group: "CircuitPython", platform: "circuitpython" };
    return [
        { id: "mpy-upload", name: "$(cloud-upload) MPY Upload", label: "⬆  Nahrát projekt", command: run("mpy upload"), color: "yellow", ...mp },
        { id: "mpy-run", name: "$(play) MPY Run", label: "▶  Spustit main.py", command: run("mpy reset"), color: "lightgreen", statusBar: false, ...mp },
        { id: "mpy-repl", name: "$(terminal) MPY REPL", label: "⌨  Konzole (REPL)", command: run("mpy repl"), color: "lightblue", ...mp },
        {
            id: "mpy-wipe", name: "$(trash) MPY Wipe", label: "🗑  Smazat desku", command: run("mpy wipe --yes"),
            color: "red", statusBar: false, ...mp,
            confirm: "Smazat VŠECHNY soubory na desce s MicroPythonem? Operace je nevratná.", confirmButton: "Smazat"
        },
        { id: "cpy-upload", name: "$(cloud-upload) CPY Upload", label: "⬆  Nahrát projekt", command: run("cpy upload"), color: "yellow", ...cp },
        { id: "cpy-reset", name: "$(debug-restart) CPY Restart", label: "↻  Restartovat program", command: run("cpy reset"), color: "lightgreen", statusBar: false, ...cp },
        { id: "cpy-repl", name: "$(terminal) CPY REPL", label: "⌨  Konzole (REPL)", command: run("cpy repl"), color: "lightblue", ...cp },
        {
            id: "cpy-wipe", name: "$(trash) CPY Wipe", label: "🗑  Smazat desku", command: run("cpy wipe --yes"),
            color: "red", statusBar: false, ...cp,
            confirm: "Smazat VŠECHNY soubory na disku CIRCUITPY? Operace je nevratná.", confirmButton: "Smazat"
        }
    ];
}

/**
 * Sanitizuje JSON řetězec tak, aby byl bezpečně parsovatelný.
 *
 * Odstraňuje:
 * - BOM (Byte Order Mark)
 * - jednořádkové komentáře (// ...)
 * - víceřádkové komentáře typu blokový /* ... * /
 * - trailing commas (čárky před } nebo ])
 *
 * Tato funkce umožňuje načítat i poškozené nebo nevalidní settings.json
 * z různých úrovní (workspace, folder, user), aniž by rozšíření spadlo.
 */
function sanitizeJson(raw) {
    let cleaned = raw;

    cleaned = cleaned.replace(/^\uFEFF/, "");             // BOM
    cleaned = cleaned.replace(/\/\/.*$/gm, "");           // // komentáře
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//gm, "");  // /* */ komentáře
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");      // trailing commas

    return cleaned;
}

/**
 * Bezpečně načte JSON soubor a sanitizuje ho.
 * Pokud soubor neexistuje nebo je rozbitý → vrací {}.
 */
function loadJsonFileSafe(filePath, out) {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const cleaned = sanitizeJson(raw);
        return JSON.parse(cleaned);
    } catch (e) {
        logger.error(out, `JSON parse error in ${filePath}: ${e.message}`);
        return {};
    }
}

/**
 * Zjistí, zda je hodnota "neprázdná".
 */
function isNonEmpty(value) {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (typeof value === "object" && Object.keys(value).length === 0) return false;
    return true;
}

/**
 * Najde cestu k settings.json pro:
 * - workspace (.code-workspace)
 * - folder (.vscode/settings.json)
 * - user settings (User/settings.json)
 */
function getSettingsPaths() {
    const paths = {
        workspace: null,
        folders: [],
        user: null
    };

    // 1) Workspace (.code-workspace)
    if (vscode.workspace.workspaceFile) {
        paths.workspace = vscode.workspace.workspaceFile.fsPath;
    }

    // 2) Folder settings
    const folders = vscode.workspace.workspaceFolders || [];
    for (const folder of folders) {
        const folderSettings = path.join(folder.uri.fsPath, ".vscode", "settings.json");
        paths.folders.push(folderSettings);
    }

    // 3) User settings
    const userSettings = path.join(
        process.env.APPDATA || "",
        "Code",
        "User",
        "settings.json"
    );
    paths.user = userSettings;

    return paths;
}

/**
 * Načte nastavení micropython.<settingName> s absolutní robustností.
 *
 * PRIORITA:
 * 1) workspace settings (ručně načtené + sanitizované)
 * 2) folder settings (ručně načtené + sanitizované)
 * 3) user settings (ručně načtené + sanitizované)
 * 4) default settings (z VS Code API)
 */
function getSetting(settingName, out) {
    const key = `micropython.${settingName}`;
    const paths = getSettingsPaths();

    // ------------------------------------------------------------
    // 1) Workspace settings
    // ------------------------------------------------------------
    if (paths.workspace) {
        const wsJson = loadJsonFileSafe(paths.workspace, out);
        if (wsJson.settings && isNonEmpty(wsJson.settings[key])) {
            logger.info(out, `Using ${settingName} from WORKSPACE (.code-workspace)`);
            return wsJson.settings[key];
        }
    }

    // ------------------------------------------------------------
    // 2) Folder settings
    // ------------------------------------------------------------
    for (const folderPath of paths.folders) {
        const folderJson = loadJsonFileSafe(folderPath, out);
        if (isNonEmpty(folderJson[key])) {
            logger.info(out, `Using ${settingName} from folder settings: ${folderPath}`);
            return folderJson[key];
        }
    }

    // ------------------------------------------------------------
    // 3) User settings
    // ------------------------------------------------------------
    const userJson = loadJsonFileSafe(paths.user, out);
    if (isNonEmpty(userJson[key])) {
        logger.info(out, `Using ${settingName} from USER settings`);
        return userJson[key];
    }

    // ------------------------------------------------------------
    // 4) Default settings (VS Code API)
    // ------------------------------------------------------------
    const inspected = vscode.workspace.getConfiguration("micropython").inspect(settingName);
    if (inspected && isNonEmpty(inspected.defaultValue)) {
        logger.info(out, `Using ${settingName} from DEFAULT settings`);
        return inspected.defaultValue;
    }

    // ------------------------------------------------------------
    // 5) Automatický fallback na výchozí hodnoty (out-of-the-box)
    //    pro projekty s .vscode/deska.py: tlačítka a seznam desek.
    // ------------------------------------------------------------
    const deskaProject = findDeskaProject();
    if (settingName === "commands" && deskaProject) {
        logger.info(out, "No custom commands configured → using built-in deska.py commands");
        return deskaDefaultCommands();
    }
    if (settingName === "devicesCommand" && deskaProject) {
        logger.info(out, "No devicesCommand configured → using deska.py devices --json");
        return `${pythonCommand()} .vscode/deska.py devices --json`;
    }

    logger.warn(out, `No non-empty value found for '${settingName}'`);
    return undefined;
}

module.exports = { getSetting, findDeskaProject };
