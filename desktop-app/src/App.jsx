import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [auddKey, setAuddKey] = useState(localStorage.getItem('auddKey') || '');
  const [acrHost, setAcrHost] = useState(localStorage.getItem('acrHost') || 'identify-eu-west-1.acrcloud.com');
  const [acrAccessKey, setAcrAccessKey] = useState(localStorage.getItem('acrAccessKey') || '');
  const [acrSecretKey, setAcrSecretKey] = useState(localStorage.getItem('acrSecretKey') || '');
  
  const [filePath, setFilePath] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('audd'); // audd | acr

  const handleSaveKeys = () => {
    localStorage.setItem('auddKey', auddKey);
    localStorage.setItem('acrHost', acrHost);
    localStorage.setItem('acrAccessKey', acrAccessKey);
    localStorage.setItem('acrSecretKey', acrSecretKey);
    alert('Keys erfolgreich gespeichert!');
  };

  const handleSelectFile = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectFile();
      if (path) {
        setFilePath(path);
        setResults(null);
      }
    } else {
      alert("Fehler: Electron API nicht verfügbar (läuft nicht in Electron?).");
    }
  };

  const handleAnalyze = async () => {
    if (!filePath) {
      alert('Bitte wähle zuerst eine Audio-Datei aus.');
      return;
    }
    if (!auddKey && !acrAccessKey) {
      alert('Bitte gib mindestens einen API-Key ein (Audd.io oder ACRCloud).');
      return;
    }

    setIsAnalyzing(true);
    setResults(null);
    try {
      const keys = {
        audd_api_key: auddKey,
        acr_host: acrHost,
        acr_access_key: acrAccessKey,
        acr_secret_key: acrSecretKey,
      };
      
      const res = await window.electronAPI.analyzeAudio(filePath, keys);
      setResults(res);
    } catch (err) {
      alert(`Fehler bei der Analyse: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container">
      <h1>Audio Fingerprint Checker</h1>
      <p>Lade eine Audio-Datei hoch, um sie auf urheberrechtlich geschütztes Material zu prüfen.</p>
      
      <div className="card">
        <h2>API Konfiguration</h2>
        <div className="grid">
          <div>
            <label>Audd.io API Key</label>
            <input type="password" value={auddKey} onChange={e => setAuddKey(e.target.value)} />
          </div>
          <div>
            <label>ACRCloud Host</label>
            <input type="text" value={acrHost} onChange={e => setAcrHost(e.target.value)} />
          </div>
          <div>
            <label>ACRCloud Access Key</label>
            <input type="password" value={acrAccessKey} onChange={e => setAcrAccessKey(e.target.value)} />
          </div>
          <div>
            <label>ACRCloud Secret Key</label>
            <input type="password" value={acrSecretKey} onChange={e => setAcrSecretKey(e.target.value)} />
          </div>
        </div>
        <button className="primary-btn mt-2" onClick={handleSaveKeys}>Keys Speichern</button>
      </div>

      <div className="card">
        <h2>Datei Analyse</h2>
        <div className="flex-row">
          <button className="secondary-btn" onClick={handleSelectFile}>
            Datei auswählen
          </button>
          {filePath && <span className="file-path">{filePath.split('/').pop()}</span>}
        </div>
        <button 
          className="primary-btn mt-4 full-width" 
          onClick={handleAnalyze} 
          disabled={isAnalyzing || !filePath}
        >
          {isAnalyzing ? 'Analysiere...' : 'Analysieren'}
        </button>
      </div>

      {results && (
        <div className="results">
          <div className="tabs">
            <button className={activeTab === 'audd' ? 'active' : ''} onClick={() => setActiveTab('audd')}>Audd.io Ergebnisse</button>
            <button className={activeTab === 'acr' ? 'active' : ''} onClick={() => setActiveTab('acr')}>ACRCloud Ergebnisse</button>
          </div>
          
          <div className="tab-content">
            {results.errors && results.errors.length > 0 && (
              <div className="error-box">
                {results.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            {activeTab === 'audd' && (
              <div>
                {!auddKey ? (
                  <p>Audd.io übersprungen (kein API-Key).</p>
                ) : results.audd?.status === 'success' && results.audd?.result ? (
                  <div className="song-info">
                    <div className="song-details">
                      <strong>Titel:</strong> <p>{results.audd.result.title}</p>
                      <strong>Künstler:</strong> <p>{results.audd.result.artist}</p>
                      <strong>Album:</strong> <p>{results.audd.result.album}</p>
                      <strong>Release Date:</strong> <p>{results.audd.result.release_date}</p>
                    </div>
                    {results.audd.result.spotify?.album?.images?.[0]?.url && (
                      <img src={results.audd.result.spotify.album.images[0].url} alt="Cover" />
                    )}
                  </div>
                ) : (
                  <p>Kein Song erkannt oder ein Fehler ist aufgetreten.</p>
                )}
              </div>
            )}

            {activeTab === 'acr' && (
              <div>
                {!acrAccessKey ? (
                  <p>ACRCloud übersprungen (fehlende Konfiguration).</p>
                ) : results.acrcloud?.status?.msg === 'Success' && results.acrcloud?.metadata?.music?.length > 0 ? (
                  <div className="song-info">
                    <div className="song-details">
                      <strong>Titel:</strong> <p>{results.acrcloud.metadata.music[0].title}</p>
                      <strong>Künstler:</strong> <p>{results.acrcloud.metadata.music[0].artists?.map(a => a.name).join(', ')}</p>
                      <strong>Album:</strong> <p>{results.acrcloud.metadata.music[0].album?.name}</p>
                      <strong>Label:</strong> <p>{results.acrcloud.metadata.music[0].label}</p>
                      <strong>Genres:</strong> <p>{results.acrcloud.metadata.music[0].genres?.map(g => g.name).join(', ')}</p>
                      <strong>Score:</strong> <p>{results.acrcloud.metadata.music[0].score}%</p>
                    </div>
                  </div>
                ) : (
                  <p>Kein Song erkannt oder ein Fehler ist aufgetreten (ACRCloud).</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
