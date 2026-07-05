import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { listCampaigns, createCampaign, updateCampaignData, updateCampaign, deleteCampaign } from '../../services/campaignBridge';
import { mergeCampaignData, toApiPayload, DEFAULT_DATA } from '../../data/defaultData';
import { normalizeImportedData } from '../../shared/utils/migrationUtils';
import AppNavBar from '../../shared/components/AppNavBar';
import RootLayout from '../../shared/components/RootLayout';
import type { ICampaign, ICampaignListItem } from '../../types';
import type { ICampaignListProps } from '../../types/campaign';
import type { IAppData } from '../../types';

import './CampaignList.css';

function unwrapLegacySave(parsed: unknown): Partial<IAppData> | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (record.players || record.equipment) return record as Partial<IAppData>;
  if (record.data && typeof record.data === 'object') return record.data as Partial<IAppData>;
  if (record.partyManagerData && typeof record.partyManagerData === 'object') {
    return record.partyManagerData as Partial<IAppData>;
  }
  return record as Partial<IAppData>;
}

function isValidLegacySave(data: Partial<IAppData> | null): data is Partial<IAppData> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return Array.isArray(data.players) || (data.equipment !== undefined && typeof data.equipment === 'object');
}

export default function CampaignList({ user, onSelectCampaign, onLogout, onOpenDashboard }: ICampaignListProps) {
  const [campaigns, setCampaigns] = useState<ICampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await listCampaigns();
      const unique = list.filter(
        (campaign, index, arr) => arr.findIndex((c) => c._id === campaign._id) === index,
      );
      setCampaigns(unique);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newName.trim() || 'Nova Campanha';
    setCreating(true);
    setError('');

    try {
      const result = await createCampaign({ name });
      setNewName('');
      await loadCampaigns();
      onSelectCampaign(result.campaign);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleImportLegacy = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImporting(true);
        setError('');

        const parsed = JSON.parse(String(evt.target?.result ?? ''));
        const saveData = unwrapLegacySave(parsed);

        if (!isValidLegacySave(saveData)) {
          throw new Error('Invalid save file: expected a JSON with "players" or "equipment".');
        }

        const normalized = normalizeImportedData(saveData, DEFAULT_DATA);
        const merged = mergeCampaignData(normalized);

        const result = await createCampaign({
          name: 'Campanha Importada',
          description: 'Migrada do JSON antigo',
        });

        const campaignId = result.campaign._id;
        await updateCampaignData(campaignId, toApiPayload(merged));
        await loadCampaigns();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to import campaign');
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
      setImporting(false);
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  const startRename = (campaign: ICampaign, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(campaign._id);
    setEditingName(campaign.name);
  };

  const commitRename = async (campaignId: string) => {
    const trimmed = editingName.trim();
    setEditingId(null);
    if (!trimmed) return;

    const current = campaigns.find((c) => c._id === campaignId);
    if (!current || current.name === trimmed) return;

    try {
      const updated = await updateCampaign(campaignId, { name: trimmed });
      setCampaigns((prev) => prev.map((c) => (c._id === campaignId ? { ...c, ...updated } : c)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rename campaign');
    }
  };

  const handleDelete = async (campaign: ICampaignListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${campaign.name}"? All party data will be permanently removed.`)) {
      return;
    }

    setDeletingId(campaign._id);
    setError('');

    try {
      await deleteCampaign(campaign._id);
      if (localStorage.getItem('partyManagerLastCampaignId') === campaign._id) {
        localStorage.removeItem('partyManagerLastCampaignId');
      }
      setCampaigns((prev) => prev.filter((c) => c._id !== campaign._id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const busy = creating || importing || deletingId !== null;

  return (
    <RootLayout
      header={
        <AppNavBar
          title="Campaigns"
          crumbs={[{ label: 'Home' }]}
          actions={
            <>
              {onOpenDashboard && (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={onOpenDashboard}
                >
                  DM Dashboard
                </button>
              )}
              <button className="btn" type="button" onClick={onLogout}>
                Logout
              </button>
            </>
          }
        />
      }
    >
      <div className="campaign-list">
        <p className="campaign-list-intro text-sm text-secondary">
          Signed in as <strong className="text-primary">{user?.username}</strong>
        </p>

        <form onSubmit={handleCreate} className="campaign-create-form glass-panel">
          <div className="campaign-field">
            <label htmlFor="campaign-new-name">New campaign name</label>
            <input
              id="campaign-new-name"
              className="input"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nova Campanha"
              disabled={busy}
            />
          </div>
          <div className="campaign-form-actions app-button-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => importRef.current?.click()}
            >
              Importar JSON
            </button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="u-hidden"
            onChange={handleImportLegacy}
          />
        </form>

        {importing && (
          <div className="campaign-status glass-panel">
            <p className="m-0 text-sm text-success">
              Importando e salvando na nuvem...
            </p>
          </div>
        )}

        {error && <p className="campaign-error">{error}</p>}

        {loading ? (
          <div className="campaign-loading glass-panel">
            <p className="text-secondary">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="campaign-empty glass-panel">
            <p className="text-secondary">
              No campaigns yet. Create one above or import a legacy JSON save.
            </p>
          </div>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <article key={campaign._id} className="campaign-card glass-panel">
                <div className="campaign-card-body">
                  <button
                    type="button"
                    className="campaign-card-select"
                    onClick={() => onSelectCampaign(campaign)}
                  >
                    {editingId === campaign._id ? (
                      <input
                        className="input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => commitRename(campaign._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(campaign._id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(ev) => ev.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <h3 className="campaign-card-title">{campaign.name}</h3>
                    )}
                    {campaign.description && (
                      <p className="campaign-card-desc">{campaign.description}</p>
                    )}
                  </button>
                </div>
                <footer className="campaign-card-footer">
                  {editingId !== campaign._id && (
                    <>
                      <button
                        type="button"
                        className="btn app-icon-btn"
                        onClick={(e) => startRename(campaign, e)}
                        title="Rename campaign"
                        disabled={deletingId === campaign._id}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger app-icon-btn"
                        onClick={(e) => handleDelete(campaign, e)}
                        title="Delete campaign"
                        disabled={deletingId === campaign._id}
                      >
                        {deletingId === campaign._id ? '…' : '🗑️'}
                      </button>
                    </>
                  )}
                  <span className="campaign-card-date">{formatDate(campaign.lastAccessed)}</span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </RootLayout>
  );
}
