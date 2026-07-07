import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { parseBackendDate } from '../../utils/dateTime';

const API = 'http://localhost:8000';

export default function BookingForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bus = location.state?.bus;

  const [form, setForm] = useState({
    passenger_name: user?.name || '',
    passenger_age: '',
    seats: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!bus) {
    return (
      <div className="container page">
        <div className="empty-state">
          <div className="icon">🎫</div>
          <p>No bus selected. Please search for buses first.</p>
          <button className="btn btn-primary mt-lg" onClick={() => navigate('/customer/search')}>
            ← Back to Search
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = bus.price * form.seats;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bus_id: bus.id,
          passenger_name: form.passenger_name.trim(),
          passenger_age: Number(form.passenger_age),
          seats: Number(form.seats),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Booking failed');
      }

      setSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dt) => {
    return parseBackendDate(dt).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  // ── Success State ───────────────────
  if (success) {
    return (
      <div className="container page">
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <div className="glass-card animate-in">
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>🎉</div>
            <h2 style={{ marginBottom: 'var(--space-md)' }}>Booking Confirmed!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
              Your booking <strong>#{success.id}</strong> has been confirmed successfully.
            </p>

            <div style={{ textAlign: 'left', marginBottom: 'var(--space-xl)' }}>
              <div className="understood-block">
                <div className="understood-fields" style={{ flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <div className="understood-field" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span className="label">Route</span>
                    <span className="value">{bus.origin} → {bus.destination}</span>
                  </div>
                  <div className="understood-field" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span className="label">Passenger</span>
                    <span className="value">{success.passenger_name}</span>
                  </div>
                    <div className="understood-field" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <span className="label">Departure</span>
                      <span className="value">{formatTime(success.departure_time || bus.departure_time)}</span>
                    </div>
                  <div className="understood-field" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span className="label">Seats</span>
                    <span className="value">{success.seats_booked}</span>
                  </div>
                  <div className="understood-field" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span className="label">Amount Paid</span>
                    <span className="value" style={{ color: 'var(--accent-cyan)' }}>₹{success.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/customer/search')}>
                Search More
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/customer/bookings')}>
                View Bookings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button
          className="btn btn-secondary btn-sm mb-lg"
          onClick={() => navigate(-1)}
        >
          ← Back to Results
        </button>

        <h1 className="gradient-text animate-in" style={{ marginBottom: 'var(--space-xl)' }}>
          Book Your Ticket
        </h1>

        {/* Bus Summary */}
        <div className="glass-card animate-in animate-in-delay-1" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <div className="bus-route">
              <span>{bus.origin}</span>
              <span className="arrow">→</span>
              <span>{bus.destination}</span>
            </div>
            <span className={`badge ${bus.bus_type === 'AC' ? 'badge-ac' : bus.bus_type === 'Sleeper' ? 'badge-sleeper' : 'badge-non-ac'}`}>
              {bus.bus_type}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <span>🕐 {formatTime(bus.departure_time)}</span>
            <span>💺 {bus.available_seats} seats left</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner animate-in" id="booking-error">
            ⚠️ {error}
          </div>
        )}

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="glass-card animate-in animate-in-delay-2">
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Passenger Details</h3>

          <div className="form-group">
            <label className="form-label">Passenger Name</label>
            <input
              type="text"
              className="form-input"
              value={form.passenger_name}
              onChange={(e) => setForm({ ...form, passenger_name: e.target.value })}
              required
              id="booking-name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                type="number"
                className="form-input"
                value={form.passenger_age}
                onChange={(e) => setForm({ ...form, passenger_age: e.target.value })}
                min="1"
                max="120"
                required
                id="booking-age"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Number of Seats</label>
              <input
                type="number"
                className="form-input"
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: e.target.value })}
                min="1"
                max={bus.available_seats}
                required
                id="booking-seats"
              />
            </div>
          </div>

          {/* Price Summary */}
          <div style={{
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-lg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              ₹{bus.price.toLocaleString()} × {form.seats} {form.seats == 1 ? 'seat' : 'seats'}
            </span>
            <span className="bus-price">₹{totalAmount.toLocaleString()}</span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            id="confirm-booking-btn"
          >
            {loading ? 'Booking...' : `Confirm Booking — ₹${totalAmount.toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}
