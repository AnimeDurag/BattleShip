import { Difficulty } from '../models/types';
import { DIFFICULTIES } from '../utils/constants';

interface DifficultySelectProps {
  onSelect: (d: Difficulty) => void;
}

interface DifficultyMeta {
  label: string;
  codename: string;
  desc: string;
  threat: 'low' | 'mid' | 'high' | 'extreme';
}

const META: Record<Difficulty, DifficultyMeta> = {
  easy: {
    label:    'EASY',
    codename: 'ERRATIC',
    desc:     'ENEMY NAVIGATION SYSTEMS ARE COMPROMISED. HOSTILE FORCES ENGAGE TARGETS WITHOUT TACTICAL COORDINATION — FIRE PATTERNS ARE UNPREDICTABLE AND UNSYSTEMATIC. EVEN CONFIRMED CONTACTS WILL NOT BE PROSECUTED.',
    threat:   'low',
  },
  medium: {
    label:    'MEDIUM',
    codename: 'HUNTER',
    desc:     'ENEMY CREW IS TRAINED AND DISCIPLINED. HOSTILE FORCES SWEEP THE GRID IN A SYSTEMATIC PATTERN, THEN CONVERGE ON YOUR POSITION THE MOMENT CONTACT IS MADE — AND WILL NOT RELENT UNTIL THE VESSEL IS DESTROYED.',
    threat:   'mid',
  },
  hard: {
    label:    'HARD',
    codename: 'PREDATOR',
    desc:     'ENEMY COMMANDER IS DECORATED AND CALCULATING. FORCES CONCENTRATE FIRE WHERE YOUR LARGEST REMAINING VESSEL IS MOST LIKELY HIDING, THEN PROSECUTE EVERY HIT WITH FULL TACTICAL FOLLOW-THROUGH. CONCEALMENT WILL NOT SAVE YOU.',
    threat:   'high',
  },
  sweaty: {
    label:    'SWEATY',
    codename: 'ORACLE',
    desc:     'ENEMY IS RUNNING FULL PROBABILITY TARGETING. EVERY UNCHARTED SQUARE IS EVALUATED AGAINST ALL KNOWN FLEET POSITIONS IN REAL TIME. THERE IS NO SAFE SECTOR. THERE IS NO IDEAL PLACEMENT. THEY WILL FIND YOU.',
    threat:   'extreme',
  },
};

export default function DifficultySelect({ onSelect }: DifficultySelectProps) {
  return (
    <div className="diff-overlay">
      <div className="diff-panel">

        <div className="diff-panel__eyebrow">FLEET COMMAND — CLASSIFIED BRIEFING</div>
        <h1 className="diff-panel__title">SELECT THREAT LEVEL</h1>
        <p className="diff-panel__sub">
          CHOOSE YOUR ADVERSARY. HOVER ANY DESIGNATION FOR FULL INTEL REPORT.
        </p>

        <div className="diff-options">
          {DIFFICULTIES.map((d) => {
            const m = META[d];
            return (
              <button
                key={d}
                className={`diff-option diff-option--${m.threat}`}
                onClick={() => onSelect(d)}
                aria-describedby={`diff-desc-${d}`}
              >
                <div className="diff-option__top">
                  <span className="diff-option__label">{m.label}</span>
                  <span className="diff-option__codename">// {m.codename}</span>
                  <span className="diff-option__arrow">▶</span>
                </div>
                <div className="diff-option__desc" id={`diff-desc-${d}`}>{m.desc}</div>
              </button>
            );
          })}
        </div>

        <p className="diff-panel__footer">
          ◈ DIFFICULTY CANNOT BE CHANGED ONCE ENGAGEMENT BEGINS
        </p>
      </div>
    </div>
  );
}