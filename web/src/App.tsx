import { Link, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Login from './pages/Login'
import Purchases from './pages/Purchases'
import Rooms from './pages/Rooms'

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
            <Link className="hover:text-white" to="/rooms">
              Rooms
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:roomId" element={<Dashboard />} />
          <Route path="/rooms/:roomId/inventory" element={<Inventory />} />
          <Route path="/rooms/:roomId/purchases" element={<Purchases />} />
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
