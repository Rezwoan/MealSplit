import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Login from './pages/Login'
import Purchases from './pages/Purchases'
import Rooms from './pages/Rooms'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import RequireAuth from './components/RequireAuth'
import Balances from './pages/Balances'
import BreakPeriods from './pages/BreakPeriods'

function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
          path="/rooms/:roomId/balances"
          element={
            <RequireAuth>
              <Balances />
            </RequireAuth>
          }
        />
        <Route
          path="/rooms/:roomId/breaks"
          element={
            <RequireAuth>
              <BreakPeriods />
            </RequireAuth>
          }
        />
        <Route
          path="/me"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="*"
          element={<Login />}
        />
      </Routes>
    </AnimatePresence>
  )
}

export default App

