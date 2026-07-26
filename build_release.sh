#!/bin/bash

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starte Audio Fingerprint Checker Release Build ===${NC}"

# 1. In den VST Ordner wechseln
cd vst-plugin || exit

# 2. Release-Build mit CMake starten
echo -e "${BLUE}[1/3] Kompiliere VST3 Plugin (Release)...${NC}"
cmake --build build --config Release

# 3. Release-Ordner vorbereiten
echo -e "${BLUE}[2/3] Bereite Release-Ordner vor...${NC}"
mkdir -p ../releases
# Wechsel in den Artefakt-Ordner, in dem AU und VST3 liegen
cd build/AudioFingerprintChecker_artefacts/ || exit

# 4. Zippen (WICHTIG für Mac VSTs & AUs!)
echo -e "${BLUE}[3/3] Zippe VST3 & AU Plugin für GitHub...${NC}"
VERSION_VST=$(grep "VERSION " ../../../vst-plugin/CMakeLists.txt | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
ZIP_NAME="AudioFingerprintChecker_Mac_v${VERSION_VST}.zip"

# Lösche altes Zip falls vorhanden
rm -f "../../../releases/${ZIP_NAME}"
# Zippe den VST3 und den AU Ordner (rekursiv)
zip -r "../../../releases/${ZIP_NAME}" "VST3/Audio Fingerprint Checker.vst3" "AU/Audio Fingerprint Checker.component"

echo -e "${GREEN}=== VST FERTIG! ===${NC}"

# 5. Desktop App Build
echo -e "${BLUE}[4/4] Kompiliere Desktop App (Electron DMG)...${NC}"
cd ../../../desktop-app || exit
npm run build
VERSION_APP=$(node -p "require('./package.json').version")
DMG_NAME="AudioFingerprintChecker_Mac_App_v${VERSION_APP}.dmg"

# Kopiere und benenne um
cp "dist-electron/Audio Fingerprint Checker-${VERSION_APP}-arm64.dmg" "../releases/${DMG_NAME}"

echo -e "${GREEN}=== ALLES FERTIG! ===${NC}"
echo -e "Deine fertigen Release-Dateien liegen hier:"
echo -e "${GREEN}Audd4live/releases/${ZIP_NAME} (VST3 & AU)${NC}"
echo -e "${GREEN}Audd4live/releases/${DMG_NAME} (Standalone App)${NC}"
echo -e "Lade beide Dateien als 'Assets' in deinem GitHub Release hoch."
