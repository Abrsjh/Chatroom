import { Link } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
  const { user, logout } = useUser()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="layout">
      <header className="layout-header" data-testid="layout-header" role="banner">
        <h1 className="site-title">Reddit Forum</h1>
        {user && (
          <div className="user-info">
            <span className="username">Welcome, {user.username}</span>
            <button 
              onClick={handleLogout}
              className="logout-button"
              data-testid="logout-button"
            >
              Logout
            </button>
          </div>
        )}
      </header>
      
      <div className="layout-body">
        <aside className="layout-sidebar" data-testid="layout-sidebar">
          <nav role="navigation">
            <ul className="nav-list">
              <li>
                <Link to="/channels" className="nav-link">
                  Channels
                </Link>
              </li>
              <li>
                <Link to="/messages" className="nav-link">
                  Messages
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
        
        <main className="layout-main" data-testid="layout-main" role="main">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout