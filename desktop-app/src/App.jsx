import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [auddKey, setAuddKey] = useState(localStorage.getItem('auddKey') || '');
  const [acrHost, setAcrHost] = useState(localStorage.getItem('acrHost') || 'identify-eu-west-1.acrcloud.com');
  const [acrAccessKey, setAcrAccessKey] = useState(localStorage.getItem('acrAccessKey') || '');
  const [acrSecretKey, setAcrSecretKey] = useState(localStorage.getItem('acrSecretKey') || '');
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // Legacy fallback
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('audd'); // audd | acr
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const canvasRef = useRef(null);
  const spectrumDataRef = useRef(new Array(32).fill(0));

  // For IPC messages coming FROM C++ (e.g. when an analysis result arrives or audio levels)
  useEffect(() => {
    window.updateAudioLevel = (level) => {
      // level is RMS (0.0 to 1.0 roughly)
      setAudioLevel(level);
    };
    
    window.updateSpectrum = (spectrumArray) => {
      if (Array.isArray(spectrumArray)) {
        spectrumDataRef.current = spectrumArray;
      }
    };

    window.onVstResultReceived = (data) => {
      // data should be JSON parsed already if sent correctly, or parse it here
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        setResults(parsed);
      } catch (e) {
        console.error("Failed to parse VST result", e);
      }
    };
    
    // Canvas animation loop
    let animationId;
    const drawSpectrum = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const data = spectrumDataRef.current;
        
        ctx.clearRect(0, 0, width, height);
        
        const barWidth = (width / data.length) - 2;
        let x = 0;
        
        for (let i = 0; i < data.length; i++) {
          // data[i] is expected to be 0.0 - 1.0
          const barHeight = data[i] * height;
          
          // Gradient or solid color
          ctx.fillStyle = data[i] > 0.7 ? '#e74c3c' : (data[i] > 0.4 ? '#f39c12' : '#2ecc71');
          
          // Draw bar from bottom (using fillRect for compatibility with older WebViews)
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          
          x += barWidth + 2;
        }
      }
      animationId = requestAnimationFrame(drawSpectrum);
    };
    
    try {
      drawSpectrum();
    } catch (e) {
      console.error("Canvas drawing failed:", e);
    }
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  const sendJuceCommand = (url) => {
    window.location.href = url;
  };

  // Sync keys to C++ on mount
  useEffect(() => {
    const savedAudd = localStorage.getItem('auddKey') || '';
    const savedAcrA = localStorage.getItem('acrAccessKey') || '';
    const savedAcrS = localStorage.getItem('acrSecretKey') || '';
    const savedAcrH = localStorage.getItem('acrHost') || 'identify-eu-west-1.acrcloud.com';
    // Small delay to allow JUCE WebBrowserComponent to fully initialize
    setTimeout(() => {
        sendJuceCommand(`juce://setApiKeys?audd=${encodeURIComponent(savedAudd)}&acr=${encodeURIComponent(savedAcrA)}&sec=${encodeURIComponent(savedAcrS)}&host=${encodeURIComponent(savedAcrH)}`);
    }, 500);
  }, []);

  const handleSaveKeys = () => {
    localStorage.setItem('auddKey', auddKey);
    localStorage.setItem('acrHost', acrHost);
    localStorage.setItem('acrAccessKey', acrAccessKey);
    localStorage.setItem('acrSecretKey', acrSecretKey);
    alert('Keys erfolgreich gespeichert!');
    
    // Also send updated keys to C++ Backend via URL intercept
    sendJuceCommand(`juce://setApiKeys?audd=${encodeURIComponent(auddKey)}&acr=${encodeURIComponent(acrAccessKey)}&sec=${encodeURIComponent(acrSecretKey)}&host=${encodeURIComponent(acrHost)}`);
  };

  const handleToggleRecording = () => {
    if (!auddKey && !acrAccessKey) {
      alert('Bitte gib mindestens einen API-Key ein (Audd.io oder ACRCloud).');
      return;
    }
    
    const newState = !isRecording;
    setIsRecording(newState);
    
    // Send state and keys combined to ensure C++ definitely has them when starting!
    sendJuceCommand(`juce://setApiKeys?audd=${encodeURIComponent(auddKey)}&acr=${encodeURIComponent(acrAccessKey)}&sec=${encodeURIComponent(acrSecretKey)}&host=${encodeURIComponent(acrHost)}`);
    
    setTimeout(() => {
      sendJuceCommand(`juce://setRecording?state=${newState}`);
    }, 100);
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileSelect = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.selectFile();
      if (filePath) {
        setSelectedFile(filePath);
        setResults(null);
      }
    }
  };

  const handleAnalyzeDesktop = async () => {
    if (!selectedFile || !window.electronAPI) return;
    setIsAnalyzing(true);
    try {
      const data = await window.electronAPI.analyzeAudio(selectedFile, {
        audd_api_key: auddKey,
        acr_host: acrHost,
        acr_access_key: acrAccessKey,
        acr_secret_key: acrSecretKey
      });
      setResults(data);
    } catch (err) {
      alert("Fehler bei der Analyse: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="logo-container">
          <img src="./icon.png" alt="Logo" className="logo-icon-img" />
          <h1>Audio Fingerprint Checker</h1>
        </div>
        <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
          ⚙️
        </button>
      </header>
      
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>API Konfiguration</h2>
              <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>
            
            <div className="api-keys-section">
              <div className="api-group">
                <label>Audd.io API Key</label>
                <input 
                  type="password" 
                  value={auddKey} 
                  onChange={(e) => setAuddKey(e.target.value)} 
                  placeholder="Audd.io Key..."
                />
              </div>

              <div className="api-group acr-group">
                <div className="input-row">
                  <div className="input-col">
                    <label>ACRCloud Host</label>
                    <input 
                      type="text" 
                      value={acrHost} 
                      onChange={(e) => setAcrHost(e.target.value)} 
                      placeholder="identify-eu-west-1.acrcloud.com"
                    />
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-col">
                    <label>ACRCloud Access Key</label>
                    <input 
                      type="password" 
                      value={acrAccessKey} 
                      onChange={(e) => setAcrAccessKey(e.target.value)} 
                      placeholder="Access Key..."
                    />
                  </div>
                  <div className="input-col">
                    <label>ACRCloud Secret Key</label>
                    <input 
                      type="password" 
                      value={acrSecretKey} 
                      onChange={(e) => setAcrSecretKey(e.target.value)} 
                      placeholder="Secret Key..."
                    />
                  </div>
                </div>
              </div>
              <button className="save-btn" onClick={handleSaveKeys}>Keys Speichern</button>
            </div>
          </div>
        </div>
      )}

      {window.electronAPI ? (
        <div className="analyzer-section">
          <h2>Desktop Datei-Analyse</h2>
          <p style={{marginBottom: '20px'}}>
            Wähle eine Audio-Datei (.mp3, .wav, .m4a) von deinem Computer aus, um sie zu identifizieren.
          </p>
          
          <button className="secondary-btn" onClick={handleFileSelect} style={{marginBottom: '10px'}}>
            {selectedFile ? 'Andere Datei wählen' : 'Datei Auswählen'}
          </button>
          
          {selectedFile && (
            <div style={{marginBottom: '20px'}}>
              <span className="file-path">{selectedFile}</span>
            </div>
          )}
          
          <button 
            className="primary-btn full-width" 
            onClick={handleAnalyzeDesktop} 
            disabled={!selectedFile || isAnalyzing}
            style={{ 
              backgroundColor: isAnalyzing ? '#888' : '#007aff',
              padding: '20px', 
              fontSize: '18px', 
              fontWeight: 'bold',
              marginTop: '10px'
            }}
          >
            {isAnalyzing ? 'Analysiere...' : 'Fingerabdruck prüfen'}
          </button>
        </div>
      ) : (
        <div className="analyzer-section">
          <h2>Live Master-Spur Analyse (VST Modus)</h2>
          <p style={{marginBottom: '20px'}}>
            Wenn die Live Analyse aktiv ist, schneidet das Plugin den Master-Ausgang mit und sendet 
            alle 15 Sekunden einen Puffer zur Erkennung an die APIs.
          </p>
          
          <button 
            className={`primary-btn full-width ${isRecording ? 'recording' : ''}`} 
            onClick={handleToggleRecording}
            style={{ 
              backgroundColor: isRecording ? '#e74c3c' : '#2ecc71',
              padding: '20px',
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '10px'
            }}
          >
            {isRecording ? '⏹ Live Analyse STOPPEN' : '▶ Live Analyse STARTEN'}
          </button>

          {/* Audio Spectrum Analyzer */}
          <div style={{ width: '100%', height: '80px', backgroundColor: '#111', borderRadius: '8px', padding: '10px', marginTop: '15px' }}>
            <canvas ref={canvasRef} width={600} height={80} style={{ width: '100%', height: '100%' }} />
          </div>
          
          {/* Legacy Audio Meter Fallback */}
          <div style={{ width: '100%', height: '5px', backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden', marginTop: '5px' }}>
            <div style={{
              width: `${Math.min(100, audioLevel * 200)}%`, 
              height: '100%', 
              backgroundColor: audioLevel > 0.8 ? '#e74c3c' : '#2ecc71',
              transition: 'width 0.05s ease-out'
            }} />
          </div>
          <p style={{textAlign: 'center', fontSize: '10px', marginTop: '5px', color: '#888'}}>
            {audioLevel > 0.001 || spectrumDataRef.current[0] > 0.01 ? "Audio Signal (Spektrum) aktiv" : "Warte auf Signal..."}
          </p>
        </div>
      )}

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
