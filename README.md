# MicroPython Panel — VS Code Extension

Rozšíření pro Visual Studio Code, které zjednodušuje práci s MicroPython deskami (Raspberry Pi Pico, PicoEd, ESP32 aj.) přímo z editoru.

Určeno pro studenty a lektory kurzu **Základy stavby a programování robotů**.

---

## ✨ Funkce

| Funkce | Popis |
|--------|-------|
| 🧩 **Sidebar panel** | Vlastní ikona mikrokontroleru v Activity Baru s přehlednými tlačítky |
| 📊 **Status Bar tlačítka** | Barevná tlačítka ve spodní liště VS Code |
| 📋 **Quick Pick menu** | `Ctrl+Shift+P` → „MicroPython: Commands" — rychlý výběr příkazu |
| ⬆ **Upload projektu** | Nahrání souborů na desku přes `mpremote` |
| ▶ **REPL** | Otevření interaktivní konzole MicroPythonu |
| 📂 **List files** | Výpis souborů uložených na desce |
| 🗑 **Wipe device** | Smazání všech souborů z desky |
| 🔄 **Obnova panelu** | Automatické znovuotevření panelu po restartu VS Code |

---

## 📸 Kde najdu tlačítka?

Po instalaci se rozšíření aktivuje v každém projektu, který obsahuje `main.py`, `boot.py`, `code.py` nebo skripty `.vscode/upload.ps1`, `.vscode/list.ps1`, `.vscode/wipe.ps1`.

Tlačítka jsou dostupná na **třech místech**:

1. **Activity Bar (vlevo)** — ikona čipu → sidebar panel s tlačítky
2. **Status Bar (dole)** — barevná tlačítka pro rychlý přístup
3. **Command Palette** — `Ctrl+Shift+P` → „MicroPython: Commands" / „MicroPython: Open Panel"

---

## ⚙️ Konfigurace

Příkazy se definují v `.vscode/settings.json` projektu:

```jsonc
{
    "micropython.enableStatusToolbar": true,
    "micropython.autoOpenPanel": true,
    "micropython.commands": [
        {
            "id": "upload",
            "name": "⬆ Upload project",
            "command": "powershell -ExecutionPolicy Bypass -File .vscode/upload.ps1",
            "color": "yellow"
        },
        {
            "id": "repl",
            "name": "▶ REPL",
            "command": "powershell -ExecutionPolicy Bypass -File .vscode/repl.ps1",
            "color": "lightgreen"
        },
        {
            "id": "list",
            "name": "📂 List files",
            "command": "powershell -ExecutionPolicy Bypass -File .vscode/list.ps1",
            "color": "lightblue"
        },
        {
            "id": "wipe",
            "name": "🗑 Wipe device",
            "command": "powershell -ExecutionPolicy Bypass -File .vscode/wipe.ps1",
            "color": "red"
        }
    ]
}
```

### Vlastnosti příkazu

| Pole | Typ | Popis |
|------|-----|-------|
| `id` | string | Unikátní identifikátor (bez mezer a diakritiky) |
| `name` | string | Text zobrazený na tlačítku (může obsahovat emoji) |
| `command` | string | Příkaz spouštěný v terminálu |
| `color` | string | Barva tlačítka (CSS název barvy nebo hex kód) |

### Nastavení rozšíření

| Klíč | Typ | Výchozí | Popis |
|------|-----|---------|-------|
| `micropython.enableStatusToolbar` | boolean | `true` | Zobrazit tlačítka ve status baru |
| `micropython.autoOpenPanel` | boolean | `true` | Automaticky obnovit editor panel po restartu |
| `micropython.commands` | array | `[]` | Seznam příkazů pro tlačítka |

---

## 🛠️ Instalace

### Pro studenty (z připraveného projektu)

1. Otevřete MicroPython projekt ve VS Code
2. Dvakrát klikněte na **`setup-MicroPython.bat`** (nebo `setup-CircuitPython.bat` pro desky s CircuitPythonem)
3. Hotovo — automaticky se zkontroluje Python, nainstalují všechny potřebné knihovny, MicroPython Panel i všechna doporučená rozšíření z Marketplace

### Ruční instalace ze souboru VSIX

```powershell
code --install-extension micropython-panel-0.2.0.vsix
```

### Z Command Palette

1. `Ctrl+Shift+P` → „Extensions: Install from VSIX…"
2. Vyberte soubor `micropython-panel-*.vsix`

---

## 🏗️ Vývoj a build

Podrobný návod na build VSIX balíčku je v souboru [BUILDING_VSIX.md](BUILDING_VSIX.md).

Rychlý start:

```powershell
# Nainstaluj závislosti
npm install

# Vytvoř VSIX balíček
npx @vscode/vsce package

# Testuj rozšíření (F5 ve VS Code)
# Otevře se nové okno VS Code s načteným rozšířením
```

---

## 📁 Struktura projektu

```
micropython-panel/
├── package.json               # Manifest rozšíření
├── src/
│   ├── extension.js           # Vstupní bod — aktivace, detekce projektu
│   ├── commands.js            # Registrace dynamických příkazů, terminál
│   ├── settings.js            # Načítání nastavení se sanitizací JSON
│   ├── ui.js                  # Status bar, Webview panel, Sidebar provider
│   └── logging.js             # Formátované logování do Output kanálu
├── media/
│   ├── panel.html             # HTML šablona pro webview
│   ├── panel.css              # Stylování (adaptivní na téma VS Code)
│   ├── panel.js               # Klientský skript webview
│   └── micropython-icon.svg   # Ikona pro Activity Bar
├── BUILDING_VSIX.md           # Návod na build
└── README.md                  # Tento soubor
```

---

## 📋 Changelog

### 0.2.2 (2026-11-22)

**Design a čitelnost tlačítek:**
- 🎨 **Nový elegantní styl tlačítek v panelu** — odstraněno křiklavé celoplošné podbarvení tlačítek, které způsobovalo špatnou čitelnost textu.
- 🔤 Tlačítka mají nyní tmavý podklad sladěný s VS Code, **výrazný barevný text** (odpovídající barvám ve spodní liště) a **barevný levý indikační proužek** pro okamžitou orientaci.

### 0.2.1 (2026-11-22)

**Vylepšení:**
- 🛡️ **Automatické výchozí příkazy (Out-of-the-box)** — pokud projekt nebo uživatel nemá definované vlastní `micropython.commands`, rozšíření automaticky nabídne výchozí sadu příkazů (Upload, REPL, List files, Wipe device). Už nikdy se nezobrazí prázdný panel s chybou.
- 🔧 Opravena prázdná konfigurace v `3-MicroPython.code-workspace`.

### 0.2.0 (2026-11-22)

**Nové funkce:**
- 🧩 **Sidebar panel v Activity Baru** — nová ikona mikrokontroleru v levé liště VS Code; tlačítka jsou trvale viditelná bez zabírání místa v editoru
- 📋 **Quick Pick menu** — příkaz „MicroPython: Commands" (`Ctrl+Shift+P`) nyní zobrazuje rychlé menu se seznamem příkazů
- 🎨 **Adaptivní CSS** — panel se automaticky přizpůsobuje světlému i tmavému tématu VS Code pomocí CSS proměnných (`--vscode-sideBar-background`, `--vscode-font-family` atd.)

**Opravy chyb:**
- 🔴 **Kritická oprava: Tlačítka ve Webview panelu nefungovala** — kliknutí na tlačítko v panelu posílalo neúplný identifikátor příkazu (např. `"upload"` místo `"micropython.runCommand.upload"`); opraveno přidáním předpony
- 🟡 **Oprava pádu po zavření terminálu** — pokud uživatel zavřel terminál „MicroPython" ikonou koše, další kliknutí na tlačítko způsobilo chybu (disposed terminal); nyní se reference automaticky vynuluje a vytvoří se nový terminál

### 0.1.15 (2026-04-19)

- Kompletní modulární architektura (extension.js, commands.js, settings.js, ui.js, logging.js)
- Dynamické příkazy načítané z nastavení `micropython.commands`
- Status bar tlačítka s konfigurovatelnou barvou
- Webview panel s obousměrnou komunikací
- Obnova panelu po restartu VS Code (serializer + deserializer)
- Robustní sanitizace JSON (BOM, komentáře, trailing commas)
- Prioritní vyhledávání nastavení (workspace → folder → user → default)
- Automatická detekce MicroPython projektu
- Build skripty pro VSIX balíčky

### 0.1.0 – 0.1.14

- Postupný vývoj a iterace základních funkcí
- Experimentální buildy

---

## 📄 Licence

MIT — viz soubor [LICENSE](LICENSE).

---

## 👤 Autor

**Jan Chaloupek** — [jan.chaloupek@usmej.se](mailto:jan.chaloupek@usmej.se)

GitHub: [JanChaloupek/micropython-panel](https://github.com/JanChaloupek/micropython-panel)
