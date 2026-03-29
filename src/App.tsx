import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from './contexts/AuthContext'

const AuthPage = lazy(() => import('./pages/AuthPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ShoppingHubPage = lazy(() => import('./pages/ShoppingHubPage'))
const TasksHubPage = lazy(() => import('./pages/TasksHubPage'))
const VouchersHubPage = lazy(() => import('./pages/VouchersHubPage'))
const ReservationsHubPage = lazy(() => import('./pages/ReservationsHubPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession()
  if (isLoading) return null
  if (!session) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shopping/:id"
            element={
              <ProtectedRoute>
                <ShoppingHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <ProtectedRoute>
                <TasksHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vouchers/:id"
            element={
              <ProtectedRoute>
                <VouchersHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservations/:id"
            element={
              <ProtectedRoute>
                <ReservationsHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
