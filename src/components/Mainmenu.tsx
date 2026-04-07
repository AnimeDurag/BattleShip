import type { Difficulty } from '../models/types';
import { winRate, avgShots } from '../hooks/useSessionStats';
import type { SessionStats } from '../hooks/useSessionStats';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MainMenuProps {
  onSoloStart:  (difficulty: Difficulty) => void;
  sessionStats: SessionStats;
}

// ─── Difficulty tier metadata ─────────────────────────────────────────────────

const DIFFICULTIES: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy',   label: 'EASY',   description: 'Random fire — no hunt logic' },
  { value: 'medium', label: 'MEDIUM', description: 'Checkerboard sweep + targeting' },
  { value: 'hard',   label: 'HARD',   description: 'Density-weighted hunt' },
  { value: 'sweaty', label: 'SWEATY', description: 'Probability density — near-optimal' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MainMenu({ onSoloStart, sessionStats }: MainMenuProps) {
  const wr    = winRate(sessionStats);
  const shots = avgShots(sessionStats);

  return (
    <div className="main-menu">
      <div className="scanlines" />

      {/* ── Header ── */}
      <header className="header">
        <div className="header__logo">BATTLE<span>SHIP</span></div>
      </header>

      {/* ── Mode selection ── */}
      <div className="main-menu__content">
        <p className="main-menu__subtitle">SELECT GAME MODE</p>

        <div className="main-menu__modes">

          {/* ── Solo vs AI — active ── */}
          <div className="main-menu__mode-card main-menu__mode-card--active">
            <div className="main-menu__mode-title">SOLO VS AI</div>
            <p className="main-menu__mode-desc">Challenge the computer. Select your threat level.</p>
            <div className="main-menu__difficulties">
              {DIFFICULTIES.map(({ value, label, description }) => (
                <button
                  key={value}
                  className={`main-menu__diff-btn status-pill--diff-${value}`}
                  onClick={() => onSoloStart(value)}
                  aria-label={`Start solo game on ${label} difficulty: ${description}`}
                >
                  <span className="main-menu__diff-label">{label}</span>
                  <span className="main-menu__diff-desc">{description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Local PvP — coming soon ── */}
          <div
            className="main-menu__mode-card main-menu__mode-card--disabled"
            aria-disabled="true"
          >
            <div className="main-menu__mode-title">LOCAL PvP</div>
            <p className="main-menu__mode-desc">Two players, one device. Hot-seat battle.</p>
            <div className="main-menu__coming-soon">COMING SOON</div>
          </div>

          {/* ── Online — coming soon ── */}
          <div
            className="main-menu__mode-card main-menu__mode-card--disabled"
            aria-disabled="true"
          >
            <div className="main-menu__mode-title">ONLINE</div>
            <p className="main-menu__mode-desc">Real-time multiplayer over the network.</p>
            <div className="main-menu__coming-soon">COMING SOON</div>
          </div>

        </div>

        {/* ── Session stats — only after at least one game ── */}
        {sessionStats.gamesPlayed > 0 && (
          <div className="main-menu__session">
            <div className="main-menu__session-title">SESSION RECORD</div>
            <div className="main-menu__session-grid">
              <div className="main-menu__session-cell">
                <div className="main-menu__session-val main-menu__session-val--win">
                  {sessionStats.wins}
                </div>
                <div className="main-menu__session-key">WINS</div>
              </div>
              <div className="main-menu__session-cell">
                <div className="main-menu__session-val main-menu__session-val--loss">
                  {sessionStats.losses}
                </div>
                <div className="main-menu__session-key">LOSSES</div>
              </div>
              <div className="main-menu__session-cell">
                <div className="main-menu__session-val">
                  {wr !== null ? `${wr}%` : '—'}
                </div>
                <div className="main-menu__session-key">WIN RATE</div>
              </div>
              <div className="main-menu__session-cell">
                <div className="main-menu__session-val main-menu__session-val--best">
                  {sessionStats.bestScore !== null ? `${sessionStats.bestScore}%` : '—'}
                </div>
                <div className="main-menu__session-key">BEST SCORE</div>
              </div>
              <div className="main-menu__session-cell">
                <div className="main-menu__session-val">
                  {shots !== null ? shots : '—'}
                </div>
                <div className="main-menu__session-key">AVG SHOTS</div>
              </div>
              <div className="main-menu__session-cell">
                <div className="main-menu__session-val main-menu__session-val--streak">
                  {sessionStats.winStreak}
                </div>
                <div className="main-menu__session-key">STREAK</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}