import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Camera, BarChart3, Settings, Clock, Users, Lock, LogOut, Wifi, WifiOff
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
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Policies', href: '/policies', icon: Settings },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
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
        isAttendancePage ? 'bg-gray-700 backdrop-blur-sm border-b border-white/20 px-4 md:px-8 py-4 md:py-6' : 'bg-white shadow-lg border-b border-gray-200'
      } ${!isAttendancePage ? 'fixed top-0 left-0 right-0 z-50 w-full' : ''}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 md:gap-4">
          {isAttendancePage ? (
            <>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl flex items-center justify-center">
                <Camera className="w-6 h-6 md:w-8 md:h-8 text-slate-900" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-white">TechCorp Solutions</h1>
                <p className="text-xs md:text-sm text-slate-300">Attendance Kiosk</p>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-900">Admin Panel</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 font-normal text-sm rounded">Logged in as Admin</span>
            </div>
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
          <div className="flex items-center space-x-4">
            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center space-x-6">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active ? 'bg-[#3498DB] text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <div className="h-6 w-px bg-gray-300" />
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
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </nav>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}
      </div>

        {/* MOBILE SHEET */}
        {isMenuOpen && !isAttendancePage && (
          <div className="lg:hidden">
            <div className="mt-2 rounded-xl">
              <div className="p-3 grid grid-cols-2 gap-3">
                {mobileNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`inline-flex items-center justify-start gap-2 rounded-lg px-4 py-3 text-sm font-medium transition
                        ${active
                          ? 'bg-[#3498DB] text-white border border-[#3498DB]'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                {/* Full-width Logout */}
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
                  className="col-span-2 inline-flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium
                             bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 "
                >
                  <LogOut className="w-4 h-4  " />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </header>
  );
};

export default Header;