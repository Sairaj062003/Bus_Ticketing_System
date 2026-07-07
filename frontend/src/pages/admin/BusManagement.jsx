import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

export default function BusManagement() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBus, setEditBus] = useState(null);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    origin: '', destination: '', departure_time: '',
    bus_type: 'AC', total_seats: 40, price: '', status: 'active',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchBuses(); }, []);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/buses`);
      if (!res.ok) throw new Error('Failed to load buses');
      setBuses(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditBus(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (bus) => {
    setEditBus(bus);
    setForm({
      origin: bus.origin,
      destination: bus.destination,
      departure_time: bus.departure_time.slice(0, 16), // for datetime-local input
      bus_type: bus.bus_type,
      total_seats: bus.total_seats,
      price: bus.price,
      status: bus.status,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const url = editBus
        ? `${API}/admin/buses/${editBus.id}`
        : `${API}/admin/buses`;
      const method = editBus ? 'PATCH' : 'POST';

      const body = editBus
        ? { ...form, price: parseFloat(form.price), total_seats: parseInt(form.total_seats) }
        : {
            ...form,
            price: parseFloat(form.price),
            total_seats: parseInt(form.total_seats),
            departure_time: new Date(form.departure_time).toISOString(),
          };

      if (!editBus) {
        body.departure_time = new Date(form.departure_time).toISOString();
      } else if (form.departure_time) {
        body.departure_time = new Date(form.departure_time).toISOString();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save bus');
      }

      setShowModal(false);
      fetchBuses();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (dt) => {
    return new Date(dt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const getBadgeClass = (type) => {
    const map = { 'AC': 'badge-ac', 'Non-AC': 'badge-non-ac', 'Sleeper': 'badge-sleeper' };
    return map[type] || 'badge-ac';
  };

  return (
    <div className="container page">
      <div className="section-header">
        <h1 className="gradient-text">🚌 Bus Management</h1>
        <button className="btn btn-primary" onClick={openAdd} id="add-bus-btn">
          + Add Bus
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="table-container">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="skeleton" style={{ height: '20px', width: '80%' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="table-container animate-in">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Type</th>
                <th>Seats</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus) => (
                <tr key={bus.id}>
                  <td>#{bus.id}</td>
                  <td>{bus.origin} → {bus.destination}</td>
                  <td>{formatTime(bus.departure_time)}</td>
                  <td><span className={`badge ${getBadgeClass(bus.bus_type)}`}>{bus.bus_type}</span></td>
                  <td>
                    <span style={{ 
                      color: bus.available_seats < 5 ? 'var(--accent-red)' : 'var(--text-primary)' 
                    }}>
                      {bus.available_seats}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}> / {bus.total_seats}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{bus.price.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${bus.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                      {bus.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEdit(bus)}
                      id={`edit-bus-${bus.id}`}
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
              {buses.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center" style={{ color: 'var(--text-muted)', padding: '40px' }}>
                    No buses found. Click "Add Bus" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {editBus ? '✏️ Edit Bus' : '➕ Add New Bus'}
            </h2>

            {formError && (
              <div className="error-banner" style={{ marginBottom: 'var(--space-lg)' }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Origin</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Hyderabad"
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    required
                    id="bus-form-origin"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bangalore"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    required
                    id="bus-form-destination"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Departure Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={form.departure_time}
                  onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
                  required
                  id="bus-form-departure"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bus Type</label>
                  <select
                    className="form-select"
                    value={form.bus_type}
                    onChange={(e) => setForm({ ...form, bus_type: e.target.value })}
                    id="bus-form-type"
                  >
                    <option value="AC">AC</option>
                    <option value="Non-AC">Non-AC</option>
                    <option value="Sleeper">Sleeper</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    id="bus-form-status"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Seats</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.total_seats}
                    onChange={(e) => setForm({ ...form, total_seats: e.target.value })}
                    min="1"
                    required
                    id="bus-form-seats"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 850"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    min="1"
                    step="0.01"
                    required
                    id="bus-form-price"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="bus-form-submit">
                  {saving ? 'Saving...' : editBus ? 'Update Bus' : 'Create Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
