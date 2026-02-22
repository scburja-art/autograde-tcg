import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Credits {
  scan: { used: number; limit: number; remaining: number };
  pregrade: { used: number; limit: number; remaining: number };
}

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  is_read: 0 | 1;
  created_at: string;
  card_name: string | null;
}

interface TradeIntent {
  id: string;
  card_id: string;
  intent_type: string;
  card_name: string;
  set_code: string;
  rarity: string | null;
}

interface TradeMatch {
  myIntent: { card_id: string; intent_type: string };
  matchedUser: { username: string };
  matchedCard: { name: string; set_code: string };
  matchType: string;
}

interface SearchCard {
  id: string;
  name: string;
  number: string | null;
  set_name: string;
  set_code: string;
}

type Section = 'alerts' | 'trades' | null;

const ALERT_ICONS: Record<string, string> = {
  price_spike: '📈',
  portfolio_change: '💼',
  roi_opportunity: '💰',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// --- Add Trade Intent Modal ---

function AddIntentModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchCard | null>(null);
  const [intentType, setIntentType] = useState<'available_for_trade' | 'looking_for'>('looking_for');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/cards', { params: { search: query, limit: 15 } });
        setResults(res.data.data);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post('/trade-intents', { cardId: selected.id, intentType });
      onAdded();
      onClose();
    } catch (err) {
      console.error('Failed to create trade intent:', err);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }} onClick={onClose}>
      <div style={{ backgroundColor: '#16213e', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px', borderBottom: '1px solid #0f3460', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Add Trade Intent</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8899aa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {!selected ? (
          <>
            <div style={{ padding: '12px 16px' }}>
              <input
                type="text"
                placeholder="Search for a card..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
              {loading && <p style={{ color: '#8899aa', textAlign: 'center', padding: '20px' }}>Searching...</p>}
              {results.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelected(card)}
                  style={{ padding: '10px 0', borderBottom: '1px solid #0f3460', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{card.name}</div>
                  <div style={{ fontSize: '12px', color: '#8899aa' }}>{card.set_name} · {card.number}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ padding: '16px' }}>
            <div style={{ backgroundColor: '#1a1a2e', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{selected.name}</div>
              <div style={{ fontSize: '12px', color: '#8899aa' }}>{selected.set_name} · {selected.number}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {([['looking_for', 'I want this'] as const, ['available_for_trade', 'I have this'] as const]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setIntentType(val)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    backgroundColor: intentType === val ? '#e94560' : '#1a1a2e',
                    color: intentType === val ? '#fff' : '#8899aa',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSelected(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #0f3460', backgroundColor: 'transparent', color: '#8899aa', fontSize: '15px', cursor: 'pointer' }}>Back</button>
              <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#e94560', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Adding...' : 'Add Intent'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Matches Modal ---

function MatchesModal({ matches, onClose }: { matches: TradeMatch[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: '#16213e', borderRadius: '16px', width: '100%', maxWidth: '420px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px', borderBottom: '1px solid #0f3460', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Trade Matches</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8899aa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {matches.length === 0 ? (
            <p style={{ color: '#8899aa', textAlign: 'center', padding: '20px' }}>No matches found yet. Add more intents to find traders!</p>
          ) : matches.map((m, i) => (
            <div key={i} style={{ backgroundColor: '#1a1a2e', borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{m.matchedCard.name}</div>
              <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '6px' }}>{m.matchedCard.set_code}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: m.matchType === 'they_have' ? '#4caf50' : '#2196f3' }}>
                  {m.matchType === 'they_have' ? 'They have it' : 'They want it'}
                </span>
                <span style={{ fontSize: '12px', color: '#8899aa' }}>@{m.matchedUser.username}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Collapsible Section ---

function SectionHeader({ title, icon, open, onToggle, count }: { title: string; icon: string; open: boolean; onToggle: () => void; count?: number }) {
  return (
    <button
      onClick={onToggle}
      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: '#16213e', borderRadius: open ? '12px 12px 0 0' : '12px', border: 'none', color: '#eee', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '12px' }}
    >
      <span>{icon} {title}{count != null ? ` (${count})` : ''}</span>
      <span style={{ color: '#8899aa', fontSize: '18px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
    </button>
  );
}

// --- Main More Page ---

export default function MorePage() {
  const { user, logout } = useAuth();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [intents, setIntents] = useState<TradeIntent[]>([]);
  const [matches, setMatches] = useState<TradeMatch[] | null>(null);
  const [openSection, setOpenSection] = useState<Section>('alerts');
  const [showAddIntent, setShowAddIntent] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadCredits = useCallback(async () => {
    try { const r = await api.get('/credits'); setCredits(r.data); } catch { /* ignore */ }
  }, []);

  const loadAlerts = useCallback(async () => {
    try { const r = await api.get('/alerts', { params: unreadOnly ? { unread: 'true' } : {} }); setAlerts(r.data); } catch { /* ignore */ }
  }, [unreadOnly]);

  const loadIntents = useCallback(async () => {
    try { const r = await api.get('/trade-intents'); setIntents(r.data); } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCredits(); loadAlerts(); loadIntents(); }, [loadCredits, loadAlerts, loadIntents]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/read`);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: 1 } : a));
    } catch { /* ignore */ }
  };

  const deleteIntent = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/trade-intents/${id}`);
      setIntents((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const viewMatches = async () => {
    try {
      const r = await api.get('/trade-intents/matches');
      setMatches(r.data);
    } catch { /* ignore */ }
  };

  const toggleSection = (s: Section) => setOpenSection(openSection === s ? null : s);

  const filteredAlerts = alerts;
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div>
      {/* User Info */}
      <div style={{ backgroundColor: '#16213e', borderRadius: '12px', padding: '20px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>{user?.username}</div>
            <div style={{ fontSize: '13px', color: '#8899aa' }}>{user?.email}</div>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, backgroundColor: '#0f3460', color: '#8899aa' }}>
            Free
          </span>
        </div>
        {credits && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, backgroundColor: '#1a1a2e', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', color: '#8899aa', marginBottom: '2px' }}>Scans</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{credits.scan.limit >= 999999 ? 'Unlimited' : <>{credits.scan.remaining}<span style={{ fontSize: '12px', color: '#8899aa' }}> / {credits.scan.limit}</span></>}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#1a1a2e', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '11px', color: '#8899aa', marginBottom: '2px' }}>Pre-grades</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{credits.pregrade.limit >= 999999 ? 'Unlimited' : <>{credits.pregrade.remaining}<span style={{ fontSize: '12px', color: '#8899aa' }}> / {credits.pregrade.limit}</span></>}</div>
            </div>
          </div>
        )}
      </div>

      {/* Alerts Section */}
      <SectionHeader title="Alerts" icon="🔔" open={openSection === 'alerts'} onToggle={() => toggleSection('alerts')} count={unreadCount} />
      {openSection === 'alerts' && (
        <div style={{ backgroundColor: '#16213e', borderRadius: '0 0 12px 12px', padding: '12px 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer', backgroundColor: unreadOnly ? '#e94560' : '#1a1a2e', color: unreadOnly ? '#fff' : '#8899aa' }}
            >
              Unread only
            </button>
          </div>
          {filteredAlerts.length === 0 ? (
            <p style={{ color: '#8899aa', textAlign: 'center', padding: '16px', fontSize: '13px' }}>No alerts</p>
          ) : filteredAlerts.map((a) => (
            <div
              key={a.id}
              onClick={() => !a.is_read && markRead(a.id)}
              style={{ padding: '10px 12px', marginBottom: '6px', borderRadius: '8px', backgroundColor: '#1a1a2e', cursor: a.is_read ? 'default' : 'pointer', borderLeft: a.is_read ? '3px solid transparent' : '3px solid #e94560' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px' }}>{ALERT_ICONS[a.alert_type] || '🔔'}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: a.is_read ? 400 : 600, marginBottom: '2px' }}>{a.title}</div>
                    <div style={{ fontSize: '12px', color: '#8899aa' }}>{a.message}</div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#8899aa', whiteSpace: 'nowrap', marginLeft: '8px' }}>{timeAgo(a.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trade Intents Section */}
      <SectionHeader title="Trade Intents" icon="🔄" open={openSection === 'trades'} onToggle={() => toggleSection('trades')} count={intents.length} />
      {openSection === 'trades' && (
        <div style={{ backgroundColor: '#16213e', borderRadius: '0 0 12px 12px', padding: '12px 16px 16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setShowAddIntent(true)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#e94560', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Add Trade Intent
            </button>
            <button onClick={viewMatches} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #0f3460', backgroundColor: 'transparent', color: '#8899aa', fontSize: '13px', cursor: 'pointer' }}>
              View Matches
            </button>
          </div>
          {intents.length === 0 ? (
            <p style={{ color: '#8899aa', textAlign: 'center', padding: '16px', fontSize: '13px' }}>No trade intents yet</p>
          ) : intents.map((intent) => (
            <div key={intent.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginBottom: '6px', borderRadius: '8px', backgroundColor: '#1a1a2e' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{intent.card_name}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: intent.intent_type === 'looking_for' ? 'rgba(33,150,243,0.2)' : 'rgba(76,175,80,0.2)', color: intent.intent_type === 'looking_for' ? '#2196f3' : '#4caf50' }}>
                    {intent.intent_type === 'looking_for' ? 'Want' : 'Have'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8899aa' }}>{intent.set_code}</span>
                </div>
              </div>
              <button
                onClick={() => deleteIntent(intent.id)}
                disabled={deleting === intent.id}
                style={{ background: 'none', border: 'none', color: '#e94560', fontSize: '16px', cursor: 'pointer', padding: '4px 8px', opacity: deleting === intent.id ? 0.4 : 1 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      <div style={{ marginTop: '12px', backgroundColor: '#16213e', borderRadius: '12px', padding: '16px' }}>
        <button
          onClick={logout}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e94560', backgroundColor: 'transparent', color: '#e94560', fontSize: '15px', cursor: 'pointer', marginBottom: '12px' }}
        >
          Sign Out
        </button>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#555' }}>AutoGrade TCG v1.0</p>
      </div>

      {/* Modals */}
      {showAddIntent && <AddIntentModal onClose={() => setShowAddIntent(false)} onAdded={loadIntents} />}
      {matches !== null && <MatchesModal matches={matches} onClose={() => setMatches(null)} />}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #0f3460',
  backgroundColor: '#1a1a2e',
  color: '#eee',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
};
