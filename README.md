# Audio Fingerprint Checker

Ein professionelles Audio-Tool für DAWs (Ableton, Logic, FL Studio etc.) und als Standalone Desktop-App, mit dem Musikproduzenten live überprüfen können, ob in ihrem Mix urheberrechtlich geschütztes Material (z.B. Samples) verwendet wurde. So können automatische Urheberrechts-Strikes (Copyright Claims) auf Plattformen wie YouTube, SoundCloud oder Spotify proaktiv vermieden werden.

## 🚀 Übersicht

Das Projekt liefert **zwei** Anwendungen, die nahtlos miteinander verknüpft sind:

1. **VST3 / AU Plugin:** Wird direkt auf die Master-Spur der DAW gelegt. Analysiert *live* beim Abspielen das laufende Audiosignal und prüft alle 15 Sekunden das Material.
2. **Desktop App (macOS):** Eine bequeme Drag & Drop App, um fertige `.mp3` oder `.wav` Exporte manuell auf Copyright-Verstöße zu testen.

Beide Versionen unterstützen **Audd.io** und **ACRCloud** parallel, um maximale Erkennungsraten zu garantieren.

---

## 🛠 Features

- **Live-Analyse (VST3/AU):** Nimmt im Hintergrund 6-sekündige Audio-Puffer der DAW auf und verarbeitet sie asynchron ohne die Audio-Engine zu blockieren (Zero-Dropouts).
- **Zwei Erkennungs-Engines:** Fragt parallel `Audd.io` und `ACRCloud` ab. 
- **Nativer C++ Kryptographie-Core:** Implementiert den strengen HMAC-SHA1 Algorithmus für ACRCloud nativ in C++, wodurch externe, fehleranfällige Abhängigkeiten (wie OpenSSL) entfallen.
- **Spectrum Analyzer:** Schicker Live-Frequenz-Analyzer im User Interface.
- **React Frontend:** Das UI basiert auf React + Vite und läuft sowohl in einem unsichtbaren Chromium-Fenster (Electron) für den Desktop, als auch nativ im JUCE WebBrowser-Component für das VST-Plugin.

---

## 📥 Installation

Die fertig kompilierten Releases findest du im Ordner `releases/` oder direkt hier auf GitHub unter den **Assets** (ab Version `v1.2.0`).

### 1. Das VST / AU Plugin
Lade dir die Datei `AudioFingerprintChecker_Mac_v1.2.x.zip` herunter und entpacke sie.
Verschiebe die Dateien in die jeweiligen Plugin-Ordner deines Macs:
- **AU:** `~/Library/Audio/Plug-Ins/Components`
- **VST3:** `~/Library/Audio/Plug-Ins/VST3`

Starte deine DAW (Ableton, Logic) neu. Das Plugin taucht nun in deiner Liste auf!

### 2. Die Desktop App
Lade dir die Datei `AudioFingerprintChecker_Mac_App_v1.2.x.dmg` herunter, öffne sie per Doppelklick und ziehe die App einfach in deinen `Programme` / `Applications` Ordner. 

---

## ⚙️ Einrichtung (API Keys)

Um Fingerabdrücke abzugleichen, benötigt das Tool Zugriff auf Erkennungs-APIs.
Du kannst entweder **Audd.io**, **ACRCloud** oder **beide** parallel nutzen.

1. Öffne das Plugin in deiner DAW oder starte die Desktop-App.
2. Klicke oben rechts auf das kleine **Zahnrad-Icon (⚙️)**.
3. Trage deine Keys ein:
   - **Audd.io:** Hier reicht der API-Key.
   - **ACRCloud:** Hier benötigst du den Host (meist `identify-eu-west-1.acrcloud.com`), den Access Key und den Secret Key. 
4. Klicke auf **Keys speichern**. Sie werden sicher lokal gespeichert und automatisch bei jedem Neustart geladen.

---

## 💻 Wie man es benutzt

### Im VST Modus (Live)
1. Ziehe das Plugin auf den Master-Kanal deiner DAW.
2. Drücke im Plugin auf **"▶ Live Analyse STARTEN"**.
3. Drücke in deiner DAW auf Play.
4. Das Plugin zeichnet das Audio im Hintergrund auf und zeigt dir im Live-Spektrum an, dass es "zuhört".
5. Nach ca. 6 Sekunden Aufzeichnung wird das Signal im Hintergrund verschlüsselt und an die APIs gesendet. 
6. Sobald ein Ergebnis da ist, erscheint es im entsprechenden Tab (Audd.io / ACRCloud) mitsamt Cover, Künstler und Match-Score.

### In der Desktop App
1. Starte die App.
2. Klicke auf **"Datei Auswählen"** und suche dir deine fertige Master `.wav` oder `.mp3` heraus.
3. Klicke auf **"Analysiere..."**.
4. Die App schickt den Song an die API-Dienste und präsentiert dir die Ergebnisse in der UI.

---

## 👨‍💻 Für Entwickler: Kompilieren / Build-Prozess

Das Projekt nutzt ein einheitliches Build-Skript, das automatisch das JUCE C++ VST baut, die React-Vite App kompiliert und sie via `electron-builder` in ein DMG packt.

**Voraussetzungen (Mac):**
- Xcode Command Line Tools
- CMake
- Node.js & npm

**Build ausführen:**
```bash
# Im Stammverzeichnis ausführen:
./build_release.sh
```

Das Skript:
1. Kompiliert das `vst-plugin` im Release-Modus via CMake (baut VST3, AU und Standalone).
2. Zippt das Plugin automatisch.
3. Baut das Frontend (`desktop-app`) via Vite.
4. Verpackt das Frontend mit Electron in ein fertiges macOS `.dmg`.
5. Extrahiert die korrekten Versionsnummern und legt alle Dateien sauber formatiert im `releases/` Ordner ab.

*(Hinweis: Für den Proof-of-Concept der ersten Entwurfsphase existiert noch ein Python-Skript im Ordner `poc/`. Dieses wird für das eigentliche VST nicht mehr benötigt).*
