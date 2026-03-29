import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from './contexts/AuthContext'
import { useUrgentTasks } from './hooks/useUrgentTasks'
import BottomNav from './components/shared/BottomNav'

const AuthPage = lazy(() => import('./pages/AuthPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ShoppingHubPage = lazy(() => import('./pages/ShoppingHubPage'))
const TasksHubPage = lazy(() => import('./pages/TasksHubPage'))
const VouchersHubPage = lazy(() => import('./pages/VouchersHubPage'))
const ReservationsHubPage = lazy(() => import('./pages/ReservationsHubPage'))

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading, household } = useSession()
  const urgent = useUrgentTasks(household?.id ?? null)

  if (isLoading) return null
  if (!session) return <Navigate to="/auth" replace />
  return (
    <>
      {children}
      <BottomNav urgentCount={urgent.totalCount} />
    </>
  )
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
              <ProtectedLayout>
                <HomePage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/shopping"
            element={
              <ProtectedLayout>
                <ShoppingHubPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/shopping/:id"
            element={
              <ProtectedLayout>
                <ShoppingHubPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedLayout>
                <TasksHubPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <ProtectedLayout>
                <TasksHubPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/vouchers"
            element={
              <ProtectedLayout>
                <VouchersHubPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/vouchers"
            element={
              <ProtectedRoute>
                <VouchersHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vouchers/:id"
            element={
              <ProtectedLayout>
                <VouchersHubPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/reservations"
            element={
              <ProtectedLayout>
                <ReservationsHubPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/reservations"
            element={
              <ProtectedRoute>
                <ReservationsHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservations/:id"
            element={
              <ProtectedLayout>
                <ReservationsHubPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedLayout>
                <SettingsPage />
              </ProtectedLayout>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
