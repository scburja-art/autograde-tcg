import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { to: '/', label: 'Collection', icon: '📦' },
  { to: '/scan', label: 'Scan', icon: '📷' },
  { to: '/grades', label: 'Grades', icon: '⭐' },
  { to: '/portfolio', label: 'Portfolio', icon: '📊' },
  { to: '/more', label: 'More', icon: '☰' },
];

export default function Layout() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#1a1a2e', color: '#eee' }}>
      {isAuthenticated && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', backgroundColor: '#16213e', borderBottom: '1px solid #0f3460' }}>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>AutoGrade</span>
          <span style={{ fontSize: '13px', color: '#8899aa' }}>{user?.username}</span>
        </header>
      )}
      <main style={{ flex: 1, padding: '16px', paddingBottom: isAuthenticated ? '72px' : '16px', overflowY: 'auto' }}>
        <Outlet />
      </main>
      {isAuthenticated && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-around',
          backgroundColor: '#16213e',
          borderTop: '1px solid #0f3460',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 0',
                flex: 1,
                textDecoration: 'none',
                color: isActive ? '#e94560' : '#8899aa',
                fontSize: '11px',
                gap: '2px',
              })}
            >
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
