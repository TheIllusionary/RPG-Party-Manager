import './BlockEditor.css';

import { Edit2, Plus, Save, Trash2 } from 'lucide-react';

import type { Actor } from '../../types/domain';

import VerticalBlockBuilder from './VerticalBlockBuilder';
import { useRulesEditor } from './useRulesEditor';

export interface BlockEditorProps {
  actors: Actor[];
}

export default function BlockEditor({ actors }: BlockEditorProps) {
  const editor = useRulesEditor({ actors });

  return (
    <div className="rules-editor">
      <div className="rules-editor-header">
        <div className="rules-editor-title-block">
          <h3 className="rules-editor-title">Editor de Regras</h3>
          <p className="rules-editor-subtitle">
            Vertical Block Builder — monte fórmulas em passos, sem caminhos técnicos.
          </p>
        </div>
        <div className="rules-editor-status">
          {editor.saving && <span className="rules-editor-saving">Salvando…</span>}
          {editor.saveError && <span className="rules-editor-error">{editor.saveError}</span>}
        </div>
      </div>

      <div className="rules-editor-layout">
        <aside className="rules-editor-sidebar">
          <div className="rules-editor-sidebar-header">
            <h4 className="rules-editor-sidebar-title">Suas regras</h4>
            <button type="button" className="btn btn-primary btn-with-icon" onClick={editor.addBlock}>
              <Plus className="icon-sm" aria-hidden />
              Nova
            </button>
          </div>

          <div className="rules-editor-list">
            {editor.blocks.length === 0 && (
              <p className="rules-editor-list-empty">Nenhuma regra criada.</p>
            )}
            {editor.blocks.map((block) => {
              const active = block.id === editor.selectedBlockId;
              return (
                <div
                  key={block.id}
                  className={`rules-editor-list-item${active ? ' rules-editor-list-item--active' : ''}`}
                >
                  <button
                    type="button"
                    className="rules-editor-list-select"
                    onClick={() => editor.selectBlock(block.id)}
                  >
                    <span className="rules-editor-list-name">{block.name}</span>
                    {block.description && (
                      <span className="rules-editor-list-desc">{block.description}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="rules-editor-icon-btn"
                    onClick={() => editor.selectBlock(block.id)}
                    aria-label={`Editar ${block.name}`}
                  >
                    <Edit2 className="icon-sm" />
                  </button>
                  <button
                    type="button"
                    className="rules-editor-icon-btn rules-editor-icon-btn--danger"
                    onClick={() => editor.deleteBlock(block.id)}
                    aria-label={`Excluir ${block.name}`}
                  >
                    <Trash2 className="icon-sm" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="rules-editor-main">
          {editor.selectedBlock ? (
            <>
              <div className="app-button-row app-button-row--end">
                <button
                  type="button"
                  className="btn btn-primary btn-with-icon"
                  onClick={() => void editor.saveNow()}
                  disabled={editor.saving}
                >
                  <Save className="icon-sm" aria-hidden />
                  Salvar regra
                </button>
              </div>

              <VerticalBlockBuilder
                block={editor.selectedBlock}
                draft={editor.draft}
                onDraftChange={editor.updateDraft}
                onMetaChange={editor.updateBlockMeta}
              />

              <div className="rules-editor-preview">
                <h4 className="rules-editor-preview-title">Pré-visualização</h4>
                <div className="rules-editor-table-wrap">
                  <table className="rules-debug-table">
                    <thead>
                      <tr>
                        <th>Actor</th>
                        <th>Resultado</th>
                        <th>Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editor.previewRows.map((row, index) => (
                        <tr key={`${row.actorId}-${index}`}>
                          <td>{row.actorName}</td>
                          <td className="rules-debug-result">
                            {row.result !== null ? row.result : '—'}
                          </td>
                          <td className={row.skipped ? 'rules-debug-skipped' : 'rules-debug-error'}>
                            {row.skipped
                              ? 'N/A (condição não atendida)'
                              : row.error ?? ''}
                          </td>
                        </tr>
                      ))}
                      {editor.previewRows.length === 0 && (
                        <tr>
                          <td colSpan={3} className="rules-debug-skipped">
                            Sem atores — use Seed sample no dashboard.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rules-editor-empty">
              <p>
                Selecione uma regra na lista ou crie uma nova para editar a fórmula em blocos
                verticais.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
