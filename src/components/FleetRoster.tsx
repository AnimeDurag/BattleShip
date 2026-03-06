import { Ship } from '../models/types';
import { FLEET } from '../utils/constants';

interface FleetRosterProps {
  ships: Ship[];
  label: string;
  enemy?: boolean;
}

export default function FleetRoster({ ships, label, enemy = false }: FleetRosterProps) {
  return (
    <div className="fleet-roster">
      <div className="panel__title">{label}</div>

      {FLEET.map(def => {
        const ship     = ships.find(s => s.name === def.name);
        const sunk     = ship?.sunk ?? false;
        const hitCount = ship?.hits.size ?? 0;

        return (
          <div key={def.name} className={`fleet-roster__ship${sunk ? ' fleet-roster__ship--sunk' : ''}`}>
            <span className="fleet-roster__name">{def.name}</span>

            <div className="fleet-roster__blocks">
              {Array.from({ length: def.size }).map((_, i) => {
                let mod = '';
                if (sunk)           mod = 'fleet-roster__block--sunk';
                else if (i < hitCount) mod = 'fleet-roster__block--hit';
                return <div key={i} className={`fleet-roster__block ${mod}`} />;
              })}
            </div>

            {/* Show earned hit data on enemy fleet, full unknown only before any hits */}
            {enemy && !sunk && hitCount === 0 && (
              <span className="fleet-roster__status fleet-roster__status--unknown">UNKNOWN</span>
            )}
            {enemy && !sunk && hitCount > 0 && (
              <span className="fleet-roster__status fleet-roster__status--hit">
                {hitCount}/{def.size} HIT
              </span>
            )}
            {sunk && (
              <span className="fleet-roster__status fleet-roster__status--sunk">SUNK</span>
            )}
          </div>
        );
      })}
    </div>
  );
}