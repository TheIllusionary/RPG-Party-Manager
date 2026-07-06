import type { IDmRuleEvaluationRow } from '../../../types/dashboard';
import type { UseLocalActorStoreResult } from '../hooks/useLocalActorStore';
import { MANA_MAX_RULE } from '../constants/dashboardDefaults';

interface RuleDebugConsoleProps {
  store: UseLocalActorStoreResult;
}

export default function RuleDebugConsole({ store }: RuleDebugConsoleProps) {
  const { ruleRows } = store;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="rounded-lg border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
        <p className="font-medium text-slate-100">Bloco: {MANA_MAX_RULE.name}</p>
        <p className="mt-2 leading-relaxed text-slate-400">
          Mana = (CON × 2) + Level · só aplica a <strong className="text-slate-200">player</strong>
        </p>
        <p className="mt-1 font-mono text-xs text-emerald-400/90">
          actor.stats.con · actor.customAttributes.level
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-700">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead className="sticky top-0 bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">Nota</th>
            </tr>
          </thead>
          <tbody>
            {ruleRows.map((row, index) => (
              <RuleRow key={`${row.actorId}-${row.blockId}-${index}`} row={row} />
            ))}
          </tbody>
        </table>
        {ruleRows.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Sem atores para avaliar.</p>
        )}
      </div>

      <pre className="max-h-36 overflow-auto rounded-lg border border-slate-800 bg-black/50 p-3 text-[11px] leading-relaxed text-slate-500">
        {JSON.stringify(MANA_MAX_RULE, null, 2)}
      </pre>
    </div>
  );
}

function RuleRow({ row }: { row: IDmRuleEvaluationRow }) {
  const note = row.skipped
    ? 'N/A (regra só para players)'
    : row.error ?? '';

  return (
    <tr className="border-t border-slate-800 hover:bg-slate-900/40">
      <td className="px-4 py-3 text-slate-100">{row.actorName}</td>
      <td className="px-4 py-3 font-mono text-base text-emerald-400">
        {row.result !== null ? row.result : '—'}
      </td>
      <td className={`px-4 py-3 text-sm ${row.skipped ? 'text-slate-500' : 'text-rose-400'}`}>
        {note}
      </td>
    </tr>
  );
}
