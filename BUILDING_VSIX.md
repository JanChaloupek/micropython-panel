# 🛠️ Jak vytvořit VSIX balíček pro toto rozšíření

Tento dokument popisuje:

1. **Jak spustit build, pokud už je vše nainstalováno**
2. **Jak nainstalovat všechny potřebné nástroje na čistém Windows**
3. **Jak používat přiložené build skripty**
4. **Jak ověřit instalaci**
5. **Jak řešit nejčastější problémy**

---

# 1. 🚀 Rychlý start (pokud už je vše nainstalováno)

Pokud máš nainstalováno:
- **Node.js**
- **npm**
- balíček `vsce`  
- všechny závislosti projektu 

…pak můžeš použít jeden ze tří skriptů:

---

 ## 1.1 Vytvoření VSIX balíčku
 
Použij skript: `build-vsix.cmd`

Obsah:
```cmd
vsce package
 ```

Výsledkem bude soubor: `micropython-panel-<verze>.vsix`

## 1.2 Nakopírování posledního buildu do MicroPython projektu
Použij skript: `copyToMicroPythonProject.cmd`

Ten:
- najde poslední vytvořený .vsix
- zkopíruje ho do MicroPython projektu (typicky do `.vscode/dist/` nebo kam potřebuješ)

## 1.3 Instalace závislostí v MicroPython projektu

V MicroPython projektu spusť: 
```powershell
.vscode/setup.bat
```

Ten spustí: 
```powershell
.vscode/setup.ps1
```

A ten:
- nainstaluje potřebné nástroje
- nainstaluje rozšíření
- připraví prostředí pro studenty


# 2. 🧰 Instalace potřebného software (čistý Windows)

Tato část popisuje kompletní instalaci od nuly.

## 2.1 Nainstaluj Node.js (LTS)

Stáhni z oficiální stránky: 
https://nodejs.org/

Doporučená verze: LTS (Long Term Support)  
Instalátor automaticky přidá node a npm do PATH.

Ověření:
```powershell
node -v
npm -v
```

## 2.2 Nainstaluj VSCE (nástroj pro tvorbu VSIX)

Instalace:
```powershell
npm install -g @vscode/vsce
```

Ověření: 
```powershell
vsce --version`
```

## 2.3 (Volitelné) Nainstaluj Yarn

Některé projekty používají Yarn, ale není nutný.

Instalace: 
```powershell
npm install -g yarn
```

## 2.4 Nainstaluj závislosti projektu

V kořenovém adresáři rozšíření: `npm install`

To nainstaluje:
- knihovny pro běh rozšíření
- knihovny pro build
- typové definice
- dev nástroje

# 3. 📦 Vytvoření VSIX balíčku (ručně)

Po instalaci všeho potřebného:

## Varianta A — pomocí npm skriptu

```powershell
npm run package
```

## Varianta B — přímo pomocí VSCE

```powershell
vsce package
```

# 4. 🧪 Ověření VSIX

Nainstaluj VSIX do VS Code:
```powershell
code --install-extension micropython-panel-<verze>.vsix
```

Ověř:
- že se rozšíření aktivuje
- že se zobrazí panel
- že se zobrazí tlačítka
- že se neobjeví chyby v „Developer Tools“

# 5. 🔧 Nejčastější problémy a jejich řešení

## ❗ „vsce: command not found“

Není nainstalovaný VSCE:
```powershell
npm install -g @vscode/vsce
```

## ❗ „Cannot find module …“ při `npm run package`

Chybí node_modules:
```powershell
npm install
```

## ❗ VSIX obsahuje staré soubory

Smaž build složky:
```powershell
rm -r .\out
rm -r .\dist
```

A znovu:
```powershell
vsce package
```

## ❗ VS Code načítá starou verzi rozšíření

Smaž cache:
```
%APPDATA%\Code\CachedExtensionVSIXs
```

```
%APPDATA%\Code\User\workspaceStorage
```

## ❗ „Unexpected token …“ při aktivaci

Obvykle způsobeno:
- poškozeným settings.json
- starou cache
- chybějící sanitizací (řešeno v nové verzi settings.js)

# 6. 📚 Doporučené nástroje pro vývoj

Pro pohodlný a stabilní vývoj rozšíření doporučujeme mít nainstalované následující nástroje:

---

## 6.1 Visual Studio Code
Primární editor, ve kterém se rozšíření vyvíjí a testuje.

Stáhnout:
https://code.visualstudio.com/

---

## 6.2 Node.js (LTS)
Nutné pro běh nástrojů, build skriptů a instalaci závislostí.

Stáhnout:
https://nodejs.org/

Po instalaci ověř:

```powershell
node -v
npm -v
```

## 6.3 VSCE (balíčkovací nástroj pro VSIX)

Oficiální nástroj pro vytváření VSIX balíčků.

Instalace:
```powershell
npm install -g @vscode/vsce
```

Ověření:
```powershell
vsce --version
```

## 6.4 Git

Pro správu verzí a synchronizaci projektu mezi počítači.

Stáhnout:
https://git-scm.com/

## 6.5 PowerShell 7 (doporučeno)

Není povinné, ale výrazně zlepšuje kompatibilitu skriptů a automatizace.

Stáhnout:
https://github.com/PowerShell/PowerShell

Ověření:
```powershell
pwsh --version
```

## 6.6 Doporučené VS Code rozšíření pro vývoj
- **ESLint** – kontrola kvality kódu
- **Prettier** – formátování
- **VS Code Extension Development** – debugging rozšíření
- **GitLens** – práce s Gitem

## 6.7 Volitelné nástroje
- **Yarn** – alternativní správce balíčků
- **nvm-windows** – správa verzí Node.js
- **7zip / WinRAR** – práce s archivy

Tato sada nástrojů pokrývá vše potřebné pro vývoj, build, testování i distribuci VSIX balíčků.

# 7. 🧹 Úklid a čistý rebuild

Pokud se build chová divně:
```powershell
rm -r node_modules
rm package-lock.json
npm install
vsce package
```

# 8. 🏁 Hotovo

Tento návod ti umožní:
- nainstalovat vše potřebné na čistý Windows
- vytvořit VSIX kdykoli
- řešit nejčastější problémy
- pracovat konzistentně na více počítačích
