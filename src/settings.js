// settings.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { logger } = require("./logging");

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

    logger.warn(out, `No non-empty value found for '${settingName}'`);
    return undefined;
}

module.exports = { getSetting };
