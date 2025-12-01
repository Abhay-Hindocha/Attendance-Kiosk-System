import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, ClipboardList, Home, LogOut, UserCircle, Activity } from 'lucide-react';
import employeeApi from '../../services/employeeApi';

const EmployeePortalContext = createContext(null);

export const useEmployeePortal = () => React.useContext(EmployeePortalContext);

const navItems = [
  { label: 'Dashboard', path: '/employee/dashboard', icon: Home },
  { label: 'Leave Dashboard', path: '/employee/leaves', icon: CalendarCheck },
  { label: 'Apply Leave', path: '/employee/apply-leave', icon: ClipboardList },
  { label: 'Attendance', path: '/employee/attendance', icon: Activity },
  { label: 'Profile', path: '/employee/profile', icon: UserCircle },
];

const EmployeeLayout = () => {
  const token = localStorage.getItem('employeeAuthToken');
  const [profile, setProfile] = useState(() => {
    const cached = localStorage.getItem('employeeProfile');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await employeeApi.getProfile();
      setProfile(data);
      localStorage.setItem('employeeProfile', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to load employee profile', error);
      if (error?.status === 401) {
        await employeeApi.logout();
        navigate('/employee/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  const handleLogout = async () => {
    await employeeApi.logout();
    navigate('/employee/login');
  };

  const value = useMemo(
    () => ({
      profile,
      refreshProfile: fetchProfile,
    }),
    [profile, fetchProfile]
  );

  if (!token) {
    return <Navigate to="/employee/login" replace state={{ from: location }} />;
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <EmployeePortalContext.Provider value={value}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Attendance Kiosk System</p>
              <h1 className="text-2xl font-semibold text-gray-900">Employee Portal</h1>
              {profile && (
                <p className="text-sm text-gray-500">
                  {profile.name} · {profile.department || 'General'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                        isActive ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>
    </EmployeePortalContext.Provider>
  );
};

export default EmployeeLayout;

