# MicroPython & CircuitPython Panel — VS Code Extension

Rozšíření pro Visual Studio Code, které zjednodušuje práci s deskami s **MicroPythonem** (Raspberry Pi Pico, Pico:ed v2, BBC micro:bit, ESP32 aj.) i **CircuitPythonem** (Pico:ed v1 a v2) přímo z editoru.

Určeno pro studenty a lektory kurzu **Základy stavby a programování robotů**. Spolupracuje s nástrojem `.vscode/deska.py` ze startovacího projektu kurzu (příkazy `mpy` a `cpy`).

---

## ✨ Funkce

| Funkce | Popis |
|--------|-------|
| 🧱 **Bloky MicroPython a CircuitPython** | Postranní panel má blok pro každou platformu: připojená deska (port, disk, jméno, firmware) a pár základních tlačítek. Blok bez připojené desky se ztlumí. |
| ⚡ **Rychlý přístup, ne kopie CLI** | V panelu jsou jen základní akce (nahrát, spustit / restartovat, konzole). Další příkazy jsou v terminálu (`mpy help`, `cpy help`) – panel na ně dole odkazuje. |
| 📊 **Stavový řádek** | Nejpoužívanější tlačítka s ikonami VS Code ve spodní liště (ostatní jen v panelu) |
| 📋 **Rychlé menu** | `Ctrl+Shift+P` → „MicroPython & CircuitPython: Commands“ — výběr akce rozdělený podle platforem |
| 🔄 **Obnova panelu** | Panel otevřený v editoru se po restartu VS Code znovu otevře |

---

## 📸 Kde najdu tlačítka?

Rozšíření se aktivuje v projektu, který obsahuje `main.py`, `code.py`, `boot.py` nebo `.vscode/deska.py`. V jiných složkách se ikona panelu ani příkazy nezobrazují.

Tlačítka jsou dostupná na **třech místech**:

1. **Activity Bar (vlevo)** — ikona čipu → postranní panel s bloky MicroPython a CircuitPython
2. **Stavový řádek (dole)** — jen tlačítka, která nemají `"statusBar": false`
3. **Command Palette** — `Ctrl+Shift+P` → „MicroPython & CircuitPython: Commands“ / „… Open Panel“ / „… Refresh Devices“

Kliknutí na tlačítko otevře terminál `MicroPython` a spustí v něm příkaz.

Ve startovacím projektu kurzu panel nabízí:

| Blok | Tlačítka v panelu | Ve stavovém řádku |
|---|---|---|
| **MicroPython** | ⬆ Nahrát projekt · ▶ Spustit main.py · ⌨ Konzole (REPL) · 🗑 Smazat desku | `MPY Upload`, `MPY REPL` |
| **CircuitPython** | ⬆ Nahrát projekt · ↻ Restartovat program · ⌨ Konzole (REPL) · 🗑 Smazat desku | `CPY Upload`, `CPY REPL` |

*Smazat desku* je odsazené od ostatních tlačítek a před spuštěním se zeptá v dialogu VS Code (pole `confirm`).

---

## ⚙️ Konfigurace

Ve startovacím projektu kurzu nastavení zapisuje příkaz `python .vscode/deska.py vscode` (volá ho `setup.bat` / `setup.sh`). Když v nastavení žádná tlačítka nejsou a projekt obsahuje `.vscode/deska.py`, rozšíření použije výchozí sadu tlačítek pro `deska.py`.

Příklad `.vscode/settings.json`:

```jsonc
{
    "micropython.enableStatusToolbar": true,
    "micropython.devicesCommand": "python .vscode/deska.py devices --json",
    "micropython.devicesRefreshSeconds": 5,
    "micropython.commands": [
        {
            "id": "mpy-upload",
            "name": "$(cloud-upload) MPY Upload",
            "label": "⬆  Nahrát projekt",
            "command": "python .vscode/deska.py mpy upload",
            "color": "yellow",
            "group": "MicroPython",
            "platform": "micropython"
        },
        {
            "id": "cpy-reset",
            "name": "$(debug-restart) CPY Restart",
            "label": "↻  Restartovat program",
            "command": "python .vscode/deska.py cpy reset",
            "color": "lightgreen",
            "group": "CircuitPython",
            "platform": "circuitpython",
            "statusBar": false
        }
    ]
}
```

### Vlastnosti tlačítka (`micropython.commands`)

| Pole | Typ | Povinné | Popis |
|------|-----|---------|-------|
| `id` | string | ano | Jedinečný identifikátor (bez mezer a diakritiky) |
| `name` | string | ano | Text ve stavovém řádku a v rychlém menu; může obsahovat ikonu VS Code (`$(play)`, `$(terminal)`, …) |
| `label` | string | | Text tlačítka v panelu (výchozí = `name`) |
| `command` | string | ano | Příkaz spouštěný v terminálu |
| `color` | string | | Barva textu a proužku (CSS název barvy nebo `#rrggbb`) |
| `group` | string | | Blok v panelu; tlačítka se stejnou skupinou jsou v jednom bloku |
| `platform` | `micropython` \| `circuitpython` | | Které připojené desky blok ukazuje; bez připojené desky se blok ztlumí (tlačítka fungují dál) |
| `statusBar` | boolean | | `false` = tlačítko jen v panelu, ne ve stavovém řádku (výchozí `true`) |
| `confirm` | string | | Otázka v modálním dialogu před spuštěním – pro nevratné akce (smazání desky). Zrušení = nic se nespustí. V panelu je tlačítko odsazené. |
| `confirmButton` | string | | Text potvrzovacího tlačítka v dialogu (výchozí „Pokračovat“) |

Příklad nevratné akce s potvrzením (příkaz má `--yes`, protože se zeptalo už rozšíření):

```jsonc
{
    "id": "cpy-wipe",
    "name": "$(trash) CPY Wipe",
    "label": "🗑  Smazat desku",
    "command": "python .vscode/deska.py cpy wipe --yes",
    "color": "red",
    "group": "CircuitPython",
    "platform": "circuitpython",
    "statusBar": false,
    "confirm": "Smazat VŠECHNY soubory na disku CIRCUITPY? Operace je nevratná.",
    "confirmButton": "Smazat"
}
```

### Nastavení rozšíření

| Klíč | Typ | Výchozí | Popis |
|------|-----|---------|-------|
| `micropython.commands` | array | `[]` | Tlačítka (viz výše) |
| `micropython.enableStatusToolbar` | boolean | `true` | Zobrazit tlačítka ve stavovém řádku |
| `micropython.autoOpenPanel` | boolean | `true` | Po restartu znovu otevřít panel v editoru |
| `micropython.devicesCommand` | string | `""` | Příkaz, který vypíše připojené desky jako JSON. Prázdný = v projektu s `.vscode/deska.py` se použije `deska.py devices --json`, jinak bloky desky neukazují |
| `micropython.devicesRefreshSeconds` | number | `5` | Jak často obnovovat seznam desek, když je panel vidět (0 = jen ručně tlačítkem ↻) |

Nastavení se načítá při startu. Po jeho změně rozšíření nabídne **Přenačíst okno**.

### Seznam připojených desek

Rozšíření samo desky nehledá – spouští `micropython.devicesCommand` a čte jeho výstup:

```json
{ "version": 1,
  "devices": [
    { "platform": "circuitpython", "port": "COM5", "drive": "F:\\",
      "name": "ELECFREAKS PICO:ED with rp2040",
      "firmware": "Adafruit CircuitPython 9.2.7 on 2025-04-01", "note": null },
    { "platform": "micropython", "port": "COM4", "drive": null,
      "name": "Raspberry Pi Pico / Pico W (MicroPython)", "firmware": null, "note": null }
  ] }
```

- `platform`: `circuitpython`, `micropython`, `bootloader` (disk `RPI-RP2`) nebo `other` (jiné sériové zařízení).
- Příkaz se spouští **jen když je panel vidět** a nikdy dvakrát najednou.
- Příkaz **nesmí otevírat sériové porty** (jinak by kolidoval s REPL nebo Serial Monitorem). `deska.py devices --json` je neotevírá.

---

## 🛠️ Instalace

### Pro studenty (ze startovacího projektu)

1. Otevřete startovací projekt ve VS Code.
2. Dvakrát klikněte na **`setup.bat`** (Linux, macOS: `./setup.sh`).
3. Hotovo — nainstaluje se Python a knihovny, tento panel i doporučená rozšíření a nastaví se tlačítka.

### Ruční instalace ze souboru VSIX

```powershell
code --install-extension micropython-panel-0.3.0.vsix
```

### Z Command Palette

1. `Ctrl+Shift+P` → „Extensions: Install from VSIX…“
2. Vyberte soubor `micropython-panel-*.vsix`

---

## 🏗️ Vývoj a build

Podrobný návod na build VSIX balíčku je v souboru [BUILDING_VSIX.md](BUILDING_VSIX.md).

Rychlý start:

```powershell
# Vytvoř VSIX balíček
vsce package

# Zkopíruj ho do startovacího projektu (.vscode/dist/micropython-panel.vsix)
copyToMicroPythonProject.cmd

# Testuj rozšíření (F5 ve VS Code)
# Otevře se nové okno VS Code s načteným rozšířením
```

---

## 📁 Struktura projektu

```
micropython-panel/
├── package.json               # Manifest rozšíření (nastavení, příkazy, panel)
├── src/
│   ├── extension.js           # Vstupní bod — aktivace, detekce projektu, příkazy
│   ├── commands.js            # Registrace dynamických příkazů, terminál
│   ├── devices.js             # Seznam připojených desek (spouští devicesCommand)
│   ├── settings.js            # Načítání nastavení se sanitizací JSON, výchozí tlačítka
│   ├── ui.js                  # Stavový řádek, panel v editoru, postranní panel
│   └── logging.js             # Formátované logování do Output kanálu
├── media/
│   ├── panel.html             # HTML šablona pro webview (s CSP)
│   ├── panel.css              # Stylování (adaptivní na téma VS Code)
│   ├── panel.js               # Klientský skript webview (desky + skupiny tlačítek)
│   └── micropython-icon.svg   # Ikona pro Activity Bar
├── BUILDING_VSIX.md           # Návod na build
└── README.md                  # Tento soubor
```

---

## 📋 Changelog

### 0.3.0 (2026-11-26)

**MicroPython i CircuitPython:**
- 🏷️ Nový zobrazovaný název **MicroPython & CircuitPython Panel** (ID `micropython-panel` a nastavení `micropython.*` zůstávají).
- 🧱 **Bloky MicroPython a CircuitPython** — panel je rychlý přístup k základním akcím, ne kopie CLI. Každý blok ukazuje připojenou desku (port, disk, jméno, firmware) a pár tlačítek; blok bez desky se ztlumí. Dole odkaz na `mpy help` / `cpy help`.
- 🔌 **Připojené desky** — zjišťuje je `micropython.devicesCommand`, jen když je panel vidět (`micropython.devicesRefreshSeconds`, tlačítko ↻, příkaz *Refresh Devices*).
- 🏷️ Nová pole tlačítek: `group` (blok), `platform`, `label` (text v panelu) a `statusBar: false` (jen v panelu). Ve stavovém řádku lze použít ikony VS Code (`$(play)`).
- 🗑️ **Potvrzení nevratných akcí** — pole `confirm` / `confirmButton`: před spuštěním modální dialog VS Code. Využívá ho tlačítko *Smazat desku*.
- 📋 Rychlé menu rozdělené podle platforem.
- 🔁 Po změně nastavení rozšíření nabídne přenačtení okna.
- 🛡️ Webview má bezpečnostní politiku (CSP) a texty vkládá jen jako text.
- 🧹 Panel v editoru i postranní panel sdílejí jeden kód; výchozí tlačítka jsou pro `.vscode/deska.py`, podpora starých skriptů `.ps1` odstraněna.
- 👁️ Ikona panelu a příkazy v paletě jsou vidět jen v projektech pro desku (kontext `micropython.boardProject`). Oprava: v jiné složce panel donekonečna „načítal“ – teď ukáže vysvětlení.

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
