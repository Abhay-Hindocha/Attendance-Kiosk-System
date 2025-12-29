import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Camera, LayoutDashboard, FileText, Calendar, BarChart3, Settings, Clock, Users, Lock, LogOut, Wifi, WifiOff, ClipboardCheck, ChevronDown
} from 'lucide-react';
import api from '../services/api';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPoliciesDropdownOpen, setIsPoliciesDropdownOpen] = useState(false);
  const [isRequestsDropdownOpen, setIsRequestsDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const dropdownRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsPoliciesDropdownOpen(false);
        setIsRequestsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // desktop nav
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    {
      name: 'Policies',
      icon: FileText,
      dropdown: true,
      items: [
        { name: 'Attendance Policies', href: '/policies', icon: FileText },
        { name: 'Leave Policies', href: '/leave/policies', icon: Calendar }
      ]
    },
    {
      name: 'Requests',
      icon: ClipboardCheck,
      dropdown: true,
      items: [
        { name: 'Leave Approvals', href: '/leave/approvals', icon: ClipboardCheck },
        { name: 'Attendance Corrections', href: '/admin/correction-requests', icon: Clock }
      ]
    },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  // mobile nav
  const mobileNav = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Attendance Policies', href: '/policies', icon: Settings },
    { name: 'Leave Policies', href: '/leave/policies', icon: Calendar },
    { name: 'Leave Approvals', href: '/leave/approvals', icon: ClipboardCheck },
    { name: 'Attendance Corrections', href: '/admin/correction-requests', icon: Clock },
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
      className={`${isAttendancePage ? 'bg-white/10 backdrop-blur-sm border-b border-white/20 px-4 md:px-8 py-4 md:py-6' : 'bg-white border-b border-gray-200 px-4 py-3 shadow-sm sticky top-0 z-50'
        }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Left: Brand */}
            {isAttendancePage ? (
              <div className="flex items-center space-x-3 md:space-x-4">
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
                <h1 className="text-base md:text-lg font-semibold text-gray-900 relative">Admin Panel</h1>
                <span className="hidden md:inline-block text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded ml-2">Logged in as Admin</span>
              </>
            )}
          </div>

          {/* Right side */}
          {isAttendancePage ? (
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-6">
              <div className="text-right">
                <div className="text-lg sm:text-xl md:text-3xl font-bold text-white">{formatTime(currentTime)}</div>
                <div className="text-xs md:text-sm text-slate-300">{formatDate(currentTime)}</div>
              </div>
              <Link
                to="/login"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 text-sm"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <div className="flex items-center">
                {isOnline ? <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" /> : <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div ref={dropdownRef} className="hidden lg:flex items-center space-x-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  if (item.dropdown) {
                    const isDropdownActive = item.items.some(subItem => isActivePath(subItem.href));
                    const isOpen = item.name === 'Policies' ? isPoliciesDropdownOpen : isRequestsDropdownOpen;
                    const setIsOpen = item.name === 'Policies' ? setIsPoliciesDropdownOpen : setIsRequestsDropdownOpen;
                    return (
                      <div key={item.name} className="relative">
                        <button
                          onClick={() => setIsOpen(!isOpen)}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDropdownActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            {item.items.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const subActive = isActivePath(subItem.href);
                              return (
                                <Link
                                  key={subItem.name}
                                  to={subItem.href}
                                  onClick={() => setIsOpen(false)}
                                  className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${subActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                  <SubIcon className="w-4 h-4" />
                                  <span>{subItem.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const active = isActivePath(item.href);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => {
                          setIsPoliciesDropdownOpen(false);
                          setIsRequestsDropdownOpen(false);
                        }}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  }
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
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
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
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors
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
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
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