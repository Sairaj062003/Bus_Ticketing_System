import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatLocalDateTime } from '../../utils/dateTime';

const API = 'http://localhost:8000';

export default function BookingHistory() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.name) params.set('customer_name', user.name);
      const res = await fetch(`${API}/bookings?${params}`);
      if (!res.ok) throw new Error('Failed to load bookings');
      setBookings(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    setCancellingId(bookingId);
    try {
      const res = await fetch(`${API}/bookings/${bookingId}/cancel`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Cancel failed');
      }
      fetchBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
      setConfirmCancel(null);
    }
  };

  const formatTime = (dt) => {
    return formatLocalDateTime(dt);
  };

  return (
    <div className="container page">
      <div className="section-header">
        <h1 className="gradient-text">🎫 My Bookings</h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchBookings} id="refresh-bookings">
          ↻ Refresh
        </button>
      </div>

      {error && <div className="error-banner mb-lg">⚠️ {error}</div>}

      {loading ? (
        <div className="flex flex-col gap-md">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card">
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '16px', width: '40%' }} />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎫</div>
          <p>No bookings yet</p>
          <p style={{ fontSize: '0.85rem', marginTop: '8px', color: 'var(--text-muted)' }}>
            Search for buses and make your first booking!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {bookings.map((booking, i) => (
            <div key={booking.id} className={`glass-card animate-in animate-in-delay-${Math.min(i, 4)}`} id={`booking-${booking.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
                      Booking #{booking.id}
                    </span>
                    <span className={`badge ${booking.status === 'Confirmed' ? 'badge-confirmed' : 'badge-cancelled'}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span>👤 {booking.passenger_name} (Age: {booking.passenger_age})</span>
                    <span>🚌 {booking.origin ? `${booking.origin} → ${booking.destination}` : `Bus #${booking.bus_id}`}</span>
                    <span>💺 {booking.seats_booked} {booking.seats_booked === 1 ? 'seat' : 'seats'}</span>
                    <span>🕐 {booking.departure_time ? formatLocalDateTime(booking.departure_time) : formatLocalDateTime(booking.created_at)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <span className="bus-price">₹{booking.amount.toLocaleString()}</span>

                  {booking.status === 'Confirmed' && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setConfirmCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      id={`cancel-btn-${booking.id}`}
                    >
                      {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {confirmCancel && (
        <div className="confirm-overlay" onClick={() => setConfirmCancel(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Booking?</h3>
            <p>Are you sure you want to cancel booking #{confirmCancel}? The seats will be released back.</p>
            <div className="actions">
              <button className="btn btn-secondary" onClick={() => setConfirmCancel(null)}>
                Keep Booking
              </button>
              <button className="btn btn-danger" onClick={() => handleCancel(confirmCancel)} id="confirm-cancel-btn">
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
