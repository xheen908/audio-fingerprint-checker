import streamlit as st
import requests
import os
import time
import hmac
import hashlib
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

st.set_page_config(page_title="Audio Fingerprint Checker (PoC)", page_icon="🎵")

st.title("Audio Fingerprint Checker (PoC)")
st.write("Lade eine Audio-Datei hoch, um sie auf urheberrechtlich geschütztes Material über die Audd.io API zu prüfen.")

# API Keys input (default to env variables if present)
st.subheader("API Konfiguration")
col1, col2 = st.columns([3, 1])
with col1:
    audd_api_key = st.text_input("Audd.io API Key", value=os.getenv("AUDD_API_KEY", ""), type="password")
    acr_host = st.text_input("ACRCloud Host", value=os.getenv("ACR_HOST", "identify-eu-west-1.acrcloud.com"))
    acr_access_key = st.text_input("ACRCloud Access Key", value=os.getenv("ACR_ACCESS_KEY", ""), type="password")
    acr_secret_key = st.text_input("ACRCloud Secret Key", value=os.getenv("ACR_SECRET_KEY", ""), type="password")
with col2:
    st.write("") # spacing
    st.write("") # spacing
    if st.button("Keys Speichern"):
        with open(".env", "w") as f:
            if audd_api_key: f.write(f"AUDD_API_KEY={audd_api_key}\n")
            if acr_host: f.write(f"ACR_HOST={acr_host}\n")
            if acr_access_key: f.write(f"ACR_ACCESS_KEY={acr_access_key}\n")
            if acr_secret_key: f.write(f"ACR_SECRET_KEY={acr_secret_key}\n")
        
        os.environ["AUDD_API_KEY"] = audd_api_key
        os.environ["ACR_HOST"] = acr_host
        os.environ["ACR_ACCESS_KEY"] = acr_access_key
        os.environ["ACR_SECRET_KEY"] = acr_secret_key
        st.success("Gespeichert!")

uploaded_file = st.file_uploader("Wähle eine Audio-Datei", type=['mp3', 'wav', 'm4a', 'flac'])

if uploaded_file is not None:
    st.audio(uploaded_file, format='audio/mp3')
    
    if st.button("Analysieren"):
        if not audd_api_key and not acr_access_key:
            st.error("Bitte gib mindestens einen API Key ein (Audd.io oder ACRCloud).")
        else:
            # We use tabs to show results separately
            tab1, tab2 = st.tabs(["Audd.io Ergebnisse", "ACRCloud Ergebnisse"])
            
            with tab1:
                if not audd_api_key:
                    st.info("Audd.io übersprungen (kein API-Key).")
                else:
                    with st.spinner("Analysiere Audio mit Audd.io..."):
                        try:
                            data = {
                                'api_token': audd_api_key,
                                'return': 'apple_music,spotify',
                            }
                            files = {
                                'file': uploaded_file.getvalue()
                            }
                            
                            response = requests.post('https://api.audd.io/', data=data, files=files)
                            result = response.json()
                            
                            if result.get('status') == 'success':
                                if result.get('result'):
                                    song_info = result['result']
                                    st.success(f"Song erkannt!")
                                    
                                    col_a, col_b = st.columns(2)
                                    with col_a:
                                        st.write(f"**Titel:** {song_info.get('title')}")
                                        st.write(f"**Künstler:** {song_info.get('artist')}")
                                        st.write(f"**Album:** {song_info.get('album')}")
                                        st.write(f"**Release Date:** {song_info.get('release_date')}")
                                    
                                    with col_b:
                                        if 'spotify' in song_info and song_info['spotify']:
                                            if 'album' in song_info['spotify'] and song_info['spotify']['album'].get('images'):
                                                st.image(song_info['spotify']['album']['images'][0]['url'], width=200)
                                else:
                                    st.info("Kein Song erkannt. Das Audio scheint frei von bekannten kommerziellen Tracks zu sein.")
                            else:
                                st.error(f"API Fehler: {result.get('error', {}).get('error_message', 'Unbekannter Fehler')}")
                                
                        except Exception as e:
                            st.error(f"Ein Fehler ist aufgetreten: {str(e)}")

            with tab2:
                if not acr_host or not acr_access_key or not acr_secret_key:
                    st.info("ACRCloud übersprungen (fehlende Konfiguration).")
                else:
                    with st.spinner("Analysiere Audio mit ACRCloud..."):
                        try:
                            http_method = "POST"
                            http_uri = "/v1/identify"
                            data_type = "audio"
                            signature_version = "1"
                            timestamp = str(int(time.time()))
                            
                            string_to_sign = '\n'.join([http_method, http_uri, acr_access_key, data_type, signature_version, timestamp])
                            sign = base64.b64encode(hmac.new(acr_secret_key.encode('ascii'), string_to_sign.encode('ascii'), digestmod=hashlib.sha1).digest()).decode('ascii')
                            
                            sample_bytes = len(uploaded_file.getvalue())
                            
                            data = {
                                'access_key': acr_access_key,
                                'sample_bytes': sample_bytes,
                                'timestamp': timestamp,
                                'signature': sign,
                                'data_type': data_type,
                                "signature_version": signature_version
                            }
                            
                            files = {
                                'sample': uploaded_file.getvalue()
                            }
                            
                            requrl = f"https://{acr_host}{http_uri}"
                            response = requests.post(requrl, data=data, files=files)
                            result = response.json()
                            
                            if result.get('status', {}).get('msg') == 'Success':
                                metadata = result.get('metadata', {})
                                music = metadata.get('music', [])
                                if music:
                                    song_info = music[0]
                                    st.success(f"Song erkannt! (ACRCloud)")
                                    
                                    col_c, col_d = st.columns(2)
                                    with col_c:
                                        st.write(f"**Titel:** {song_info.get('title')}")
                                        st.write(f"**Künstler:** {', '.join([a.get('name', '') for a in song_info.get('artists', [])])}")
                                        if 'album' in song_info:
                                            st.write(f"**Album:** {song_info.get('album', {}).get('name')}")
                                        if 'release_date' in song_info:
                                            st.write(f"**Release Date:** {song_info.get('release_date')}")
                                        if 'label' in song_info:
                                            st.write(f"**Label:** {song_info.get('label')}")
                                        if 'genres' in song_info:
                                            st.write(f"**Genres:** {', '.join([g.get('name', '') for g in song_info.get('genres', [])])}")
                                            
                                    with col_d:
                                        st.write(f"**Match Score:** {song_info.get('score', 'N/A')}%")
                                        if 'play_offset_ms' in song_info:
                                            st.write(f"**Erkannt bei:** {int(song_info.get('play_offset_ms') / 1000)}s")
                                        if 'duration_ms' in song_info:
                                            st.write(f"**Song Länge:** {int(song_info.get('duration_ms') / 1000)}s")
                                            
                                        # External metadata (Spotify, Youtube, etc)
                                        ext_meta = song_info.get('external_metadata', {})
                                        if ext_meta:
                                            st.write("**Externe Links:**")
                                            if 'spotify' in ext_meta:
                                                spotify_id = ext_meta['spotify'].get('track', {}).get('id')
                                                if spotify_id:
                                                    st.markdown(f"- [Spotify Link](https://open.spotify.com/track/{spotify_id})")
                                            if 'youtube' in ext_meta:
                                                yt_id = ext_meta['youtube'].get('vid')
                                                if yt_id:
                                                    st.markdown(f"- [YouTube Link](https://www.youtube.com/watch?v={yt_id})")
                                else:
                                    st.info("Kein Song in den Metadaten gefunden.")
                            elif result.get('status', {}).get('code') == 1001:
                                st.info("Kein Song erkannt. Das Audio scheint frei von bekannten kommerziellen Tracks zu sein.")
                            else:
                                st.error(f"API Fehler: {result.get('status', {}).get('msg', 'Unbekannter Fehler')}")
                        except Exception as e:
                            st.error(f"Ein Fehler ist aufgetreten: {str(e)}")
