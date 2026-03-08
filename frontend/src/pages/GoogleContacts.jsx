import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export default function GoogleContacts() {
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [total, setTotal] = useState(0);

  // Parse query params from hash router (#/google?connected=true)
  const params = new URLSearchParams(location.search);
  const justConnected = params.get('connected') === 'true';
  const connectError = params.get('error');

  useEffect(() => {
    api('/google/status').then(setStatus).catch(() => setStatus({ connected: false }));
  }, []);

  useEffect(() => {
    if (justConnected || status?.connected) {
      loadContacts();
    }
  }, [status]);

  const handleConnect = async () => {
    setError('');
    try {
      const { auth_url } = await api('/google/auth');
      window.location.href = auth_url;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Contacts?')) return;
    await api('/google/disconnect', { method: 'DELETE' });
    setStatus({ connected: false });
    setContacts([]);
    setSelected(new Set());
  };

  const loadContacts = async (pageToken = null) => {
    setLoading(true);
    setError('');
    try {
      const url = pageToken
        ? `/google/contacts?page_size=100&page_token=${pageToken}`
        : '/google/contacts?page_size=100';
      const data = await api(url);
      setContacts(prev => pageToken ? [...prev, ...data.contacts] : data.contacts);
      setNextPageToken(data.next_page_token || null);
      setTotal(data.total || data.contacts.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((_, i) => i)));
    }
  };

  const toggleOne = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleImport = async () => {
    if (selected.size === 0) { setError('Select at least one contact'); return; }
    setImporting(true);
    setError('');
    try {
      const toImport = [...selected].map(i => contacts[i]);
      const data = await api('/google/import', {
        method: 'POST',
        body: JSON.stringify({ contacts: toImport }),
      });
      setResult(data);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Google Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">Import contacts from your Google account into NetworkOS.</p>
        </div>
        {status?.connected && (
          <button onClick={handleDisconnect} className="btn-danger btn-sm">Disconnect</button>
        )}
      </div>

      {connectError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          Google connection failed: {connectError}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 mb-4 text-sm">
          Imported <strong>{result.imported}</strong> contacts.
          {result.skipped > 0 && <span> Skipped <strong>{result.skipped}</strong> duplicates.</span>}
          <button onClick={() => navigate('/')} className="ml-3 underline text-green-700">View Dashboard</button>
        </div>
      )}

      {/* Not connected */}
      {status && !status.connected && (
        <div className="card text-center py-14">
          <div className="text-5xl mb-4">G</div>
          <h2 className="text-lg font-semibold mb-2">Connect your Google Account</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Authorize read-only access to your Google Contacts. No data is stored on Google's servers.
          </p>
          <button onClick={handleConnect} className="btn-primary px-8 py-3 text-base">
            Sign in with Google
          </button>
        </div>
      )}

      {/* Connected — show contacts */}
      {status?.connected && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.size === contacts.length && contacts.length > 0}
                onChange={toggleAll}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-600">
                {contacts.length} contacts loaded
                {total > contacts.length && ` of ${total}`}
                {selected.size > 0 && ` · ${selected.size} selected`}
              </span>
            </div>
            <div className="flex gap-2">
              {nextPageToken && (
                <button
                  onClick={() => loadContacts(nextPageToken)}
                  disabled={loading}
                  className="btn-secondary btn-sm"
                >
                  Load More
                </button>
              )}
              <button
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="btn-primary btn-sm"
              >
                {importing ? 'Importing...' : `Import ${selected.size > 0 ? selected.size : ''} Selected`}
              </button>
            </div>
          </div>

          {loading && contacts.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">Loading contacts...</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {contacts.map((c, i) => (
                <div
                  key={i}
                  onClick={() => toggleOne(i)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                    selected.has(i) ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleOne(i)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded flex-shrink-0"
                  />
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[c.organization, c.role].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                    {c.email && <p>{c.email}</p>}
                    {c.phone && <p>{c.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
