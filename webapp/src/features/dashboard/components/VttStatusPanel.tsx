import type { UseLocalActorStoreResult } from '../hooks/useLocalActorStore';

interface VttStatusPanelProps {
  store: UseLocalActorStoreResult;
}

export default function VttStatusPanel({ store }: VttStatusPanelProps) {
  const { vttStatus, syncStatus, actors, simulateBroadcast, lastBroadcast } = store;

  const wsOnline = vttStatus?.running ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <section className="dm-dashboard-card space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          WebSocket Player View
        </h3>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ${wsOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-600'}`}
            title={wsOnline ? 'Servidor ativo' : 'Offline'}
          />
          <span className="text-sm font-medium text-slate-100">
            {wsOnline ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        {vttStatus && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">URL</dt>
            <dd className="col-span-1 break-all font-mono text-xs text-slate-300">
              {vttStatus.url}
            </dd>
            <dt className="text-slate-500">Clientes</dt>
            <dd className="font-mono text-slate-100">{vttStatus.clientCount}</dd>
          </dl>
        )}
      </section>

      <section className="dm-dashboard-card space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          SyncService
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">isDirty</dt>
          <dd className={syncStatus?.isDirty ? 'text-amber-400' : 'text-emerald-400'}>
            {syncStatus?.isDirty ? 'sim' : 'não'}
          </dd>
          <dt className="text-slate-500">Erro</dt>
          <dd className="col-span-1 break-words text-xs text-rose-300">
            {syncStatus?.meta.lastSyncError ?? '—'}
          </dd>
        </dl>
      </section>

      <section className="dm-dashboard-card min-h-0 flex-1 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Simular broadcast
        </h3>
        <p className="text-sm leading-relaxed text-slate-500">
          Envia DTO sanitizado para clientes Owlbear conectados.
        </p>
        <div className="flex flex-col gap-2">
          {actors.map((actor, index) => (
            <button
              key={`${actor.id}-broadcast-${index}`}
              type="button"
              className="dm-dashboard-btn border border-indigo-700/60 bg-indigo-950/40 text-left text-sm text-indigo-100 hover:bg-indigo-900/50"
              onClick={() => void simulateBroadcast(actor.id)}
            >
              Broadcast: {actor.name}
            </button>
          ))}
        </div>
      </section>

      {lastBroadcast && (
        <pre className="max-h-44 overflow-auto rounded-lg border border-slate-800 bg-black/50 p-3 text-[11px] leading-relaxed text-emerald-300/90">
          {JSON.stringify(lastBroadcast, null, 2)}
        </pre>
      )}
    </div>
  );
}
