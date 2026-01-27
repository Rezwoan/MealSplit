import { Link, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Login from './pages/Login'
import Purchases from './pages/Purchases'
import Rooms from './pages/Rooms'
import Signup from './pages/Signup'
import RequireAuth from './components/RequireAuth'

function App() {
  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">MealSplit</h1>
            <p className="text-xs text-neutral-500">PWA scaffold</p>
          </div>
          <nav className="flex gap-4 text-sm text-neutral-400">
            <Link className="hover:text-white" to="/login">
              Login
            </Link>
            <Link className="hover:text-white" to="/signup">
              Signup
            </Link>
            <Link className="hover:text-white" to="/rooms">
              Rooms
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/rooms"
            element={
              <RequireAuth>
                <Rooms />
              </RequireAuth>
            }
          />
          <Route
            path="/rooms/:roomId"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/rooms/:roomId/inventory"
            element={
              <RequireAuth>
                <Inventory />
              </RequireAuth>
            }
          />
          <Route
            path="/rooms/:roomId/purchases"
            element={
              <RequireAuth>
                <Purchases />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <div className="rounded-xl bg-neutral-900 p-6 shadow">
                <h2 className="text-2xl font-semibold text-white">Welcome</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Pick a section to continue.
                </p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
