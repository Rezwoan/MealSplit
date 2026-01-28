import type { ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Home } from 'lucide-react'
import { clearToken, getToken } from '../lib/auth'
import { Button } from '../ui/Button'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const token = getToken()
  
  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }
  
  const isActive = (path: string) => location.pathname === path
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
          <Link to={token ? "/rooms" : "/"} className="flex items-center gap-2 mr-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              MS
            </div>
            <span className="font-semibold text-foreground">MealSplit</span>
          </Link>
          
          <div className="flex flex-1 items-center justify-end space-x-2">
            {!token ? (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/rooms">
                  <Button
                    variant={isActive('/rooms') ? 'secondary' : 'ghost'}
                    size="sm"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Rooms
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="container max-w-screen-2xl mx-auto px-4 py-8">
        {children}
      </main>
      
      <footer className="border-t border-border py-6 mt-16">
        <div className="container max-w-screen-2xl mx-auto px-4 text-center text-sm text-muted-foreground">
          MealSplit © 2026 · Split meals, not friendships
        </div>
      </footer>
    </div>
  )
}

