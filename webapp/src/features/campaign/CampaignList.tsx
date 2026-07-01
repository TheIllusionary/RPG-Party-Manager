import { useState, useEffect, useRef } from 'react';
import { listCampaigns, createCampaign, updateCampaignData, updateCampaign } from '../../services/api';
import { mergeCampaignData, toApiPayload, DEFAULT_DATA } from '../../data/defaultData';
import { normalizeImportedData } from '../../shared/utils/migrationUtils';

function unwrapLegacySave(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  if (parsed.players || parsed.equipment) return parsed;
  if (parsed.data && typeof parsed.data === 'object') return parsed.data;
  if (parsed.partyManagerData && typeof parsed.partyManagerData === 'object') return parsed.partyManagerData;
  return parsed;
}

function isValidLegacySave(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return Array.isArray(data.players) || (data.equipment && typeof data.equipment === 'object');
}

export default function CampaignList({ user, onSelectCampaign, onLogout }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const importRef = useRef(null);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await listCampaigns();
      setCampaigns(list);
    } catch (err) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim() || 'Nova Campanha';
    setCreating(true);
    setError('');

    try {
      const result = await createCampaign({ name });
      setNewName('');
      await loadCampaigns();
      onSelectCampaign(result.campaign);
    } catch (err) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleImportLegacy = (e) => {
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
      } catch (err) {
        setError(err.message || 'Failed to import campaign');
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

  const startRename = (campaign, e) => {
    e.stopPropagation();
    setEditingId(campaign._id);
    setEditingName(campaign.name);
  };

  const commitRename = async (campaignId) => {
    const trimmed = editingName.trim();
    setEditingId(null);
    if (!trimmed) return;

    const current = campaigns.find((c) => c._id === campaignId);
    if (!current || current.name === trimmed) return;

    try {
      const updated = await updateCampaign(campaignId, { name: trimmed });
      setCampaigns((prev) => prev.map((c) => (c._id === campaignId ? { ...c, ...updated } : c)));
    } catch (err) {
      setError(err.message || 'Failed to rename campaign');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const busy = creating || importing;

  return (
    <div className="container" style={{ maxWidth: '720px', margin: '0 auto', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>Campaigns</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user?.username}</strong>
          </p>
        </div>
        <button className="btn" type="button" onClick={onLogout} style={{ background: 'transparent', border: 'var(--glass-border)' }}>
          Logout
        </button>
      </div>

      <form onSubmit={handleCreate} className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            New campaign name
          </label>
          <input
            className="input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nova Campanha"
            style={{ width: '100%' }}
            disabled={busy}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn" type="submit" disabled={busy}>
            {creating ? 'Creating...' : '+ Create'}
          </button>
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => importRef.current?.click()}
            style={{ background: 'transparent', border: 'var(--glass-border)' }}
          >
            Importar JSON
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleImportLegacy}
        />
      </form>

      {importing && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--primary)', fontSize: '0.95rem' }}>
            Importando e salvando na nuvem...
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            No campaigns yet. Create one above or import a legacy JSON save.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {campaigns.map((campaign) => (
            <div
              key={campaign._id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                border: 'var(--glass-border)',
                background: 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => onSelectCampaign(campaign)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: 'inherit',
                  }}
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
                      style={{ fontSize: '1.1rem', fontWeight: 600, width: '100%' }}
                    />
                  ) : (
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{campaign.name}</h3>
                  )}
                  {campaign.description && (
                    <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {campaign.description}
                    </p>
                  )}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {editingId !== campaign._id && (
                    <button
                      type="button"
                      className="btn"
                      onClick={(e) => startRename(campaign, e)}
                      title="Rename campaign"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: 'var(--glass-border)' }}
                    >
                      ✎
                    </button>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {formatDate(campaign.lastAccessed)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
