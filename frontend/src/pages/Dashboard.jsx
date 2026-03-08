import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getContacts, getEvents, getTags, deleteContact } from '../services/api';
import TagBadge from '../components/TagBadge';
import FollowUpBadge from '../components/FollowUpBadge';
import { isToday, isPast, parseISO } from '../utils/dates';

export default function Dashboard() {
  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, e, t] = await Promise.all([
        getContacts({ search, event_id: filterEvent || undefined, tag_id: filterTag || undefined, sort_by: sortBy }),
        getEvents(),
        getTags(),
      ]);
      setContacts(c);
      setEvents(e);
      setTags(t);
    } finally {
      setLoading(false);
    }
  }, [search, filterEvent, filterTag, sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}?`)) return;
    await deleteContact(id);
    load();
  };

  const todayCount = contacts.filter(c => c.follow_up_date && isToday(parseISO(c.follow_up_date))).length;
  const overdueCount = contacts.filter(c => c.follow_up_date && isPast(parseISO(c.follow_up_date)) && !isToday(parseISO(c.follow_up_date))).length;

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-600">{contacts.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Contacts</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-600">{events.length}</p>
          <p className="text-xs text-gray-500 mt-1">Events</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-600">{todayCount}</p>
          <p className="text-xs text-gray-500 mt-1">Follow Up Today</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-xs text-gray-500 mt-1">Overdue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="Search by name, org, role, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input sm:w-44" value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
          <option value="">All Events</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="input sm:w-44" value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="">All Tags</option>
          {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input sm:w-44" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="created_at">Sort: Recent</option>
          <option value="follow_up_date">Sort: Follow-up</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Add button */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-500">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        <Link to="/add" className="btn-primary btn-sm">+ Add Contact</Link>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No contacts yet</p>
          <Link to="/add" className="btn-primary btn-sm">Add your first contact</Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Organization', 'Role', 'Where Met', 'Follow-up', 'Tags', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/contacts/${c.id}`} className="text-blue-600 hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.organization || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.role || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.event_name || c.where_met || '—'}</td>
                    <td className="px-4 py-3">
                      <FollowUpBadge date={c.follow_up_date} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map(t => <TagBadge key={t.id} name={t.name} />)}
                        {c.tags.length > 3 && <span className="badge bg-gray-100 text-gray-600">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/contacts/${c.id}`} className="btn-secondary btn-sm mr-2">View</Link>
                      <button onClick={() => handleDelete(c.id, c.name)} className="btn-danger btn-sm">Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {contacts.map(c => (
              <div key={c.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <Link to={`/contacts/${c.id}`} className="font-semibold text-blue-600 hover:underline">{c.name}</Link>
                    {c.organization && <p className="text-sm text-gray-500">{c.organization} {c.role ? `· ${c.role}` : ''}</p>}
                    {(c.event_name || c.where_met) && (
                      <p className="text-xs text-gray-400 mt-0.5">{c.event_name || c.where_met}</p>
                    )}
                  </div>
                  <FollowUpBadge date={c.follow_up_date} />
                </div>
                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.map(t => <TagBadge key={t.id} name={t.name} />)}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Link to={`/contacts/${c.id}`} className="btn-primary btn-sm flex-1 text-center">View</Link>
                  <button onClick={() => handleDelete(c.id, c.name)} className="btn-danger btn-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
