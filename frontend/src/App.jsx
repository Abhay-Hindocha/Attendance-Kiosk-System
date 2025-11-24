import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Layout from './components/Layout';
import AttendancePage from './components/AttendancePage';
import DashboardPage from './components/DashboardPage';
import ReportsPage from './components/ReportsPage';
// import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import EmployeesPage from './components/EmployeesPage';
import PoliciesPage from './components/PoliciesPage';

// Component to handle route changes and call registered cleanup callbacks on camera usage
function RouteChangeHandler({ cleanupRef }) {
  const location = useLocation();

  useEffect(() => {
    if (cleanupRef.current && typeof cleanupRef.current === 'function') {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, [location, cleanupRef]);

  return null;
}

function App() {
  const cleanupRef = useRef(null);

  return (
    <Router>
      <RouteChangeHandler cleanupRef={cleanupRef} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AttendancePage registerCleanup={(cb) => (cleanupRef.current = cb)} />} />
        <Route path="/attendance" element={<AttendancePage registerCleanup={(cb) => (cleanupRef.current = cb)} />} />
        <Route
          path="/dashboard"
          element={
            <Layout>
              <DashboardPage />
            </Layout>
          }
        />
        <Route
          path="/policies"
          element={
            <Layout>
              <PoliciesPage />
            </Layout>
          }
        />
        <Route
          path="/employees"
          element={
            <Layout>
              <EmployeesPage registerCleanup={(cb) => (cleanupRef.current = cb)} />
            </Layout>
          }
        />
        <Route
          path="/reports"
          element={
            <Layout>
              <ReportsPage />
            </Layout>
          }
        />
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
