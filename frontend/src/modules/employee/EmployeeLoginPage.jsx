import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, AlertCircle, Mail, ArrowLeft } from 'lucide-react';
import employeeApi from '../../services/employeeApi';

const EmployeeLoginPage = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('employeeAuthToken')) {
      navigate('/employee/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await employeeApi.login({ identifier, password });
      navigate('/employee/dashboard');
    } catch (err) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setResetError('');
    setResetMessage('');
    try {
      await employeeApi.requestPasswordOtp(resetEmail);
      setOtpSent(true);
      setResetMessage('OTP sent! Check your email (valid for 10 minutes).');
    } catch (err) {
      setResetError(err?.message || 'Unable to send OTP. Please try again.');
    }
  };

  const handleResetPassword = async () => {
    setResetError('');
    setResetMessage('');
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    try {
      await employeeApi.resetPassword({
        email: resetEmail,
        otp: resetOtp,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setResetMessage('Password updated. You can now log in.');
      setOtpSent(false);
      setResetOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setResetError(err?.message || 'Failed to reset password. Check your OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute top-4 left-4">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          ← Back to Kiosk
        </button>
      </div>

      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Login</h1>
          <p className="text-gray-600">Access your employee portal</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
              Email or Employee ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="e.g. EMP001 or you@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Enter your portal password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <button
          className="mt-4 w-full text-sm text-green-600 hover:text-green-800 font-medium"
          onClick={() => setShowReset((prev) => !prev)}
        >
          {showReset ? 'Hide password reset' : 'Forgot password?'}
        </button>

        {showReset && (
          <div className="mt-6 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Mail className="w-4 h-4 text-green-500" />
              Password reset via email OTP
            </div>
            <input
              type="email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Your registered email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <button
              type="button"
              onClick={handleRequestOtp}
              className="w-full border border-green-200 text-green-600 hover:bg-green-50 rounded-lg py-2 text-sm font-semibold"
            >
              Send OTP
            </button>

            {otpSent && (
              <>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter 6-digit OTP"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                />
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="w-full bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700"
                >
                  Reset Password
                </button>
              </>
            )}

            {resetMessage && <p className="text-xs text-green-600">{resetMessage}</p>}
            {resetError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {resetError}
              </p>
            )}
          </div>
        )}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">Attendance Kiosk System v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLoginPage;

