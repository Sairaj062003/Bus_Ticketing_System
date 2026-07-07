import { parseBackendDate } from '../utils/dateTime';

export default function BusCard({ bus, onBook, showScore = false }) {
  const getBusTypeBadge = (type) => {
    const classes = {
      'AC': 'badge-ac',
      'Non-AC': 'badge-non-ac',
      'Sleeper': 'badge-sleeper',
    };
    return classes[type] || 'badge-ac';
  };

  const formatTime = (dt) => {
    const d = parseBackendDate(dt);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const seatsClass = bus.available_seats <= 5 ? 'color: var(--accent-red)' : 
                     bus.available_seats <= 15 ? 'color: var(--accent-amber)' : 
                     'color: var(--accent-emerald)';

  return (
    <div className="bus-card animate-in" id={`bus-card-${bus.id}`}>
      <div className="bus-card-header">
        <div className="bus-route">
          <span>{bus.origin}</span>
          <span className="arrow">→</span>
          <span>{bus.destination}</span>
        </div>
        <span className={`badge ${getBusTypeBadge(bus.bus_type)}`}>
          {bus.bus_type}
        </span>
      </div>

      <div className="bus-card-details">
        <div className="bus-detail-item">
          <span className="bus-detail-label">Departure</span>
          <span className="bus-detail-value">{formatTime(bus.departure_time)}</span>
        </div>
        <div className="bus-detail-item">
          <span className="bus-detail-label">Seats Available</span>
          <span className="bus-detail-value" style={{ [seatsClass.split(':')[0].trim()]: seatsClass.split(':')[1].trim() }}>
            {bus.available_seats} / {bus.total_seats}
          </span>
        </div>
        <div className="bus-detail-item">
          <span className="bus-detail-label">Price</span>
          <span className="bus-price">₹{bus.price.toLocaleString()}</span>
        </div>
      </div>

      <div className="bus-card-footer">
        <div>
          {showScore && bus.score !== undefined && (
            <span className="bus-score">
              Relevance: <span className="bus-score-value">⭐ {bus.score}</span>
            </span>
          )}
        </div>
        {onBook && (
          <button
            className="btn btn-primary"
            onClick={() => onBook(bus)}
            id={`book-btn-${bus.id}`}
            disabled={bus.available_seats <= 0}
          >
            {bus.available_seats > 0 ? 'Book Now' : 'Sold Out'}
          </button>
        )}
      </div>
    </div>
  );
}
