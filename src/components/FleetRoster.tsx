import React from 'react';
import { Ship } from '../models/types';
import { FLEET } from '../utils/constants';

interface FleetRosterProps {
  ships: Ship[];
  label: string;
  enemy?: boolean;
  compact?: boolean;  // horizontal strip layout for mobile
}

export default function FleetRoster({ ships, label, enemy = false, compact = false }: FleetRosterProps) {
  if (compact) {
    return (
      <div className="fleet-roster fleet-roster--compact">
        <div className="panel__title fleet-roster--compact__label">{label}</div>
        <ul className="fleet-roster--compact__ships" aria-label={`${label} status`}>
          {FLEET.map(def => {
            const ship     = ships.find(s => s.name === def.name);
            const sunk     = ship?.sunk ?? false;
            const hitCount = ship?.hits.size ?? 0;
            return (
              <li
                key={def.name}
                className={[
                  'fleet-roster__ship',
                  `fleet-roster__ship--${def.name.toLowerCase()}`,
                  sunk ? 'fleet-roster__ship--sunk' : '',
                ].filter(Boolean).join(' ')}
                aria-label={`${def.name} — ${sunk ? 'sunk' : 'afloat'}`}
              >
                <span className="fleet-roster__name">{def.name}</span>
                <div className="fleet-roster__blocks">
                  {Array.from({ length: def.size }).map((_, i) => {
                    let mod = '';
                    if (sunk)              mod = 'fleet-roster__block--sunk';
                    else if (i < hitCount) mod = 'fleet-roster__block--hit';
                    return <div key={i} className={`fleet-roster__block ${mod}`} />;
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="fleet-roster">
      <div className="panel__title">{label}</div>

      <ul aria-label={`${label} status`}>
        {FLEET.map(def => {
          const ship     = ships.find(s => s.name === def.name);
          const sunk     = ship?.sunk ?? false;
          const hitCount = ship?.hits.size ?? 0;
          // Enemy ships with zero hits are "unknown" — show no block symbols at all.
          // Once any cell is hit (or the ship is sunk), reveal the block display.
          const contacted = hitCount > 0 || sunk;

          return (
            <li
              key={def.name}
              className={[
                'fleet-roster__ship',
                `fleet-roster__ship--${def.name.toLowerCase()}`,
                sunk ? 'fleet-roster__ship--sunk' : '',
              ].filter(Boolean).join(' ')}
              aria-label={`${def.name} — ${sunk ? 'sunk' : 'afloat'}`}
            >
              <span className="fleet-roster__name">{def.name}</span>

              {/* Blocks: always shown for player ships; hidden for untouched enemy ships */}
              {(!enemy || contacted) && (
                <div className="fleet-roster__blocks">
                  {Array.from({ length: def.size }).map((_, i) => {
                    let mod = '';
                    if (sunk)              mod = 'fleet-roster__block--sunk';
                    else if (i < hitCount) mod = 'fleet-roster__block--hit';
                    return <div key={i} className={`fleet-roster__block ${mod}`} />;
                  })}
                </div>
              )}

              {sunk && (
                <span className="fleet-roster__status fleet-roster__status--sunk">SUNK</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
