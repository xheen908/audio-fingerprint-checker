const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// File dialog handler
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'flac'] }]
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

// Analysis handler
ipcMain.handle('analyze-audio', async (event, filePath, keys) => {
  try {
    const fileData = fs.readFileSync(filePath);
    let results = {
      audd: null,
      acrcloud: null,
      errors: []
    };

    // Audd.io
    if (keys.audd_api_key) {
      try {
        let form = new FormData();
        form.append('api_token', keys.audd_api_key);
        form.append('return', 'apple_music,spotify');
        form.append('file', fileData, { filename: path.basename(filePath) });
        
        const auddRes = await axios.post('https://api.audd.io/', form, {
          headers: form.getHeaders()
        });
        results.audd = auddRes.data;
      } catch (err) {
        results.errors.push(`Audd.io Error: ${err.message}`);
      }
    }

    // ACRCloud
    if (keys.acr_host && keys.acr_access_key && keys.acr_secret_key) {
      try {
        const http_method = "POST";
        const http_uri = "/v1/identify";
        const data_type = "audio";
        const signature_version = "1";
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        const string_to_sign = [http_method, http_uri, keys.acr_access_key, data_type, signature_version, timestamp].join('\n');
        const sign = crypto.createHmac('sha1', keys.acr_secret_key)
                           .update(string_to_sign)
                           .digest('base64');
        
        let acrForm = new FormData();
        acrForm.append('access_key', keys.acr_access_key);
        acrForm.append('sample_bytes', fileData.length.toString());
        acrForm.append('timestamp', timestamp);
        acrForm.append('signature', sign);
        acrForm.append('data_type', data_type);
        acrForm.append('signature_version', signature_version);
        acrForm.append('sample', fileData, { filename: path.basename(filePath) });

        const acrUrl = `https://${keys.acr_host}${http_uri}`;
        const acrRes = await axios.post(acrUrl, acrForm, {
          headers: acrForm.getHeaders()
        });
        results.acrcloud = acrRes.data;
      } catch (err) {
        results.errors.push(`ACRCloud Error: ${err.message}`);
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});
