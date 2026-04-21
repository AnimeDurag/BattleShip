import { useState, useRef, useEffect } from 'react';
import type { Difficulty } from '../models/types';
import { winRate, avgShots, p1WinRate, p2WinRate, p1AvgShots, p2AvgShots, p1Accuracy, p2Accuracy } from '../hooks/useSessionStats';
import type { SessionStats, PvPSessionStats } from '../hooks/useSessionStats';
import type { SoundEffect } from '../audio/effects';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MainMenuProps {
  onSoloStart:   (difficulty: Difficulty) => void;
  onPvPStart:    () => void;
  soloStats:     SessionStats;
  pvpStats:      PvPSessionStats;
  onPlayEffect:  (effect: SoundEffect) => void;
}

// ─── Difficulty tier metadata ─────────────────────────────────────────────────

const DIFFICULTIES: {
  value:    Difficulty;
  label:    string;
  codename: string;
  description: string;
  modifier: string;
}[] = [
  { value: 'easy',   label: 'EASY',   codename: 'RANDOM FIRE',       description: 'Fires randomly with no targeting logic. Great for beginners.',         modifier: 'low'     },
  { value: 'medium', label: 'MEDIUM', codename: 'CHECKERBOARD SWEEP', description: 'Parity sweep with basic hunt-and-target follow-up.',                   modifier: 'mid'     },
  { value: 'hard',   label: 'HARD',   codename: 'DENSITY HUNT',       description: 'Density-weighted probability map. Finds ships fast.',                  modifier: 'high'    },
  { value: 'sweaty', label: 'SWEATY', codename: 'OPTIMAL STRIKE',     description: 'Near-optimal probability density targeting. Expect no mercy.',         modifier: 'extreme' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MainMenu({ onSoloStart, onPvPStart, soloStats, pvpStats, onPlayEffect }: MainMenuProps) {
  const [soloExpanded, setSoloExpanded] = useState(false);
  const wr    = winRate(soloStats);
  const shots = avgShots(soloStats);

  const soloToggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    soloToggleRef.current?.focus();
  }, []);

  const showStats = soloStats.gamesPlayed > 0 || pvpStats.gamesPlayed > 0;

  return (
    <div className="main-menu">
      <div className="scanlines" />

      <div className="main-menu__inner">

        {/* ── Hero ── */}
        <div className="main-menu__hero">
          <div className="main-menu__logo">BATTLE<span>SHIP</span></div>
          <p className="main-menu__tagline">NAVAL COMBAT SIMULATOR</p>
        </div>

        {/* ── Mode + difficulty selection ── */}
        <div className="main-menu__section">
          <div className="main-menu__section-label">SELECT GAME MODE</div>

          <div className="main-menu__modes">

            {/* ── Solo vs AI — active ── */}
            <div className={`main-menu__mode-block${soloExpanded ? ' main-menu__mode-block--expanded' : ''}`}>
              <button
                ref={soloToggleRef}
                className="main-menu__mode-toggle"
                onClick={() => setSoloExpanded(e => !e)}
                aria-expanded={soloExpanded}
                aria-label="Solo vs AI — select difficulty"
              >
                <div className="main-menu__mode-name main-menu__mode-name--active">SOLO VS AI</div>
                <p className="main-menu__mode-desc">Challenge the computer. Select your threat level.</p>
                <span className={`main-menu__chevron${soloExpanded ? ' main-menu__chevron--open' : ''}`}>▼</span>
              </button>

              <div className={`main-menu__diff-drawer${soloExpanded ? ' main-menu__diff-drawer--open' : ''}`}>
                <div className="main-menu__diff-drawer-inner">
                  <div className="diff-options">
                    {DIFFICULTIES.map(({ value, label, codename, description, modifier }) => (
                      <button
                        key={value}
                        className={`diff-option diff-option--${modifier}`}
                        onClick={() => { onPlayEffect('uiClick'); onSoloStart(value); }}
                        aria-label={`Start solo game on ${label} difficulty: ${description}`}
                      >
                        <div className="diff-option__top">
                          <span className="diff-option__label">{label}</span>
                          <span className="diff-option__codename">{codename}</span>
                          <span className="diff-option__arrow">→</span>
                        </div>
                        <div className="diff-option__desc">{description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Local PvP — active ── */}
            <div className="main-menu__mode-block">
              <div className="main-menu__mode-header">
                <div className="main-menu__mode-name main-menu__mode-name--active">LOCAL PVP</div>
                <p className="main-menu__mode-desc">Two players, one device. Hot-seat battle.</p>
                <p className="main-menu__mode-rule">KEEP FIRING ON HITS — your turn continues until you miss.</p>
              </div>
              <button
                className="btn btn--primary"
                onClick={onPvPStart}
              >
                START LOCAL PvP
              </button>
            </div>

            {/* ── Online — disabled ── */}
            <div
              className="main-menu__mode-block main-menu__mode-block--disabled"
              aria-disabled="true"
              role="region"
              aria-label="Online — coming soon"
            >
              <div className="main-menu__mode-header">
                <div className="main-menu__mode-name">ONLINE</div>
                <p className="main-menu__mode-desc">Real-time multiplayer over the network.</p>
              </div>
              <div className="main-menu__coming-soon">COMING SOON</div>
            </div>

          </div>
        </div>

        {/* ── Session stats — three sections ── */}
        {showStats && (
          <div className="main-menu__stats">
            <div className="main-menu__stats-title">SESSION RECORD</div>
            <div className="main-menu__session-columns">

              {/* ── Solo vs AI section ── */}
              {soloStats.gamesPlayed > 0 && (
                <div className="main-menu__session-section">
                  <div className="main-menu__session-section-title">SOLO VS AI</div>
                  <div className="main-menu__stats-grid">
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val main-menu__stats-val--win">{soloStats.wins}</div>
                      <div className="main-menu__stats-key">WINS</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val main-menu__stats-val--loss">{soloStats.losses}</div>
                      <div className="main-menu__stats-key">LOSSES</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val">{wr !== null ? `${wr}%` : '—'}</div>
                      <div className="main-menu__stats-key">WIN RATE</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val main-menu__stats-val--best">
                        {soloStats.bestScore !== null ? `${soloStats.bestScore}%` : '—'}
                      </div>
                      <div className="main-menu__stats-key">BEST SCORE</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val">{shots !== null ? shots : '—'}</div>
                      <div className="main-menu__stats-key">AVG SHOTS</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val main-menu__stats-val--streak">{soloStats.winStreak}</div>
                      <div className="main-menu__stats-key">STREAK</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Player 1 section ── */}
              {pvpStats.gamesPlayed > 0 && (
                <div className="main-menu__session-section">
                  <div className="main-menu__session-section-title">PLAYER 1</div>
                  <div className="main-menu__stats-grid">
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val main-menu__stats-val--win">{pvpStats.p1Wins}</div>
                      <div className="main-menu__stats-key">WINS</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val">{p1WinRate(pvpStats) !== null ? `${p1WinRate(pvpStats)}%` : '—'}</div>
                      <div className="main-menu__stats-key">WIN RATE</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val">{p1AvgShots(pvpStats) !== null ? p1AvgShots(pvpStats) : '—'}</div>
                      <div className="main-menu__stats-key">AVG SHOTS</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val">{p1Accuracy(pvpStats) !== null ? `${p1Accuracy(pvpStats)}%` : '—'}</div>
                      <div className="main-menu__stats-key">ACCURACY</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Player 2 section ── */}
              {pvpStats.gamesPlayed > 0 && (
                <div className="main-menu__session-section">
                  <div className="main-menu__session-section-title">PLAYER 2</div>
                  <div className="main-menu__stats-grid">
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val main-menu__stats-val--win">{pvpStats.p2Wins}</div>
                      <div className="main-menu__stats-key">WINS</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val">{p2WinRate(pvpStats) !== null ? `${p2WinRate(pvpStats)}%` : '—'}</div>
                      <div className="main-menu__stats-key">WIN RATE</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val">{p2AvgShots(pvpStats) !== null ? p2AvgShots(pvpStats) : '—'}</div>
                      <div className="main-menu__stats-key">AVG SHOTS</div>
                    </div>
                    <div className="main-menu__stats-cell">
                      <div className="main-menu__stats-val">{p2Accuracy(pvpStats) !== null ? `${p2Accuracy(pvpStats)}%` : '—'}</div>
                      <div className="main-menu__stats-key">ACCURACY</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
