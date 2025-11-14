import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isAttendancePage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main>
        {children}
      </main>
      {isAttendancePage && <Footer />}
    </div>
  );
};

export default Layout;
