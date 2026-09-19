import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import EmployeesPage from './pages/EmployeesPage'

const navSx = { color: 'inherit', '&.active': { borderBottom: '2px solid white', borderRadius: 0 } }

export default function App() {
  return (
    <Box>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 4 }}>ACME Salary Manager</Typography>
          <Button component={NavLink} to="/employees" sx={navSx}>Employees</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Routes>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </Container>
    </Box>
  )
}
