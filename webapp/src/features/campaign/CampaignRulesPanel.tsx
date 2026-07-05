import { useCallback, useMemo, useState } from 'react';
import { Download, ScrollText } from 'lucide-react';

import { dmDashboardBridge } from '../../services/dmDashboardBridge';
import { TRIGGER_FRIENDLY_MAP } from '../../shared/schema/SchemaResolver';
import {
  filterActiveLogicBlocks,
  mergeLogicBlocksById,
} from '../../shared/utils/logicBlockUtils';
import {
  CASTING_MODE_CONTROLLED_RULE_IDS,
  getCampaignCastingMode,
  MANA_CASTING_RULE_ID,
  setCampaignCastingMode,
  type CampaignCastingMode,
} from '../../shared/utils/castingSystem';
import type { LogicBlock } from '../../types/domain';
import type { ICampaignRulesPanelProps } from '../../types/campaign';

import './CampaignRulesPanel.css';

function triggerLabel(trigger: string): string {
  return TRIGGER_FRIENDLY_MAP[trigger] ?? trigger;
}

function RuleCard({
  block,
  onToggle,
  castingModeControlled,
}: {
  block: LogicBlock;
  onToggle: (id: string) => void;
  castingModeControlled?: boolean;
}) {
  const hasCompute = Boolean(block.compute);
  const hasEffects = (block.effects?.length ?? 0) > 0;

  return (
    <article className={`campaign-rule-card ${block.enabled ? 'is-enabled' : 'is-disabled'}`}>
      <div className="campaign-rule-card__main">
        <h3 className="campaign-rule-card__title">{block.name}</h3>
        {block.description && (
          <p className="campaign-rule-card__description">{block.description}</p>
        )}
        <div className="campaign-rule-card__meta">
          <span className="campaign-rule-pill">{triggerLabel(block.trigger)}</span>
          {hasCompute && <span className="campaign-rule-pill campaign-rule-pill--muted">Fórmula</span>}
          {hasEffects && <span className="campaign-rule-pill campaign-rule-pill--muted">Efeitos</span>}
          {(block.conditions?.length ?? 0) > 0 && (
            <span className="campaign-rule-pill campaign-rule-pill--muted">
              {block.conditions!.length} condição(ões)
            </span>
          )}
        </div>
      </div>

      {castingModeControlled ? (
        <span className="campaign-rule-pill campaign-rule-pill--mode" title="Controlado pelo seletor Mana / Spell Slots acima">
          {block.id === MANA_CASTING_RULE_ID
            ? block.enabled
              ? 'Mana ativo'
              : 'Inativo'
            : block.enabled
              ? 'Spell Slots ativo'
              : 'Inativo'}
        </span>
      ) : (
      <label className="campaign-rule-toggle" title={block.enabled ? 'Desativar regra' : 'Ativar regra'}>
        <input
          type="checkbox"
          checked={block.enabled}
          onChange={() => onToggle(block.id)}
        />
        <span className="campaign-rule-toggle__track" aria-hidden />
        <span className="sr-only">{block.enabled ? 'Ativa' : 'Inativa'}</span>
      </label>
      )}
    </article>
  );
}

export default function CampaignRulesPanel({
  logicBlocks,
  updateLogicBlocks,
}: ICampaignRulesPanelProps) {
  const [importMessage, setImportMessage] = useState('');
  const [importing, setImporting] = useState(false);

  const electronAvailable = dmDashboardBridge.isAvailable();
  const visibleBlocks = useMemo(
    () => filterActiveLogicBlocks(logicBlocks ?? []),
    [logicBlocks],
  );
  const enabledCount = visibleBlocks.filter((block) => block.enabled).length;
  const castingMode = getCampaignCastingMode(logicBlocks);

  const setCastingMode = useCallback(
    (mode: CampaignCastingMode) => {
      updateLogicBlocks(setCampaignCastingMode(logicBlocks ?? [], mode));
    },
    [logicBlocks, updateLogicBlocks],
  );

  const toggleBlock = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      updateLogicBlocks(
        (logicBlocks ?? []).map((block) =>
          block.id === id
            ? { ...block, enabled: !block.enabled, updatedAt: now }
            : block,
        ),
      );
    },
    [logicBlocks, updateLogicBlocks],
  );

  const handleImportFromDashboard = async () => {
    if (!electronAvailable) return;
    setImporting(true);
    setImportMessage('');
    try {
      const dashboardBlocks = await dmDashboardBridge.listLogicBlocks();
      const activeDashboard = filterActiveLogicBlocks(dashboardBlocks);
      if (activeDashboard.length === 0) {
        setImportMessage('Nenhuma regra encontrada no DM Dashboard.');
        return;
      }
      const merged = mergeLogicBlocksById(logicBlocks, activeDashboard);
      updateLogicBlocks(merged);
      setImportMessage(`${activeDashboard.length} regra(s) importada(s) do DM Dashboard.`);
    } catch (err) {
      console.error(err);
      setImportMessage('Falha ao importar regras do DM Dashboard.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="campaign-rules-panel">
      <header className="campaign-rules-header glass-panel">
        <div className="campaign-rules-header__text">
          <h2 className="campaign-rules-title">
            <ScrollText size={22} aria-hidden />
            Regras da campanha
          </h2>
          <p className="campaign-rules-subtitle">
            Ative ou desative regras homebrew para esta campanha. A criação e edição completa
            ficam no DM Dashboard (tela de campanhas).
          </p>
        </div>
        <div className="campaign-rules-header__actions">
          {electronAvailable && (
            <button
              type="button"
              className="btn btn-secondary campaign-rules-import-btn"
              onClick={handleImportFromDashboard}
              disabled={importing}
            >
              <Download size={16} aria-hidden />
              {importing ? 'Importando…' : 'Importar do DM Dashboard'}
            </button>
          )}
          <p className="campaign-rules-stats" aria-live="polite">
            <strong>{enabledCount}</strong> ativa(s) · <strong>{visibleBlocks.length}</strong> total
          </p>
        </div>
      </header>

      <div className="casting-system-toggle glass-panel" role="group" aria-label="Sistema de conjuração">
        <div className="casting-system-toggle__text">
          <strong>Sistema de conjuração</strong>
          <span>Escolha um — mana homebrew ou spell slots D&amp;D 5e (só conjuradores). Fadiga é regra separada (só mana).</span>
        </div>
        <div className="casting-system-toggle__buttons">
          <button
            type="button"
            className={`casting-system-btn ${castingMode === 'mana' ? 'is-active' : ''}`}
            aria-pressed={castingMode === 'mana'}
            onClick={() => setCastingMode('mana')}
          >
            ✦ Mana
          </button>
          <button
            type="button"
            className={`casting-system-btn ${castingMode === 'spell_slots' ? 'is-active' : ''}`}
            aria-pressed={castingMode === 'spell_slots'}
            onClick={() => setCastingMode('spell_slots')}
          >
            📜 Spell Slots
          </button>
        </div>
      </div>

      {importMessage && (
        <p className="campaign-rules-flash" role="status">
          {importMessage}
        </p>
      )}

      {visibleBlocks.length === 0 ? (
        <div className="campaign-rules-empty glass-panel">
          <ScrollText size={40} strokeWidth={1.2} aria-hidden />
          <p>Nenhuma regra nesta campanha.</p>
          {electronAvailable ? (
            <p className="text-secondary">
              Crie regras no DM Dashboard e use &quot;Importar do DM Dashboard&quot; acima,
              ou aguarde a sincronização automática.
            </p>
          ) : (
            <p className="text-secondary">
              No app Electron, importe regras do DM Dashboard. Na web, exporte/importe o JSON da campanha.
            </p>
          )}
        </div>
      ) : (
        <ul className="campaign-rules-list">
          {visibleBlocks.map((block) => (
            <li key={block.id}>
              <RuleCard
                block={block}
                onToggle={toggleBlock}
                castingModeControlled={CASTING_MODE_CONTROLLED_RULE_IDS.has(block.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
