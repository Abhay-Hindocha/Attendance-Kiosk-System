import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle, XCircle, Calendar, Clock, TrendingUp, Mail, Phone, AlertCircle } from 'lucide-react';
import ApiService from '../services/api';

const StatsModal = ({ isOpen, onClose, statType, statValue }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && statType) {
      fetchData();
    }
  }, [isOpen, statType]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let response;
      switch (statType) {
        case 'total_employees':
          response = await ApiService.getEmployees();
          setData(response);
          break;
        case 'present_today':
          response = await ApiService.getPresentToday();
          setData(response);
          break;
        case 'absent_today':
          response = await ApiService.getAbsentToday();
          setData(response);
          break;
        case 'on_leave':
          response = await ApiService.getOnLeaveToday();
          setData(response);
          break;
        case 'late_arrivals':
          response = await ApiService.getLateArrivalsToday();
          setData(response);
          break;
        case 'early_departures':
          response = await ApiService.getEarlyDeparturesToday();
          setData(response);
          break;
        default:
          setData([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (statType) {
      case 'total_employees': return 'Total Employees';
      case 'present_today': return 'Present Today';
      case 'absent_today': return 'Absent Today';
      case 'on_leave': return 'On Leave';
      case 'late_arrivals': return 'Late Arrivals';
      case 'early_departures': return 'Early Departures';
      default: return 'Details';
    }
  };

  const getIcon = () => {
    switch (statType) {
      case 'total_employees': return <Users className="w-6 h-6 text-blue-600" />;
      case 'present_today': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'absent_today': return <XCircle className="w-6 h-6 text-red-600" />;
      case 'on_leave': return <Calendar className="w-6 h-6 text-yellow-600" />;
      case 'late_arrivals': return <Clock className="w-6 h-6 text-orange-600" />;
      case 'early_departures': return <TrendingUp className="w-6 h-6 text-purple-600" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  const getHeaderTitle = () => {
    switch (statType) {
      case 'total_employees': return 'All Employees';
      case 'present_today': return 'Employees Present Today';
      case 'absent_today': return 'Employees Absent Today';
      case 'on_leave': return 'Employees On Leave';
      case 'late_arrivals': return 'Late Arrivals Today';
      case 'early_departures': return 'Early Departures Today';
      default: return 'Details';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{getHeaderTitle()}</h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">{statValue} records</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!isLoading && !error && data.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No data available</p>
            </div>
          )}

          {!isLoading && !error && data.length > 0 && (
            <div className="space-y-4">
              {data.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {item.name ? item.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'N/A'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name || item.employee?.name || `Employee ${item.employee_id || item.id}`}</h3>
                          <p className="text-sm text-gray-600">{item.department || item.employee?.department || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{item.email || item.employee?.email || 'N/A'}</span>
                        </div>
                        {statType === 'early_departures' ? (
                          <>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{item.phone || item.employee?.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Check-out: {item.check_out_time || item.employee?.check_out_time || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-purple-600">
                              <AlertCircle className="w-4 h-4" />
                              <span>Early by: {item.early_minutes || item.employee?.early_minutes || 'N/A'} mins</span>
                            </div>
                          </>
                        ) : statType === 'late_arrivals' ? (
                          <>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Check-in: {item.check_in_time}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-orange-600">
                              <AlertCircle className="w-4 h-4" />
                              <span>Late by: {item.late_minutes || item.employee?.late_minutes || 'N/A'} mins</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{item.phone || item.employee?.phone || 'N/A'}</span>
                            </div>
                            {item.check_in_time && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Check-in: {item.check_in_time}</span>
                              </div>
                            )}
                            {item.check_out_time && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Check-out: {item.check_out_time}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'present' ? 'bg-green-100 text-green-700' :
                          item.status === 'absent' ? 'bg-red-100 text-red-700' :
                          item.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Manage Employees Button */}
        <div className="flex justify-end p-4 border-t bg-gray-50">
          <button
            onClick={() => window.location.href = '/employees'}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Manage Employees
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
