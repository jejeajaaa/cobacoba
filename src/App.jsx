import { useState, useRef, useEffect } from 'react';

// Kalau lagi di server beneran, dia bakal pake URL Render lu nanti.
// Kalau di laptop lu, dia tetep pake localhost:8000
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function App() {
  const [activeTab, setActiveTab] = useState("search");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState("");
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  
  // STATE BARU: Menampung URL pembajakan dari Python
  const [audioStreamUrl, setAudioStreamUrl] = useState("");
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (currentSong && showLyrics) {
      fetchLyrics(currentSong.artistName, currentSong.trackName);
    } else {
      setLyricsText("");
    }
  }, [currentSong]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=15`);
      const data = await res.json();
      if (data.results) setSearchResults(data.results);
    } catch (err) {
      console.error("Gagal nyari lagu di Apple, Lek!", err);
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI UTAMA: Minta tolong Python buat nyari audio FULL di YouTube
  const playSong = async (song) => {
    setCurrentSong(song);
    setIsPlaying(false);
    setIsLoadingAudio(true);
    setAudioStreamUrl("");
    
    try {
      const queryText = `${song.artistName} ${song.trackName}`;
      // Nembak backend Python FastAPI kita
      const res = await fetch(`${BACKEND_URL}/api/stream-audio?query=${encodeURIComponent(queryText)}`);
      const data = await res.json();
      
      if (data.stream_url) {
        setAudioStreamUrl(data.stream_url);
        setIsPlaying(true);
        setCurrentTime(0);
        // Mainkan setelah element src ke-update
        setTimeout(() => {
          if (audioRef.current) audioRef.current.play();
        }, 100);
      }
    } catch (err) {
      console.error("Gagal ngebajak audio dari backend, Cok!", err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const togglePlay = () => {
    if (!currentSong || isLoadingAudio) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (!currentSong || searchResults.length === 0) return;
    const currentIndex = searchResults.findIndex(s => s.trackId === currentSong.trackId);
    if (currentIndex !== -1 && currentIndex < searchResults.length - 1) {
      playSong(searchResults[currentIndex + 1]);
    }
  };

  const playPrev = () => {
    if (!currentSong || searchResults.length === 0) return;
    const currentIndex = searchResults.findIndex(s => s.trackId === currentSong.trackId);
    if (currentIndex > 0) {
      playSong(searchResults[currentIndex - 1]);
    }
  };

  const fetchLyrics = async (artist, title) => {
    setIsLoadingLyrics(true);
    setLyricsText(""); 
    try {
      const cleanArtist = artist.split(' (')[0];
      const cleanTitle = title.split(' (')[0];
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`);
      const data = await res.json();
      setLyricsText(data.lyrics ? data.lyrics : "Yah, liriknya nggak ketemu di database Lek 😢");
    } catch (err) {
      setLyricsText("Server liriknya lagi ngambek, Cok.");
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const toggleLyrics = () => {
    const newState = !showLyrics;
    setShowLyrics(newState);
    if (newState && currentSong) fetchLyrics(currentSong.artistName, currentSong.trackName);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ backgroundColor: '#000000', color: '#b3b3b3', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* NATIVE AUDIO ENGINE: Sekarang aman pake source YouTube yang ditembak via Python */}
      <audio 
        ref={audioRef} 
        src={audioStreamUrl} 
        onEnded={playNext} 
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 90px)', position: 'relative' }}>
        
        {/* SIDEBAR */}
        <div style={{ width: '250px', backgroundColor: '#000000', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10 }}>
          <h1 style={{ color: '#1db954', fontSize: '24px', fontWeight: '900', margin: '0 0 20px 0', letterSpacing: '-1px' }}>SPOTIFREE</h1>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div onClick={() => setActiveTab("home")} style={{ cursor: 'pointer', color: activeTab === "home" ? '#fff' : '#b3b3b3', fontWeight: 'bold' }}>🏠 Beranda</div>
            <div onClick={() => setActiveTab("search")} style={{ cursor: 'pointer', color: activeTab === "search" ? '#fff' : '#b3b3b3', fontWeight: 'bold' }}>🔍 Cari Lagu</div>
            <div onClick={() => setActiveTab("library")} style={{ cursor: 'pointer', color: activeTab === "library" ? '#fff' : '#b3b3b3', fontWeight: 'bold' }}>📚 Koleksi Kamu</div>
          </nav>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, backgroundColor: '#121212', borderRadius: '8px', margin: '8px 8px 8px 0', padding: '24px', overflowY: 'auto', transition: 'margin-right 0.3s ease', marginRight: showLyrics ? '320px' : '8px' }}>
          <h2 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
            {activeTab === "search" ? "Cari Lagu Kesukaanmu" : "Selamat Malam"}
          </h2>

          {activeTab === "search" && (
            <div>
              <form onSubmit={handleSearch} style={{ marginBottom: '30px' }}>
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                  <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
                  <input type="text" placeholder="Artis atau judul lagu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '15px 20px 15px 45px', width: '100%', borderRadius: '30px', border: 'none', outline: 'none', backgroundColor: '#242424', color: 'white', fontSize: '15px' }} />
                </div>
              </form>

              {loading ? (
                <p style={{ color: '#1db954', fontWeight: 'bold' }}>Mencari di database...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchResults.map((song) => (
                    <div key={song.trackId} onClick={() => playSong(song)} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 15px', backgroundColor: currentSong?.trackId === song.trackId ? '#2a2a2a' : 'transparent', borderRadius: '6px', cursor: 'pointer' }}>
                      <img src={song.artworkUrl100} alt={song.trackName} style={{ width: '45px', height: '45px', borderRadius: '4px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: currentSong?.trackId === song.trackId ? '#1db954' : 'white', fontWeight: 'bold', fontSize: '15px' }}>{song.trackName}</div>
                        <div style={{ color: '#b3b3b3', fontSize: '13px' }}>{song.artistName}</div>
                      </div>
                      <span style={{ color: '#1db954', fontSize: '13px', fontWeight: 'bold' }}>
                        {currentSong?.trackId === song.trackId && isLoadingAudio ? "⚡ Membajak..." : "▶ Putar Full"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "home" && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px' }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ backgroundColor: '#181818', padding: '16px', borderRadius: '8px', cursor: 'pointer', transition: '0.3s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#282828'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#181818'}>
                  <div style={{ width: '100%', aspectRatio: '1', backgroundColor: '#333', borderRadius: '4px', marginBottom: '16px' }}></div>
                  <h3 style={{ color: 'white', fontSize: '16px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Mix Mabar {i + 1}</h3>
                  <p style={{ fontSize: '14px', margin: 0 }}>Lagu full tanpa batas menemani hari.</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANEL LIRIK */}
        <div style={{ position: 'absolute', top: '8px', right: showLyrics ? '8px' : '-320px', width: '300px', bottom: '8px', backgroundColor: '#121212', borderRadius: '8px', padding: '24px', transition: 'right 0.3s ease', overflowY: 'auto', boxShadow: '-5px 0 15px rgba(0,0,0,0.5)', zIndex: 5 }}>
          <h3 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0' }}>Lirik Lagu</h3>
          {currentSong && <p style={{ color: '#1db954', fontSize: '14px', margin: '0 0 20px 0', fontWeight: 'bold' }}>{currentSong.trackName}</p>}
          {isLoadingLyrics ? (
             <p style={{ color: '#b3b3b3', fontSize: '14px' }}>Mencari contekan lirik...</p>
          ) : (
             <p style={{ color: '#e0e0e0', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{lyricsText || "Pilih lagu dulu Lek buat nampilin lirik."}</p>
          )}
        </div>
      </div>

      {/* BOTTOM PLAYER */}
      <div style={{ height: '90px', backgroundColor: '#000000', borderTop: '1px solid #282828', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '30%' }}>
          {currentSong ? (
            <>
              <img src={currentSong.artworkUrl100} alt="Cover" style={{ width: '56px', height: '56px', borderRadius: '4px' }} />
              <div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{currentSong.trackName}</div>
                <div style={{ fontSize: '12px', color: '#b3b3b3' }}>{currentSong.artistName}</div>
              </div>
            </>
          ) : (
            <div><div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>Belum Ada Lagu</div></div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '8px' }}>
            <button onClick={playPrev} style={{ background: 'none', border: 'none', color: '#b3b3b3', fontSize: '20px', cursor: 'pointer' }}>⏮</button>
            <button onClick={togglePlay} style={{ background: 'white', color: 'black', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={isLoadingAudio}>
              {isLoadingAudio ? "⏳" : isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={playNext} style={{ background: 'none', border: 'none', color: '#b3b3b3', fontSize: '20px', cursor: 'pointer' }}>⏭</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '600px' }}>
            <span style={{ fontSize: '11px', width: '35px', textAlign: 'right' }}>{formatTime(currentTime)}</span>
            <div style={{ flex: 1, height: '4px', backgroundColor: '#4d4d4d', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#1db954', transition: 'width 1s linear' }}></div>
            </div>
            <span style={{ fontSize: '11px', width: '35px', textAlign: 'left' }}>{formatTime(duration)}</span>
          </div>
        </div>

        <div style={{ width: '30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
          <button onClick={toggleLyrics} style={{ background: 'none', border: showLyrics ? '1px solid #1db954' : '1px solid #4d4d4d', color: showLyrics ? '#1db954' : '#b3b3b3', padding: '4px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
            🎤 Lirik
          </button>
          <span style={{ fontSize: '20px', color: '#b3b3b3' }}>🔊</span>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} style={{ width: '80px', cursor: 'pointer', accentColor: '#1db954' }} />
        </div>
      </div>
    </div>
  );
}

export default App;