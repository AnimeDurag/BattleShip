import { useRef, useEffect } from 'react';
import { calcScore, getRank, RANKS, getCommentaryText } from '../utils/scoring';
import { winRate, avgShots } from '../hooks/useSessionStats';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { SessionStats } from '../hooks/useSessionStats';
import type { Difficulty } from '../models/types';

interface GameOverProps {
  winner:       'player' | 'opponent';
  shotCount:    number;
  /** @deprecated use shotCount — kept for backward compatibility with existing tests */
  turnCount?:   number;
  difficulty:   Difficulty | null;
  sessionStats: SessionStats;
  onRestart:    () => void;
  onViewBoard?: () => void;
}

export default function GameOver({
  winner,
  shotCount,
  difficulty,
  sessionStats,
  onRestart,
  onViewBoard,
}: GameOverProps) {
  const isVictory = winner === 'player';
  const score     = isVictory ? calcScore(shotCount, difficulty ?? 'easy') : null;
  const rank      = score !== null ? getRank(score) : null;
  function getCommentary(): string {
    if (score === null || difficulty === null) return '';
    return getCommentaryText(score, shotCount, difficulty);
  }

  const wr    = winRate(sessionStats);
  const shots = avgShots(sessionStats);

  const panelRef     = useRef<HTMLDivElement>(null);
  const restartBtnRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(panelRef);

  useEffect(() => {
    restartBtnRef.current?.focus();
  }, []);

  return (
    <div className="gameover-overlay">
      <div
        className="gameover-panel"
        role="dialog"
        aria-modal="true"
        aria-label={isVictory ? 'Victory' : 'Defeated'}
        ref={panelRef}
      >

        {/* ── Accent bar changes color on defeat ── */}
        <div className={`gameover-panel__accent ${isVictory ? '' : 'gameover-panel__accent--defeat'}`} />

        {/* ── Close button — hides overlay so player can inspect the final board ── */}
        {onViewBoard && (
          <button
            className="gameover-panel__close"
            aria-label="Close and view board"
            onClick={onViewBoard}
          >
            ✕
          </button>
        )}

        {/* ── Title ── */}
        <div className={`gameover-panel__title ${isVictory ? 'gameover-panel__title--victory' : 'gameover-panel__title--defeat'}`}>
          {isVictory ? 'VICTORY' : 'DEFEATED'}
        </div>

        <p className="gameover-panel__sub">
          {isVictory
            ? `ENEMY FLEET DESTROYED — ${shotCount} MISSILES FIRED`
            : `YOUR FLEET HAS BEEN SUNK — ${shotCount} ROUNDS ELAPSED`}
        </p>

        {/* ── Performance section (victory only) ── */}
        {isVictory && rank && score !== null && (
          <div className="gameover-perf">

            {/* Score heading — lives above the bar */}
            <div className="gameover-perf__score-heading">
              <span
                className="gameover-perf__score-num"
                style={{ color: `var(${rank.cssVar})` }}
              >
                {score}%
              </span>
              <span className="gameover-perf__score-unit">EFFICIENCY</span>
            </div>

            {/* Bar track */}
            <div className="gameover-perf__bar-wrap">
              <div
                className="gameover-perf__bar-fill"
                style={{
                  width: `${score}%`,
                  background: `var(${rank.cssVar})`,
                  boxShadow: `0 0 14px var(${rank.cssVar})`,
                }}
              />
            </div>

            {/* Rank badge */}
            <div
              className={`gameover-rank gameover-rank--${rank.tier}`}
              style={{ color: `var(${rank.cssVar})`, borderColor: `var(${rank.cssVar})` }}
            >
              <div className="gameover-rank__label">RANK ACHIEVED</div>
              <div className="gameover-rank__name">{rank.label}</div>
              {rank.tier === 'general' && (
                <div className="gameover-rank__star">★</div>
              )}
            </div>

            {/* Rank scale reference */}
            <div className="gameover-rank-scale">
              {RANKS.map(r => (
                <div
                  key={r.tier}
                  className={`gameover-rank-scale__item${r.tier === rank.tier ? ' gameover-rank-scale__item--active' : ''}`}
                  style={r.tier === rank.tier ? { color: `var(${r.cssVar})`, borderColor: `var(${r.cssVar})` } : {}}
                  aria-current={r.tier === rank.tier ? 'true' : undefined}
                >
                  {r.label}
                </div>
              ))}
            </div>

            {/* Commentary */}
            <p className="gameover-perf__commentary">{getCommentary()}</p>
          </div>
        )}

        {/* ── Session stats ── */}
        {sessionStats.gamesPlayed > 0 && (
          <div className="gameover-stats">
            <div className="gameover-stats__title">SESSION RECORD</div>
            <div className="gameover-stats__grid">
              <div className="gameover-stats__cell">
                <div className="gameover-stats__val">{sessionStats.gamesPlayed}</div>
                <div className="gameover-stats__key">ENGAGEMENTS</div>
              </div>
              <div className="gameover-stats__cell">
                <div className="gameover-stats__val gameover-stats__val--win">{sessionStats.wins}</div>
                <div className="gameover-stats__key">VICTORIES</div>
              </div>
              <div className="gameover-stats__cell">
                <div className="gameover-stats__val gameover-stats__val--loss">{sessionStats.losses}</div>
                <div className="gameover-stats__key">DEFEATS</div>
              </div>
              <div className="gameover-stats__cell">
                <div className="gameover-stats__val">{wr !== null ? `${wr}%` : '—'}</div>
                <div className="gameover-stats__key">WIN RATE</div>
              </div>
              <div className="gameover-stats__cell">
                <div className="gameover-stats__val">{shots !== null ? shots : '—'}</div>
                <div className="gameover-stats__key">AVG SHOTS</div>
              </div>
              <div className="gameover-stats__cell">
                <div className="gameover-stats__val gameover-stats__val--best">
                  {sessionStats.bestScore !== null ? `${sessionStats.bestScore}%` : '—'}
                </div>
                <div className="gameover-stats__key">BEST SCORE</div>
              </div>
              <div className="gameover-stats__cell">
                <div className="gameover-stats__val">{sessionStats.winStreak}</div>
                <div className="gameover-stats__key">STREAK</div>
              </div>
              <div className="gameover-stats__cell">
                <div className="gameover-stats__val">{sessionStats.bestWinStreak}</div>
                <div className="gameover-stats__key">BEST STREAK</div>
              </div>
            </div>
          </div>
        )}

        <button
          ref={restartBtnRef}
          className="btn btn--primary gameover-panel__btn"
          onClick={onRestart}
        >
          ⟳ NEW BATTLE
        </button>
      </div>
    </div>
  );
}
