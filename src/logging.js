// logging.js

/**
 * Zapíše zprávu do výstupního kanálu s jednotným formátem:
 * [YYYY-MM-DD HH:MM:SS] LEVEL  message
 *
 * Tento formát:
 *  - usnadňuje čtení logů
 *  - umožňuje rychle filtrovat podle úrovně (INFO, WARN, ERROR)
 *  - je konzistentní napříč celým rozšířením
 *
 * @param {vscode.OutputChannel} out - výstupní kanál, kam se loguje
 * @param {"info"|"warn"|"error"} level - úroveň logu
 * @param {string} message - text zprávy
 */
function log(out, level, message) {
    const now = new Date();
    const timestamp =
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0") + " " +
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0") + ":" +
        String(now.getSeconds()).padStart(2, "0");

    const lvl = level.toUpperCase().padEnd(5, " ");
    out.appendLine(`[${timestamp}] ${lvl} ${message}`);
}

/**
 * Jednoduchý wrapper pro logování.
 *
 * Použití:
 *   logger.info(out, "Něco se stalo");
 *   logger.warn(out, "Pozor, něco není ideální");
 *   logger.error(out, "Něco se pokazilo");
 *
 * Výhody:
 *  - jednotné API
 *  - snadná výměna implementace logování v budoucnu
 *  - přehlednost v kódu (není potřeba psát level ručně)
 */
module.exports = {
    logger: {
        info:  (out, msg) => log(out, "info", msg),
        warn:  (out, msg) => log(out, "warn", msg),
        error: (out, msg) => log(out, "error", msg)
    }
};
