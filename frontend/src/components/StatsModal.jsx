import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle, XCircle, Calendar, Clock, TrendingUp } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
            <span className="text-sm text-gray-500">({statValue})</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.name || item.employee?.name || `Employee ${item.employee_id || item.id}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.department || item.employee?.department || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      {item.check_in_time && (
                        <p className="text-sm text-gray-600">Check-in: {item.check_in_time}</p>
                      )}
                      {item.check_out_time && (
                        <p className="text-sm text-gray-600">Check-out: {item.check_out_time}</p>
                      )}
                      {item.status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
