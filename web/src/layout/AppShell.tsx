import type { ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Home, User } from 'lucide-react'
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
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container flex h-16 max-w-screen-2xl items-center mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={token ? "/rooms" : "/"} className="flex items-center gap-2.5 mr-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-sm">
              MS
            </div>
            <span className="font-semibold text-foreground text-lg">MealSplit</span>
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
                <Link to="/me">
                  <Button
                    variant={isActive('/me') ? 'secondary' : 'ghost'}
                    size="sm"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
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
      
      <main className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      <footer className="border-t border-border/40 py-8 mt-auto bg-background-subtle">
        <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          MealSplit © 2026 · Split meals, not friendships
        </div>
      </footer>
    </div>
  )
}

