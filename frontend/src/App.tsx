import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import EmployeesPage from './pages/EmployeesPage'
import InsightsPage from './pages/InsightsPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/insights" replace />} />
    </Routes>
  )
}
