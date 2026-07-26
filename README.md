# Audd4live

Ein Audio-Tool für Ableton (und andere DAWs), mit dem man überprüfen kann, ob in einem Mix urheberrechtlich geschütztes Material (z.B. Samples) verwendet wurde, bevor man den Track veröffentlicht. So können Urheberrechts-Strikes vermieden werden.

## Phase 1: Proof of Concept (Python Web-App)

Aktuell befindet sich das Projekt in der Proof-of-Concept-Phase. Es gibt eine kleine Web-App (gebaut mit Streamlit), in der du eine Audiodatei (.mp3, .wav) hochladen kannst, welche dann gegen die [Audd.io API](https://audd.io/) abgeglichen wird.

### Voraussetzungen
1. Du benötigst [Python 3](https://www.python.org/downloads/) installiert auf deinem Rechner.
2. Du benötigst einen API-Key von [Audd.io](https://audd.io/). (Den Key kannst du direkt in der Web-App eingeben oder in einer `.env` Datei hinterlegen).

### Installation & Start (Ohne Docker)

1. Klicke dich in das Verzeichnis des Projekts und wechsle in den `poc`-Ordner:
   ```bash
   cd poc
   ```

2. Erstelle ein Python Virtual-Environment und aktiviere es:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Installiere die benötigten Abhängigkeiten:
   ```bash
   pip install -r requirements.txt
   ```

4. Starte die App:
   ```bash
   streamlit run app.py
   ```

Die Anwendung öffnet sich nun automatisch im Browser unter [http://localhost:8501](http://localhost:8501).

### Installation & Start (Mit Docker - Empfohlen)

Wenn du Docker installiert hast, kannst du die App ganz einfach ohne lokale Python-Umgebung starten:

1. Stelle sicher, dass du dich im Hauptverzeichnis des Projekts befindest (`/Audd4live`).
2. Führe folgenden Befehl aus:
   ```bash
   docker compose up --build
   ```

Die App ist nun ebenfalls unter [http://localhost:8501](http://localhost:8501) erreichbar. Wenn du den Container im Hintergrund laufen lassen möchtest, hänge einfach ein `-d` an den Befehl an (`docker compose up -d --build`).

### Bedienung

1. Gib deinen Audd.io API-Key in das obere Passwortfeld ein.
2. Lade deine fertige Audio-Datei (z.B. den Master aus Ableton) per Drag & Drop in das Feld.
3. Klicke auf **Analysieren**.
4. Das Tool zeigt dir umgehend an, ob ein Song erkannt wurde (inklusive Titel, Künstler und Cover-Art).

---
*Die langfristige Vision ist es, dies direkt als C++ VST3 / AU Audio-Plugin umzusetzen, das man sich einfach auf den Master-Channel in der DAW ziehen kann.*
