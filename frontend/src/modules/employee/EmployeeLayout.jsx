import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, ClipboardList, Home, LogOut, UserCircle, Activity, Menu, X } from 'lucide-react';
import employeeApi from '../../services/employeeApi';

const EmployeePortalContext = createContext(null);

export const useEmployeePortal = () => React.useContext(EmployeePortalContext);

const navItems = [
  { label: 'Dashboard', path: '/employee/dashboard', icon: Home },
  { label: 'Leave', path: '/employee/leaves', icon: CalendarCheck },
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // active state helper (handles nested routes like /employees/123)
  const isActivePath = (href) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

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
      setProfile,
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
        <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-base md:text-lg font-semibold text-gray-900">Employee Portal</h1>
                <span className="hidden md:inline-block text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Logged in as {profile?.name || 'Employee'}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <div className="h-6 w-px bg-gray-300 mx-2" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
                <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {isMenuOpen && (
            <div className="lg:hidden mt-4 space-y-2">
              <hr className="border-gray-200" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${active
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <button
                onClick={async () => {
                  await handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </header>
        <main className="max-w-7xl mx-auto px-2 py-2">
          <Outlet />
        </main>
      </div>
    </EmployeePortalContext.Provider>
  );
};

export default EmployeeLayout;

