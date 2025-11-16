// frontend/src/components/Layout/AppLayout.jsx
import { UserButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import './AppLayout.css';

function AppLayout({ children }) {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="app-layout-header">
        <div className="header-content">
          <div className="header-left" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <h1>🌍 Travel AI</h1>
          </div>
          <div className="header-right">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10"
                }
              }}
            />
          </div>
        </div>
      </header>

      <main className="app-layout-main">
        {children}
      </main>

      <footer className="app-layout-footer">
        <p>© 2025 Travel AI - Your personal AI travel advisor</p>
      </footer>
    </div>
  );
}

export default AppLayout;
