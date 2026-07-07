import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, clearRole } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : '';

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <Link to={isAdmin ? '/admin/dashboard' : '/customer/search'} className="navbar-brand">
          <span className="icon">🚌</span>
          <span className="gradient-text">BusGo</span>
        </Link>

        <div className="navbar-links">
          {isAdmin ? (
            <>
              <Link to="/admin/dashboard" className={isActive('/admin/dashboard')}>
                Dashboard
              </Link>
              <Link to="/admin/buses" className={isActive('/admin/buses')}>
                Manage Buses
              </Link>
            </>
          ) : (
            <>
              <Link to="/customer/search" className={isActive('/customer/search')}>
                Search
              </Link>
              <Link to="/customer/bookings" className={isActive('/customer/bookings')}>
                My Bookings
              </Link>
            </>
          )}

          <span className="role-badge">
            {isAdmin ? '🛡️' : '👤'} {user.role}
          </span>

          <button onClick={clearRole} className="btn btn-secondary btn-sm" id="switch-role-btn">
            Switch Role
          </button>
        </div>
      </div>
    </nav>
  );
}
