import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AttendancePage from './components/AttendancePage';
import DashboardPage from './components/DashboardPage';
import ReportsPage from './components/ReportsPage';
// import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import EmployeesPage from './components/EmployeesPage';
import PoliciesPage from './components/PoliciesPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AttendancePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/dashboard" element={
          <Layout>
            <DashboardPage />
          </Layout>
        } />
        <Route path="/policies" element={
          <Layout>
            <PoliciesPage />
          </Layout>
        } />
        <Route path="/employees" element={
          <Layout>
            <EmployeesPage />
          </Layout>
        } />
        <Route path="/reports" element={
          <Layout>
            <ReportsPage />
          </Layout>
        } />
        {/* <Route path="/settings" element={
          <Layout>
            <SettingsPage />
          </Layout>
        } /> */}
      </Routes>
    </Router>
  );
}

export default App;
