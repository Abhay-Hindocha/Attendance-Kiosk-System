import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Camera, LayoutDashboard, FileText, Calendar, BarChart3, Settings, Clock, Users, Lock, LogOut, Wifi, WifiOff
} from 'lucide-react';
import api from '../services/api';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // desktop nav
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Policies', href: '/policies', icon: FileText },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Attendance', href: '/reports', icon: Calendar },
  ];

  // mobile nav (matches screenshot)
  const mobileNav = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Policies', href: '/policies', icon: Settings },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Reports', href: '/reports', icon: BarChart3 }, // fixed route
  ];

  // active state helper (handles nested routes like /employees/123)
  const isActivePath = (href) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const isAttendancePage = location.pathname === '/';

  return (
    <header
      className={`${
        isAttendancePage ? 'bg-gray-800 backdrop-blur-sm border-b border-white/20 px-4 md:px-8 py-4 md:py-6' : 'bg-white border-b border-gray-200 px-4 py-3 shadow-sm sticky top-0 z-50'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Left: Brand */}
            {isAttendancePage ? (
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl flex items-center justify-center">
                  <Camera className=" md:w-6 md:h-6 lg:w-6 lg:h-6 text-slate-900" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold text-white">Attendance system</h1>
                  <p className="text-xs md:text-sm text-slate-300">Attendance system</p>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-base md:text-lg font-semibold text-gray-900">Admin Panel</h1>
                <span className="hidden md:inline-block text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Logged in as Admin</span>
              </>
            )}
          </div>

          {/* Right side */}
          {isAttendancePage ? (
            <div className="flex items-center gap-3 md:gap-6">
              <div className="text-right">
                <div className="text-xl md:text-3xl font-bold text-white">{formatTime(currentTime)}</div>
                <div className="text-xs md:text-sm text-slate-300">{formatDate(currentTime)}</div>
              </div>
              <Link
                to="/login"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </Link>
              <div className="flex items-center gap-2">
                {isOnline ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <div className="h-6 w-px bg-gray-300 mx-2" />
                <button
                  onClick={async () => {
                    try {
                      await api.logout();
                    } catch (e) {
                      console.error('Logout failed:', e);
                    } finally {
                      window.location.href = '/login';
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
              {/* Mobile menu button for non-attendance */}
              <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-6 h-6 " /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE SHEET */}
      {isMenuOpen && !isAttendancePage && (
        <div className="lg:hidden mt-4 space-y-2">
          <hr className="border-gray-200" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
          <button
            onClick={async () => {
              try {
                await api.logout();
              } catch (e) {
                console.error('Logout failed:', e);
              } finally {
                window.location.href = '/login';
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;