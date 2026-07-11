from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp # KITA IMPORT LANGSUNG, GAK PAKE SUBPROCESS!

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/stream-audio")
def stream_audio(query: str):
    # Settingan rahasia yt-dlp biar narik audio kualitas dewa tanpa download videonya
    ydl_opts = {
        'format': 'bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'extract_flat': False
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Cari 1 lagu teratas berdasarkan judul + artis
            info = ydl.extract_info(f"ytsearch1:{query} official audio", download=False)
            
            if 'entries' in info and len(info['entries']) > 0:
                audio_url = info['entries'][0].get('url')
                if audio_url:
                    return {"stream_url": audio_url}
                    
        raise HTTPException(status_code=404, detail="Lagu ga ketemu Lek")
    
    except Exception as e:
        print(f"Error yt-dlp: {e}") # Bakal kecetak di terminal Uvicorn lu
        raise HTTPException(status_code=500, detail=str(e))