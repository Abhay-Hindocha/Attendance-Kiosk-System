import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Layout from './components/Layout';
import AttendancePage from './components/AttendancePage';
import DashboardPage from './components/DashboardPage';
import ReportsPage from './components/ReportsPage';
// import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import EmployeesPage from './components/EmployeesPage';
import PoliciesPage from './components/PoliciesPage';
import LeavePoliciesPage from './modules/admin/leave/LeavePoliciesPage';
import LeaveApprovalsPage from './modules/admin/leave/LeaveApprovalsPage';
import AdminCorrectionRequestsPage from './modules/admin/AdminCorrectionRequestsPage';
import AdminAttendanceCorrectionPage from './modules/admin/AdminAttendanceCorrectionPage';
import EmployeeLoginPage from './modules/employee/EmployeeLoginPage';
import EmployeeLayout from './modules/employee/EmployeeLayout';
import EmployeeDashboardPage from './modules/employee/EmployeeDashboardPage';
import EmployeeLeavesPage from './modules/employee/EmployeeLeavesPage';
import EmployeeLeaveApplyPage from './modules/employee/EmployeeLeaveApplyPage';
import EmployeeAttendanceCorrectionPage from './modules/employee/EmployeeAttendancePage';
import EmployeeProfilePage from './modules/employee/EmployeeProfilePage';

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
          path="/leave/policies"
          element={
            <Layout>
              <LeavePoliciesPage />
            </Layout>
          }
        />
        <Route
          path="/leave/approvals"
          element={
            <Layout>
              <LeaveApprovalsPage />
            </Layout>
          }
        />
        <Route
          path="/admin/correction-requests"
          element={
            <Layout>
              <AdminCorrectionRequestsPage />
            </Layout>
          }
        />
        <Route
          path="/admin/attendance-correction"
          element={
            <Layout>
              <AdminAttendanceCorrectionPage />
            </Layout>
          }
        />
        <Route path="/employee/login" element={<EmployeeLoginPage />} />
        <Route
          path="/employee"
          element={<EmployeeLayout />}
        >
          <Route index element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboardPage />} />
          <Route path="leaves" element={<EmployeeLeavesPage />} />
          <Route path="apply-leave" element={<EmployeeLeaveApplyPage />} />
          <Route path="attendance" element={<EmployeeAttendanceCorrectionPage />} />
          <Route path="profile" element={<EmployeeProfilePage />} />
        </Route>
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
