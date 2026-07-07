import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BusCard from '../../components/BusCard';
import SearchUnderstood from '../../components/SearchUnderstood';
import { parseBackendDate } from '../../utils/dateTime';

const API = 'http://localhost:8000';

export default function Search() {
  const navigate = useNavigate();
  const [nlQuery, setNlQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [understood, setUnderstood] = useState(null);
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);

  // Structured search state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    origin: '', destination: '', date: '', bus_type: '',
  });

  // ── NL Search ───────────────────────
  const handleNlSearch = async (e) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;

    setSearching(true);
    setError(null);
    setResults(null);
    setUnderstood(null);
    setNote(null);

    try {
      const res = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlQuery }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Search failed');
        // Still show understood if available
        if (data.understood) setUnderstood(data.understood);
        return;
      }

      setResults(data.results);
      setUnderstood(data.understood);
      setNote(data.note);
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // ── Structured Search ───────────────
  const handleStructuredSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setResults(null);
    setUnderstood(null);
    setNote(null);

    try {
      const params = new URLSearchParams();
      if (filters.origin) params.set('origin', filters.origin);
      if (filters.destination) params.set('destination', filters.destination);
      if (filters.date) params.set('date', filters.date);
      if (filters.bus_type) params.set('bus_type', filters.bus_type);

      const res = await fetch(`${API}/buses?${params}`);
      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleBook = (bus) => {
    navigate('/customer/book', { state: { bus } });
  };

  return (
    <div className="container page">
      {/* Hero Section */}
      <div className="text-center" style={{ marginBottom: 'var(--space-2xl)' }}>
        <h1 className="gradient-text animate-in" style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>
          Find Your Bus
        </h1>
        <p className="animate-in animate-in-delay-1" style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
          Search naturally — try "AC bus from Hyderabad to Bangalore tomorrow morning"
        </p>
      </div>

      {/* NL Search Bar */}
      <form onSubmit={handleNlSearch} className="search-container animate-in animate-in-delay-2">
        <input
          type="text"
          className="search-input"
          placeholder='Try: "sleeper from Mumbai to Pune on 2026-07-08"'
          value={nlQuery}
          onChange={(e) => setNlQuery(e.target.value)}
          id="nl-search-input"
        />
        <button
          type="submit"
          className="search-btn"
          disabled={searching || !nlQuery.trim()}
          id="nl-search-btn"
        >
          {searching ? '...' : '🔍 Search'}
        </button>
      </form>

      {/* Structured Filter Toggle */}
      <div className="text-center mt-md animate-in animate-in-delay-3">
        <button
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          id="toggle-filters-btn"
        >
          {showFilters ? '▲ Hide' : '▼ Show'} structured search filters
        </button>
      </div>

      {/* Structured Filter Form */}
      {showFilters && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <form onSubmit={handleStructuredSearch} className="filter-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Origin</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hyderabad"
                  value={filters.origin}
                  onChange={(e) => setFilters({ ...filters, origin: e.target.value })}
                  id="filter-origin"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Destination</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Bangalore"
                  value={filters.destination}
                  onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
                  id="filter-destination"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  id="filter-date"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bus Type</label>
                <select
                  className="form-select"
                  value={filters.bus_type}
                  onChange={(e) => setFilters({ ...filters, bus_type: e.target.value })}
                  id="filter-bus-type"
                >
                  <option value="">All Types</option>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                  <option value="Sleeper">Sleeper</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={searching} id="structured-search-btn">
              {searching ? 'Searching...' : '🔍 Search Buses'}
            </button>
          </form>
        </div>
      )}

      {/* Results Section */}
      <div style={{ marginTop: 'var(--space-2xl)' }}>
        {/* Error */}
        {error && (
          <div className="error-banner" id="search-error">
            ⚠️ {error}
          </div>
        )}

        {/* Understood + Note */}
        <SearchUnderstood understood={understood} note={note} />

        {/* Results */}
        {results && (
          <>
            <div className="section-header">
              <h2>
                {results.length} {results.length === 1 ? 'Bus' : 'Buses'} Found
              </h2>
            </div>

            {results.length > 0 ? (
              <div className="table-container animate-in">
                <table className="bus-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                          <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Sr. No</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Origin</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Destination</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Date Time</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Type</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Seats Available</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Price</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Score</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter(bus => bus.available_seats > 0).map((bus, i) => (
                      <tr key={bus.id} className={`animate-in-delay-${Math.min(i, 4)}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '12px' }}>{i + 1}</td>
                        <td style={{ padding: '12px' }}>{bus.origin}</td>
                        <td style={{ padding: '12px' }}>{bus.destination}</td>
                        <td style={{ padding: '12px' }}>{parseBackendDate(bus.departure_time).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${bus.bus_type === 'AC' ? 'badge-ac' : bus.bus_type === 'Sleeper' ? 'badge-sleeper' : 'badge-non-ac'}`}>
                            {bus.bus_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{bus.available_seats} / {bus.total_seats}</td>
                        <td style={{ padding: '12px' }} className="bus-price">₹{bus.price.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>{bus.score ?? '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleBook(bus)}
                            id={`book-btn-${bus.id}`}
                          >
                            Book Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="icon">🔍</div>
                <p>No buses found for your search criteria.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                  Try adjusting your dates or route.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
