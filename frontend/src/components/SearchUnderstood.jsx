export default function SearchUnderstood({ understood, note }) {
  if (!understood) return null;

  const fields = [
    { key: 'origin', label: 'From' },
    { key: 'destination', label: 'To' },
    { key: 'date', label: 'Date' },
    { key: 'bus_type', label: 'Bus Type' },
    { key: 'time_window', label: 'Time' },
  ];

  const hasAnyField = fields.some(f => understood[f.key]);
  if (!hasAnyField && !note) return null;

  return (
    <div>
      {hasAnyField && (
        <div className="understood-block" id="search-understood">
          <div className="understood-title">🧠 Understood from your query</div>
          <div className="understood-fields">
            {fields.map(({ key, label }) =>
              understood[key] ? (
                <span className="understood-field" key={key}>
                  <span className="label">{label}:</span>
                  <span className="value">{understood[key]}</span>
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {note && (
        <div className="note-banner" id="search-note">
          <span className="icon">⚠️</span>
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}
