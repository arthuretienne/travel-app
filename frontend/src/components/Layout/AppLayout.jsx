// frontend/src/components/Layout/AppLayout.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import './AppLayout.css';

function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-layout-header">
        <div className="header-container">
          <div className="header-left">
            <button className="logo-button" onClick={() => navigate('/dashboard')}>
              Travel AI
            </button>
          </div>

          <nav className="header-nav">
            <button
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-link ${isActive('/create-trip') ? 'active' : ''}`}
              onClick={() => navigate('/create-trip')}
            >
              Create Trip
            </button>
            <button
              className={`nav-link ${isActive('/account') ? 'active' : ''}`}
              onClick={() => navigate('/account')}
            >
              My Account
            </button>
          </nav>

          <div className="header-right">
            <div className="user-info">
              <span className="user-greeting">
                Hi, {user?.firstName || 'Traveler'}
              </span>
            </div>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "shadow-xl",
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-layout-main">
        {children}
      </main>

      {/* Footer */}
      <footer className="app-layout-footer">
        <div className="footer-container">
          <p>&copy; 2025 Travel AI. Powered by Claude AI & Amadeus.</p>
          <div className="footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
