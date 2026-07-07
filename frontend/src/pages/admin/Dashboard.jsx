import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/dashboard`);
      if (!res.ok) throw new Error('Failed to load dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <h1 className="gradient-text">Dashboard</h1>
        <div className="mt-xl grid-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '36px', width: '80%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container page">
        <h1 className="gradient-text">Dashboard</h1>
        <div className="error-banner mt-lg">⚠️ {error}</div>
      </div>
    );
  }

  const getOccupancyClass = (pct) => {
    if (pct >= 75) return 'occupancy-high';
    if (pct >= 40) return 'occupancy-mid';
    return 'occupancy-low';
  };

  return (
    <div className="container page">
      <div className="section-header">
        <h1 className="gradient-text">📊 Dashboard</h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchDashboard} id="refresh-dashboard">
          ↻ Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid-3 mb-lg">
        <div className="stat-card cyan animate-in">
          <div className="stat-label">Confirmed Bookings Today</div>
          <div className="stat-value">{data.bookings_today}</div>
        </div>
        <div className="stat-card warm animate-in animate-in-delay-1">
          <div className="stat-label">Revenue Today (Confirmed)</div>
          <div className="stat-value">₹{data.revenue_today.toLocaleString()}</div>
        </div>
        <div className="stat-card cool animate-in animate-in-delay-2">
          <div className="stat-label">Active Routes</div>
          <div className="stat-value">{data.route_wise_demand.length}</div>
        </div>
      </div>

      {/* Occupancy by Bus */}
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>Occupancy by Bus</h2>
      <div className="table-container mb-lg animate-in">
        <table>
          <thead>
            <tr>
              <th>Bus ID</th>
              <th>Route</th>
              <th>Seats</th>
              <th>Occupancy</th>
              <th style={{ minWidth: '150px' }}>Fill Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.occupancy_by_bus.map((bus) => (
              <tr key={bus.bus_id}>
                <td>#{bus.bus_id}</td>
                <td>{bus.route}</td>
                <td>{bus.total_seats - bus.available_seats} / {bus.total_seats}</td>
                <td>{bus.occupancy_pct}%</td>
                <td>
                  <div className="occupancy-bar">
                    <div
                      className={`occupancy-fill ${getOccupancyClass(bus.occupancy_pct)}`}
                      style={{ width: `${bus.occupancy_pct}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {data.occupancy_by_bus.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active buses
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Route-wise Demand */}
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>Route-wise Demand</h2>
      <div className="table-container animate-in">
        <table>
          <thead>
            <tr>
              <th>Origin</th>
              <th>Destination</th>
              <th>Total Bookings</th>
            </tr>
          </thead>
          <tbody>
            {data.route_wise_demand.map((route, i) => (
              <tr key={i}>
                <td>{route.origin}</td>
                <td>{route.destination}</td>
                <td>
                  <span style={{ 
                    fontWeight: '700', 
                    color: route.booking_count > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' 
                  }}>
                    {route.booking_count}
                  </span>
                </td>
              </tr>
            ))}
            {data.route_wise_demand.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No booking data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
