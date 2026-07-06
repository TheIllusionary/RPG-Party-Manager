import type { ReactNode } from 'react';
import type { Actor } from '../../../types/domain';
import type { UseLocalActorStoreResult } from '../hooks/useLocalActorStore';

interface ActorPanelProps {
  store: UseLocalActorStoreResult;
}

function numberInput(
  fieldKey: string,
  label: string,
  value: number | undefined,
  onChange: (value: number) => void,
): ReactNode {
  return (
    <label key={fieldKey}>
      <span className="dm-dashboard-label">{label}</span>
      <input
        type="number"
        className="dm-dashboard-input"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function ActorPanel({ store }: ActorPanelProps) {
  const { actors, updateActorField, loading } = store;

  if (loading && actors.length === 0) {
    return <p className="dm-dashboard-muted">Carregando atores do NoSQL local…</p>;
  }

  if (actors.length === 0) {
    return (
      <p className="dm-dashboard-alert dm-dashboard-alert--warn">
        Nenhum ator no store. Use &quot;Seed sample&quot; no topo.
      </p>
    );
  }

  return (
    <div className="dm-dashboard-actor-list">
      {actors.map((actor) => (
        <ActorCard
          key={actor.id}
          actor={actor}
          onChange={updateActorField}
        />
      ))}
    </div>
  );
}

interface ActorCardProps {
  actor: Actor;
  onChange: UseLocalActorStoreResult['updateActorField'];
}

function ActorCard({ actor, onChange }: ActorCardProps) {
  const patch = (updater: (a: Actor) => Actor) => onChange(actor.id, updater);

  return (
    <article className="dm-dashboard-card dm-dashboard-actor-card">
      <header className="dm-dashboard-actor-header">
        <div className="dm-dashboard-actor-title">
          <input
            className="dm-dashboard-input dm-dashboard-input--title"
            value={actor.name}
            onChange={(e) => patch((a) => ({ ...a, name: e.target.value }))}
          />
          <p className="dm-dashboard-actor-meta">
            {actor.kind} · <span className="dm-dashboard-mono">{actor.id}</span>
          </p>
        </div>
        <label>
          <span className="dm-dashboard-label">Tipo</span>
          <select
            className="dm-dashboard-input dm-dashboard-input--compact"
            value={actor.kind}
            onChange={(e) =>
              patch((a) => ({ ...a, kind: e.target.value as Actor['kind'] }))
            }
          >
            <option value="player">player</option>
            <option value="npc">npc</option>
            <option value="monster">monster</option>
          </select>
        </label>
      </header>

      <div>
        <p className="dm-dashboard-label dm-dashboard-field-group-title">Atributos</p>
        <div className="dm-dashboard-stat-grid">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) =>
            numberInput(stat, stat.toUpperCase(), actor.stats[stat], (v) =>
              patch((a) => ({
                ...a,
                stats: { ...a.stats, [stat]: v },
              })),
            ),
          )}
        </div>
      </div>

      <div>
        <p className="dm-dashboard-label dm-dashboard-field-group-title">Recursos</p>
        <div className="dm-dashboard-resource-grid">
          {numberInput('hp-current', 'HP atual', actor.resources.hp?.current, (v) =>
            patch((a) => ({
              ...a,
              resources: {
                ...a.resources,
                hp: { ...a.resources.hp, current: v, max: a.resources.hp?.max ?? v },
              },
            })),
          )}
          {numberInput('hp-max', 'HP máx', actor.resources.hp?.max, (v) =>
            patch((a) => ({
              ...a,
              resources: {
                ...a.resources,
                hp: { ...a.resources.hp, current: a.resources.hp?.current ?? v, max: v },
              },
            })),
          )}
          {numberInput('mana-current', 'Mana atual', actor.resources.mana?.current, (v) =>
            patch((a) => ({
              ...a,
              resources: {
                ...a.resources,
                mana: {
                  ...a.resources.mana,
                  current: v,
                  max: a.resources.mana?.max,
                  label: a.resources.mana?.label ?? 'Mana',
                },
              },
            })),
          )}
          {numberInput('level', 'Level', (actor.customAttributes?.level as number) ?? 1, (v) =>
            patch((a) => ({
              ...a,
              customAttributes: { ...a.customAttributes, level: v },
            })),
          )}
        </div>
      </div>

      <div className="dm-dashboard-visibility-grid">
        <label>
          <span className="dm-dashboard-label">HP visibility</span>
          <select
            className="dm-dashboard-input"
            value={actor.visibility.hp}
            onChange={(e) =>
              patch((a) => ({
                ...a,
                visibility: {
                  ...a.visibility,
                  hp: e.target.value as Actor['visibility']['hp'],
                },
              }))
            }
          >
            <option value="visible">visible</option>
            <option value="hidden">hidden</option>
            <option value="approximate">approximate</option>
          </select>
        </label>
        <label>
          <span className="dm-dashboard-label">Conditions (CSV)</span>
          <input
            className="dm-dashboard-input"
            value={(actor.conditions ?? []).join(', ')}
            onChange={(e) =>
              patch((a) => ({
                ...a,
                conditions: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </label>
      </div>

      {actor.dmNotes && (
        <p className="dm-dashboard-dm-notes">
          dmNotes (local): {actor.dmNotes}
        </p>
      )}
      <p className="dm-dashboard-timestamp">updatedAt: {actor.updatedAt}</p>
    </article>
  );
}
