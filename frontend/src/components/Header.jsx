import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Camera, BarChart3, Settings, Clock, Users, LogIn, LogOut, Wifi, WifiOff } from 'lucide-react';
import api from '../services/api';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor network connectivity
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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Policies', href: '/policies', icon: Settings },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if we're on the attendance page
  const isAttendancePage = location.pathname === '/';

  return (
    <header className={isAttendancePage ? "bg-[#2C3E50] shadow-lg border-b border-gray-200" : "bg-white shadow-lg border-b border-gray-200"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo on the left for both pages */}
          <div className="flex items-center">
            {isAttendancePage ? (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#2980B9] rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Kiosk Attendance System</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-gray-900">Admin Panel</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 font-normal text-sm rounded">Logged in as Admin</span>
              </div>
            )}
          </div>

          {/* Right side content */}
          {isAttendancePage ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Current Time and Date - visible on mobile with smaller font */}
              <div className="flex items-center space-x-2 text-white">
                <div className="text-right">
                  <div className="text-xs sm:text-sm lg:text-lg font-bold font-medium">{formatTime(currentTime)}</div>
                  <div className="text-xs">{formatDate(currentTime)}</div>
                </div>
              </div>

              {/* Admin Login Button */}
              <Link
                to="/login"
                className="flex items-center space-x-1 sm:space-x-2 bg-[#2980B9] text-white px-2 sm:px-3 lg:px-4 py-2 rounded-lg hover:bg-[#3498DB] transition-colors text-sm"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Login</span>
                <span className="sm:hidden">Login</span>
              </Link>

              {/* WiFi Connectivity Indicator - visible on mobile */}
              <div className="flex">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              {/* Desktop Navigation for Admin */}
              <nav className="hidden lg:flex items-center space-x-6">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#3498DB] text-white'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                {/* Vertical Line */}
                <div className="h-6 w-px bg-gray-300"></div>
                {/* Logout Button */}
                <button
                  onClick={async () => {
                    try {
                      await api.logout();
                    } catch (error) {
                      console.error('Logout failed:', error);
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

              {/* Mobile menu button for Admin */}
              <div className="lg:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900"
                >
                  {isMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Navigation for Admin */}
        {isMenuOpen && !isAttendancePage && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#34495E] rounded-lg mt-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-[#3498DB] text-white'
                        : 'text-gray-300 hover:text-white hover:bg-[#2C3E50]'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              {/* Mobile Logout */}
              <button
                onClick={async () => {
                  try {
                    await api.logout();
                  } catch (error) {
                    console.error('Logout failed:', error);
                  } finally {
                    window.location.href = '/login';
                  }
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
