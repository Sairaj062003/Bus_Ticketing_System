import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleSelect() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [name, setName] = useState('');
  const { setRole } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (role) => {
    setSelectedRole(role);
    if (role === 'admin') {
      setName('Admin User');
    }
  };

  const handleContinue = () => {
    if (!name.trim()) return;
    setRole(name.trim(), selectedRole);
    navigate(selectedRole === 'admin' ? '/admin/dashboard' : '/customer/search');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleContinue();
  };

  return (
    <div className="role-select-page">
      <h1 className="gradient-text animate-in">🚌 BusGo</h1>
      <p className="subtitle animate-in animate-in-delay-1">
        AI-powered bus ticket search & booking system
      </p>

      {!selectedRole ? (
        <div className="role-cards animate-in animate-in-delay-2">
          <div
            className="role-card admin"
            onClick={() => handleSelect('admin')}
            id="role-admin"
          >
            <div className="icon">🛡️</div>
            <h3>Admin</h3>
            <p>Manage buses, view dashboard analytics, and monitor bookings</p>
          </div>

          <div
            className="role-card customer"
            onClick={() => handleSelect('customer')}
            id="role-customer"
          >
            <div className="icon">🎫</div>
            <h3>Customer</h3>
            <p>Search buses with natural language, book tickets, and manage bookings</p>
          </div>
        </div>
      ) : (
        <div className="animate-in" style={{ width: '100%', maxWidth: '400px' }}>
          <div className="glass-card" style={{ textAlign: 'left' }}>
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>
              {selectedRole === 'admin' ? '🛡️ Admin Access' : '🎫 Welcome, Traveler'}
            </h3>

            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                className="form-input"
                placeholder={selectedRole === 'admin' ? 'Admin User' : 'Enter your name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                id="role-name-input"
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setSelectedRole(null); setName(''); }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleContinue}
                disabled={!name.trim()}
                id="role-continue-btn"
                style={{ flex: 1 }}
              >
                Continue as {selectedRole === 'admin' ? 'Admin' : 'Customer'} →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
