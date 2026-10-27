import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { AllAnomyStats, SongConfig, DraggedItemInfo } from '../types';
import { ANOMY_SLOTS, NORMAL_INSTRUMENTS, findItemById } from '../constants';
import { createInstrumentFromSelection, PlayableInstrument } from '../audio';

interface PlayScreenProps {
  active: boolean;
  songs: SongConfig[];
  currentSong: SongConfig | null;
  onSelectSong: (song: SongConfig) => void;
  formation: Record<number, string | null>;
  setFormation: React.Dispatch<React.SetStateAction<Record<number, string | null>>>;
  stats: AllAnomyStats;
  setStatus: (status: string) => void;
}

export const PlayScreen: React.FC<PlayScreenProps> = ({
  active,
  songs,
  currentSong,
  onSelectSong,
  formation,
  setFormation,
  stats,
  setStatus,
}) => {
  const [tabFilter, setTabFilter] = useState<'all' | 'anomy' | 'instrument'>('all');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hoveredSpotIndex, setHoveredSpotIndex] = useState<number | null>(null);

  const draggedItemRef = useRef<DraggedItemInfo | null>(null);
  const instrumentsRef = useRef<(PlayableInstrument | null)[]>([]);
  const partEventsRef = useRef<number[]>([]);
  const bgmPlayerRef = useRef<Tone.Player | null>(null);
  const statsRef = useRef<AllAnomyStats>(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const cleanUpSynths = useCallback(() => {
    partEventsRef.current.forEach(ev => Tone.Transport.clear(ev));
    partEventsRef.current = [];
    instrumentsRef.current.forEach(inst => {
      if (inst && !inst.disposed && typeof inst.dispose === 'function') {
        try {
          inst.dispose();
        } catch (e) {
          console.warn('Error disposing instrument:', e);
        }
      }
    });
    instrumentsRef.current = [];
  }, []);

  const stopMusic = useCallback(() => {
    Tone.Transport.stop();
    if (bgmPlayerRef.current) {
      try {
        bgmPlayerRef.current.dispose();
      } catch (e) {
        console.warn('Error disposing bgm player:', e);
      }
      bgmPlayerRef.current = null;
    }
    cleanUpSynths();
    setIsPlaying(false);
    setStatus('演奏終了');
  }, [cleanUpSynths, setStatus]);

  // Clean up if song changes or unmounts
  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, [currentSong, stopMusic]);

  const handlePlayButtonClick = async () => {
    await Tone.start();

    if (isPlaying) {
      stopMusic();
      return;
    }

    if (!currentSong) return;

    setStatus('読み込み中...');

    try {
      const currentMidi = await Midi.fromUrl(currentSong.filename);

      if (currentSong.bgm) {
        bgmPlayerRef.current = new Tone.Player(currentSong.bgm).toDestination();
        await Tone.loaded();
        bgmPlayerRef.current.volume.value = -15;
        bgmPlayerRef.current.sync().start(0);
      }

      cleanUpSynths();
      const instruments: (PlayableInstrument | null)[] = [];
      for (let i = 0; i < currentSong.tracks.length; i++) {
        const inst = await createInstrumentFromSelection(formation[i] ?? null, statsRef.current);
        instruments.push(inst);
      }
      instrumentsRef.current = instruments;

      Tone.Transport.bpm.value = currentMidi.header.tempos[0]?.bpm || 120;
      Tone.Transport.seconds = 0;

      // Schedule notes for each track
      currentMidi.tracks.forEach((track, index) => {
        const inst = instruments[index];
        if (!inst) return;
        track.notes.forEach(note => {
          const ev = Tone.Transport.schedule(time => {
            inst.triggerAttackRelease(note.name, note.duration, time, note.velocity);
          }, note.time);
          partEventsRef.current.push(ev);
        });
      });

      const endEv = Tone.Transport.schedule(time => {
        Tone.Draw.schedule(() => {
          stopMusic();
        }, time);
      }, currentMidi.duration + 0.5);
      partEventsRef.current.push(endEv);

      setIsPlaying(true);
      setStatus('演奏中');
      Tone.Transport.start();
    } catch (e) {
      console.error(e);
      setStatus('エラーが発生しました');
      setIsPlaying(false);
    }
  };

  const handleDrop = (targetTrackIndex: number) => {
    setHoveredSpotIndex(null);
    const dragged = draggedItemRef.current;
    if (!dragged || !currentSong) return;

    const targetTrack = currentSong.tracks[targetTrackIndex];
    if (targetTrack.slotType !== dragged.type) {
      setStatus('ここには配置できません');
      return;
    }

    setFormation(prev => {
      const updated = { ...prev };
      if (dragged.fromTrackIndex !== null && dragged.fromTrackIndex !== undefined) {
        updated[dragged.fromTrackIndex] = null;
      }
      updated[targetTrackIndex] = dragged.id;
      return updated;
    });

    draggedItemRef.current = null;
  };

  const handlePlacedIconClick = (index: number) => {
    setFormation(prev => ({
      ...prev,
      [index]: null,
    }));
  };

  // Filter items for tray
  const allItems = [...ANOMY_SLOTS, ...NORMAL_INSTRUMENTS];
  const trayItems = tabFilter === 'all' ? allItems : allItems.filter(item => item.type === tabFilter);

  return (
    <section id="playScreen" className={`screen ${active ? 'active' : ''}`}>
      <select
        id="songSelect"
        value={currentSong?.id || ''}
        onChange={e => {
          const found = songs.find(s => s.id === e.target.value);
          if (found) {
            stopMusic();
            onSelectSong(found);
          }
        }}
      >
        {songs.map(song => (
          <option key={song.id} value={song.id}>
            {song.title}
          </option>
        ))}
      </select>

      <div id="stage">
        <img id="bg" src="/images/haikei.png" alt="背景" />

        <div id="spotArea">
          {currentSong?.tracks.map((track, index) => (
            <img
              key={`spot-${index}`}
              src={`/${track.spotImage}`}
              alt={`spot-${index}`}
              className={`spot ${hoveredSpotIndex === index ? 'drag-over' : ''}`}
              style={{ left: `${track.x}px`, top: `${track.y}px` }}
              onDragOver={e => {
                e.preventDefault();
                setHoveredSpotIndex(index);
              }}
              onDragLeave={() => setHoveredSpotIndex(null)}
              onDrop={e => {
                e.preventDefault();
                handleDrop(index);
              }}
            />
          ))}
        </div>

        {/* Placed Icons */}
        {currentSong?.tracks.map((track, index) => {
          const itemId = formation[index];
          if (!itemId) return null;
          const item = findItemById(itemId);
          if (!item) return null;

          return (
            <img
              key={`placed-${index}-${itemId}`}
              src={item.icon}
              alt={item.name}
              className="placed-icon"
              style={{ left: `${track.x + 4}px`, top: `${track.y + 10}px` }}
              draggable
              onDragStart={() => {
                draggedItemRef.current = {
                  id: item.id,
                  type: item.type,
                  fromTrackIndex: index,
                };
              }}
              onClick={() => handlePlacedIconClick(index)}
              title={`${item.name} (クリックで外す)`}
            />
          );
        })}

        <img
          id="playBtn"
          src="/images/play.png"
          alt={isPlaying ? '停止' : '再生'}
          onClick={handlePlayButtonClick}
          style={{ opacity: isPlaying ? 0.8 : 1 }}
        />

        <div id="bottomTab">
          <img id="tab0" src="/images/tab0.png" alt="タブ背景" />
          <div id="smallTabs">
            <img
              src="/images/tab1.png"
              className={`small-tab ${tabFilter === 'anomy' ? 'active-tab' : ''}`}
              alt="アノミータブ"
              onClick={() => setTabFilter('anomy')}
            />
            <img
              src="/images/tab2.png"
              className={`small-tab ${tabFilter === 'instrument' ? 'active-tab' : ''}`}
              alt="楽器タブ"
              onClick={() => setTabFilter('instrument')}
            />
            <img
              src="/images/tab3.png"
              className={`small-tab ${tabFilter === 'all' ? 'active-tab' : ''}`}
              alt="全表示タブ"
              onClick={() => setTabFilter('all')}
            />
          </div>
          <div id="iconTray">
            {trayItems.map(item => (
              <img
                key={item.id}
                src={item.icon}
                alt={item.name}
                className="tray-icon"
                draggable
                onDragStart={() => {
                  draggedItemRef.current = {
                    id: item.id,
                    type: item.type,
                    fromTrackIndex: null,
                  };
                }}
                title={item.name}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
