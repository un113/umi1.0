import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { AllAnomyStats, SongConfig } from '../types';
import { ANOMY_SLOTS, NORMAL_INSTRUMENTS } from '../constants';
import { createAnomyInstrument, createInstrumentFromSelection } from '../audio';

interface HomeScreenProps {
  active: boolean;
  onNavigate: (screen: 'play' | 'grow') => void;
  stats: AllAnomyStats;
  songs: SongConfig[];
  setStatus: (status: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  active,
  onNavigate,
  stats,
  setStatus,
}) => {
  // Anomy wandering state
  const [anomyX, setAnomyX] = useState<number>(270);
  const [facingLeft, setFacingLeft] = useState<boolean>(false);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [isSquishing, setIsSquishing] = useState<boolean>(false);

  // Modals
  const [activeModal, setActiveModal] = useState<'collection' | 'status' | 'search' | null>(null);
  const [currentInspectAnomy, setCurrentInspectAnomy] = useState<string>('anomy_1');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  const targetXRef = useRef<number>(270);

  // Wandering AI loop with natural breathing squish
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.5) {
        // Walk to new target
        const newTarget = Math.floor(120 + Math.random() * 340);
        targetXRef.current = newTarget;
        setFacingLeft(newTarget < anomyX);
        setIsWalking(true);
        setIsSquishing(false);
      } else if (rand < 0.8) {
        // Stop and take a cute squishy breath!
        setIsWalking(false);
        setIsSquishing(true);
        setTimeout(() => setIsSquishing(false), 750);
      } else {
        // Little happy hop
        setIsWalking(false);
        setIsSquishing(false);
        setIsJumping(true);
        setTimeout(() => setIsJumping(false), 300);
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [active, anomyX]);

  // Smooth walking animation frame
  useEffect(() => {
    if (!active || !isWalking) return;

    let animId: number;
    const walkStep = () => {
      setAnomyX(curr => {
        const diff = targetXRef.current - curr;
        if (Math.abs(diff) <= 2) {
          setIsWalking(false);
          return targetXRef.current;
        }
        const speed = 1.4;
        return curr + (diff > 0 ? speed : -speed);
      });
      animId = requestAnimationFrame(walkStep);
    };

    animId = requestAnimationFrame(walkStep);
    return () => cancelAnimationFrame(animId);
  }, [active, isWalking]);

  const clickSynthRef = useRef<Tone.PolySynth | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);

  // Clean up click synth on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (clickSynthRef.current && !clickSynthRef.current.disposed) {
        try {
          clickSynthRef.current.dispose();
        } catch (e) {
          console.warn(e);
        }
      }
    };
  }, []);

  // Click Anomy
  const handleAnomyClick = async () => {
    setIsSquishing(true);
    setIsJumping(true);
    setStatus('アノミー「ぷにっ♪」');
    try {
      await Tone.start();
      // Reuse existing synth and release overlapping voices to prevent distortion
      if (!clickSynthRef.current || clickSynthRef.current.disposed) {
        clickSynthRef.current = createAnomyInstrument('anomy_1', stats);
      } else {
        clickSynthRef.current.releaseAll();
      }

      // Play cute musical chirp (pentatonic scale so consecutive clicks sound melodious)
      const pitches = ['C4', 'E4', 'G4', 'A4', 'C5'];
      const chosenPitch = pitches[Math.floor(Math.random() * pitches.length)];
      clickSynthRef.current.triggerAttackRelease(chosenPitch, '0.22');

      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        if (clickSynthRef.current && !clickSynthRef.current.disposed) {
          try {
            clickSynthRef.current.dispose();
          } catch (e) {
            console.warn(e);
          }
          clickSynthRef.current = null;
        }
      }, 2500);
    } catch (e) {
      console.warn(e);
    }
    setTimeout(() => {
      setIsJumping(false);
      setIsSquishing(false);
    }, 400);
  };

  // Preview an instrument sound in collection
  const handlePreviewSound = async (itemId: string) => {
    try {
      await Tone.start();
      const inst = await createInstrumentFromSelection(itemId, stats);
      if (inst) {
        inst.triggerAttackRelease('C4', '0.4');
        setTimeout(() => {
          try {
            inst.dispose();
          } catch (e) {
            console.warn(e);
          }
        }, 1500);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Trigger search expedition
  const handleStartSearch = () => {
    setSearchStatus('探索に出発しました...');
    setTimeout(() => {
      setSearchStatus('探索から戻ってきました！新しいひらめきを得たようです✨');
      setStatus('探索完了！');
    }, 2500);
  };

  const anomy1Stats = stats['anomy_1'] || { softness: 0, echo: 0, brightness: 0 };
  const anomy2Stats = stats['anomy_2'] || { softness: 0, echo: 0, brightness: 0 };

  return (
    <section id="homeScreen" className={`screen ${active ? 'active' : ''}`}>
      <div id="pixelStage">
        {/* Layer 0: Sky and Floor */}
        <img src="/images/dot_bg.png" alt="背景" className="pixel-layer layer-bg" />

        {/* Layer 2: Seamless Infinite Scrolling Clouds */}
        <div className="pixel-layer layer-clouds" />

        {/* Layer 3: Hanging Stars & Decorations */}
        <img src="/images/dot_stars.png" alt="星" className="pixel-layer layer-stars" />

        {/* Interactive UI Icons on Right */}
        <button
          className="pixel-btn btn-play"
          onClick={() => onNavigate('play')}
          title="演奏モードへ"
        >
          <img src="/images/dot_btn_play.png" alt="PLAY" />
        </button>

        <button
          className="pixel-btn btn-status"
          onClick={() => setActiveModal('status')}
          title="ステータス確認へ"
        >
          <img src="/images/dot_btn_status.png" alt="STATUS" />
        </button>

        <button
          className="pixel-btn btn-care"
          onClick={() => onNavigate('grow')}
          title="お世話（育成）へ"
        >
          <img src="/images/dot_btn_care.png" alt="お世話" />
        </button>

        {/* Interactive UI Icons on Left */}
        <button
          className="pixel-btn btn-search"
          onClick={() => {
            setActiveModal('search');
            setSearchStatus(null);
          }}
          title="探索モードへ"
        >
          <img src="/images/dot_btn_search.png" alt="探索" />
        </button>

        <button
          className="pixel-btn btn-chest"
          onClick={() => setActiveModal('collection')}
          title="コレクション確認（宝箱）"
        >
          <img src="/images/dot_btn_chest.png" alt="宝箱" />
        </button>

        {/* Anomy Living Creature */}
        <div
          className={`anomy-creature ${isJumping ? 'hop' : ''} ${isWalking ? 'walk' : ''}`}
          style={{
            left: `${anomyX}px`,
            transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)',
          }}
          onClick={handleAnomyClick}
          title="クリックするとぷにっと鳴きます♪"
        >
          <div className={`anomy-sprite ${isSquishing ? 'squishing' : ''}`} />
        </div>
      </div>

      {/* Modal: Collection (宝箱) */}
      {activeModal === 'collection' && (
        <div className="pixel-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="pixel-modal" onClick={e => e.stopPropagation()}>
            <div className="pixel-modal-header">
              <h3>📦 コレクション図鑑</h3>
              <button className="pixel-modal-close" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>
            <p className="pixel-modal-desc">集めたアノミーや楽器をタップして音を試聴できます。</p>
            <div className="collection-grid">
              <div className="collection-category">
                <h4>アノミー</h4>
                <div className="collection-items">
                  {ANOMY_SLOTS.map(a => (
                    <div
                      key={a.id}
                      className="collection-card"
                      onClick={() => handlePreviewSound(a.id)}
                    >
                      <img src={a.icon} alt={a.name} />
                      <span>{a.name}</span>
                      <small>試聴 ▶</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="collection-category">
                <h4>通常楽器</h4>
                <div className="collection-items">
                  {NORMAL_INSTRUMENTS.map(inst => (
                    <div
                      key={inst.id}
                      className="collection-card"
                      onClick={() => handlePreviewSound(inst.id)}
                    >
                      <img src={inst.icon} alt={inst.name} />
                      <span>{inst.name}</span>
                      <small>試聴 ▶</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Status (ステータス確認) */}
      {activeModal === 'status' && (
        <div className="pixel-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="pixel-modal" onClick={e => e.stopPropagation()}>
            <div className="pixel-modal-header">
              <h3>📊 アノミーステータス確認</h3>
              <button className="pixel-modal-close" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>

            <div className="status-selector">
              <button
                className={`target-btn ${currentInspectAnomy === 'anomy_1' ? 'active' : ''}`}
                onClick={() => setCurrentInspectAnomy('anomy_1')}
              >
                アノミー1
              </button>
              <button
                className={`target-btn ${currentInspectAnomy === 'anomy_2' ? 'active' : ''}`}
                onClick={() => setCurrentInspectAnomy('anomy_2')}
              >
                アノミー2
              </button>
            </div>

            <div className="status-inspect-content">
              {currentInspectAnomy === 'anomy_1' ? (
                <div className="status-bars">
                  <div className="stat-row">
                    <span className="stat-label">やわらかさ (Softness):</span>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill fill-softness"
                        style={{ width: `${anomy1Stats.softness}%` }}
                      />
                    </div>
                    <span className="stat-val">{anomy1Stats.softness}/100</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">ひびき (Echo):</span>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill fill-echo"
                        style={{ width: `${anomy1Stats.echo}%` }}
                      />
                    </div>
                    <span className="stat-val">{anomy1Stats.echo}/100</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">あかるさ (Brightness):</span>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill fill-brightness"
                        style={{ width: `${anomy1Stats.brightness}%` }}
                      />
                    </div>
                    <span className="stat-val">{anomy1Stats.brightness}/100</span>
                  </div>
                </div>
              ) : (
                <div className="status-bars">
                  <div className="stat-row">
                    <span className="stat-label">やわらかさ (Softness):</span>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill fill-softness"
                        style={{ width: `${anomy2Stats.softness}%` }}
                      />
                    </div>
                    <span className="stat-val">{anomy2Stats.softness}/100</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">ひびき (Echo):</span>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill fill-echo"
                        style={{ width: `${anomy2Stats.echo}%` }}
                      />
                    </div>
                    <span className="stat-val">{anomy2Stats.echo}/100</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">あかるさ (Brightness):</span>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill fill-brightness"
                        style={{ width: `${anomy2Stats.brightness}%` }}
                      />
                    </div>
                    <span className="stat-val">{anomy2Stats.brightness}/100</span>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  className="target-btn active"
                  style={{ flex: 1 }}
                  onClick={() => onNavigate('grow')}
                >
                  お世話して育てる ➜
                </button>
                <button
                  className="target-btn"
                  style={{ flex: 1 }}
                  onClick={() => handlePreviewSound(currentInspectAnomy)}
                >
                  音を聴く ♫
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Search (探索モード) */}
      {activeModal === 'search' && (
        <div className="pixel-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="pixel-modal" onClick={e => e.stopPropagation()}>
            <div className="pixel-modal-header">
              <h3>🧭 探索モード</h3>
              <button className="pixel-modal-close" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>
            <p className="pixel-modal-desc">
              アノミーを探索に向かわせることで、新しい楽器や餌を入手できます。
            </p>

            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <img
                src="/images/dot_anomy.png"
                alt="探索アノミー"
                style={{ width: '60px', imageRendering: 'pixelated', marginBottom: '12px' }}
              />
              <p style={{ margin: '8px 0', fontSize: '14px', color: '#555' }}>
                {searchStatus || '探索先を選択して出発させましょう！'}
              </p>
              <button
                className="target-btn active"
                style={{ marginTop: '10px', padding: '10px 24px', fontSize: '14px' }}
                onClick={handleStartSearch}
                disabled={searchStatus === '探索に出発しました...'}
              >
                🌲 音の森へ探索に出発！
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
