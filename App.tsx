import React, { useState, useEffect } from 'react';
import { MasterData, SongConfig, AllAnomyStats } from './types';
import { DEFAULT_STATS, STORAGE_KEY } from './constants';
import { HomeScreen } from './components/HomeScreen';
import { PlayScreen } from './components/PlayScreen';
import { GrowScreen } from './components/GrowScreen';

const FALLBACK_MASTER: MasterData = {
  songs: [
    {
      id: "track_kaeru",
      title: "カエルの歌",
      filename: "/songs/カエルの歌.mid",
      tracks: [
        {
          name: "パート1",
          defaultInstrument: "anomy_1",
          slotType: "anomy",
          spotImage: "images/spot1.png",
          x: 150,
          y: 150
        },
        {
          name: "パート2",
          defaultInstrument: "anomy_2",
          slotType: "anomy",
          spotImage: "images/spot2.png",
          x: 410,
          y: 150
        }
      ],
      availableInstruments: ["anomy_1", "anomy_2", "anomy_3"]
    },
    {
      id: "track_konpeitou",
      title: "こんぺいとうの踊り",
      filename: "/songs/konpeitou.mid",
      bgm: "/songs/konpeitou.mp3",
      tracks: [
        {
          name: "可変メロディ",
          defaultInstrument: "anomy_1",
          slotType: "anomy",
          spotImage: "images/spot1.png",
          x: 280,
          y: 150
        }
      ],
      availableInstruments: ["anomy_1", "anomy_2", "anomy_3"]
    }
  ]
};

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<'home' | 'play' | 'grow'>('home');
  const [songs, setSongs] = useState<SongConfig[]>([]);
  const [currentSong, setCurrentSong] = useState<SongConfig | null>(null);
  const [formation, setFormation] = useState<Record<number, string | null>>({});
  const [stats, setStats] = useState<AllAnomyStats>(DEFAULT_STATS);
  const [status, setStatus] = useState<string>('準備中');

  // Load stats from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStats(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('Failed to load stats from storage:', e);
    }
  }, []);

  const handleUpdateStats = (newStats: AllAnomyStats) => {
    setStats(newStats);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
    } catch (e) {
      console.warn('Failed to save stats to storage:', e);
    }
  };

  const initSongFormation = (song: SongConfig) => {
    setCurrentSong(song);
    const newFormation: Record<number, string | null> = {};
    song.tracks.forEach((track, index) => {
      newFormation[index] = track.defaultInstrument || null;
    });
    setFormation(newFormation);
  };

  // Load master.json
  useEffect(() => {
    const loadMaster = async () => {
      try {
        const response = await fetch('/master.json');
        if (!response.ok) throw new Error('Fetch master.json failed');
        const data: MasterData = await response.json();
        const normalizedSongs = data.songs.map(song => ({
          ...song,
          filename: song.filename.startsWith('/') ? song.filename : `/${song.filename}`,
          bgm: song.bgm ? (song.bgm.startsWith('/') ? song.bgm : `/${song.bgm}`) : undefined,
        }));
        setSongs(normalizedSongs);
        if (normalizedSongs.length > 0) {
          initSongFormation(normalizedSongs[0]);
        }
        setStatus('準備完了');
      } catch (e) {
        console.warn('Falling back to embedded master data:', e);
        setSongs(FALLBACK_MASTER.songs);
        initSongFormation(FALLBACK_MASTER.songs[0]);
        setStatus('準備完了');
      }
    };

    loadMaster();
  }, []);

  return (
    <div id="game">
      <div id="navButtons">
        <button
          id="showHomeScreenBtn"
          className={activeScreen === 'home' ? 'nav-active' : ''}
          onClick={() => setActiveScreen('home')}
        >
          🏠 ルーム
        </button>
        <button
          id="showPlayScreenBtn"
          className={activeScreen === 'play' ? 'nav-active' : ''}
          onClick={() => setActiveScreen('play')}
        >
          🎵 演奏画面へ
        </button>
        <button
          id="showGrowScreenBtn"
          className={activeScreen === 'grow' ? 'nav-active' : ''}
          onClick={() => setActiveScreen('grow')}
        >
          🌱 育成画面へ
        </button>
      </div>

      <HomeScreen
        active={activeScreen === 'home'}
        onNavigate={screen => setActiveScreen(screen)}
        stats={stats}
        songs={songs}
        setStatus={setStatus}
      />

      <PlayScreen
        active={activeScreen === 'play'}
        songs={songs}
        currentSong={currentSong}
        onSelectSong={initSongFormation}
        formation={formation}
        setFormation={setFormation}
        stats={stats}
        setStatus={setStatus}
      />

      <GrowScreen
        active={activeScreen === 'grow'}
        stats={stats}
        onUpdateStats={handleUpdateStats}
        setStatus={setStatus}
      />

      <div id="statusLabel">{status}</div>
    </div>
  );
};

export default App;
