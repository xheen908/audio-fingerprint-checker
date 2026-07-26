import streamlit as st
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

st.set_page_config(page_title="Audio Fingerprint Checker (PoC)", page_icon="🎵")

st.title("Audio Fingerprint Checker (PoC)")
st.write("Lade eine Audio-Datei hoch, um sie auf urheberrechtlich geschütztes Material über die Audd.io API zu prüfen.")

# API Key input (default to env variable if present)
col1, col2 = st.columns([3, 1])
with col1:
    api_key = st.text_input("Audd.io API Key", value=os.getenv("AUDD_API_KEY", ""), type="password")
with col2:
    st.write("") # spacing
    st.write("") # spacing
    if st.button("Key Speichern"):
        if api_key:
            with open(".env", "w") as f:
                f.write(f"AUDD_API_KEY={api_key}\n")
            st.success("Gespeichert!")
            os.environ["AUDD_API_KEY"] = api_key
        else:
            st.warning("Bitte erst einen Key eingeben.")

uploaded_file = st.file_uploader("Wähle eine Audio-Datei", type=['mp3', 'wav', 'm4a', 'flac'])

if uploaded_file is not None:
    st.audio(uploaded_file, format='audio/mp3')
    
    if st.button("Analysieren"):
        if not api_key:
            st.error("Bitte gib einen API Key ein.")
        else:
            with st.spinner("Analysiere Audio..."):
                try:
                    data = {
                        'api_token': api_key,
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
                            
                            col1, col2 = st.columns(2)
                            with col1:
                                st.write(f"**Titel:** {song_info.get('title')}")
                                st.write(f"**Künstler:** {song_info.get('artist')}")
                                st.write(f"**Album:** {song_info.get('album')}")
                                st.write(f"**Release Date:** {song_info.get('release_date')}")
                            
                            with col2:
                                if 'spotify' in song_info and song_info['spotify']:
                                    if 'album' in song_info['spotify'] and song_info['spotify']['album'].get('images'):
                                        st.image(song_info['spotify']['album']['images'][0]['url'], width=200)
                        else:
                            st.info("Kein Song erkannt. Das Audio scheint (laut Audd.io) frei von bekannten kommerziellen Tracks zu sein.")
                    else:
                        st.error(f"API Fehler: {result.get('error', {}).get('error_message', 'Unbekannter Fehler')}")
                        
                except Exception as e:
                    st.error(f"Ein Fehler ist aufgetreten: {str(e)}")
