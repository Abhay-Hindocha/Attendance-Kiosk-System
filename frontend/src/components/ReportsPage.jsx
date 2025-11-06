import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Filter, Download, Clock, LogOut, Users } from 'lucide-react';
import api from '../services/api';

const AttendanceCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date()); 
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesData = await api.get('/employees');
        const data = employeesData || [];
        setEmployees(data);
        if (data.length > 0) {
          setSelectedEmployee(data[0].id);
        }
      } catch (err) {
        setError('Failed to load employees');
        console.error('Error fetching employees:', err);
        setEmployees([]); // Ensure employees is always an array
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      setIsLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (selectedEmployee) params.append('employee_id', selectedEmployee);
        // Calculate start and end dates for the selected month
        const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
        const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
        params.append('start_date', startDate);
        params.append('end_date', endDate);
        params.append('page', page.toString());
        params.append('per_page', pageSize.toString());

        // Fetch attendance data with filters
        const response = await api.get(`/attendance/report?${params.toString()}`);

        // Transform the data into the required format
        const formattedData = {};
        const data = response.data?.records || [];
        data.forEach(record => {
          const date = record.date;
          let status = 'Present';

          if (record.is_late) {
            status = 'Late Entry';
          } else if (record.is_early_departure) {
            status = 'Late Departure';
          } else if (record.is_absent) {
            status = 'Absent';
          } else if (record.is_leave) {
            status = 'On Leave';
          } else if (record.is_holiday) {
            status = 'Holiday';
          }

          formattedData[date] = {
            status,
            checkIn: record.check_in || '-',
            checkOut: record.check_out || '-',
            totalHours: record.total_hours || '-',
            breaks: record.breaks_count ? `${record.breaks_count} times` : '-'
          };
        });

        setAttendanceData(formattedData);
        setTotalPages(Math.ceil(response.data?.total / pageSize) || 1);
        setError(null);
      } catch (err) {
        setError('Failed to load attendance data');
        console.error('Error fetching attendance data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedEmployee, selectedMonth, selectedYear, page, pageSize]);

  // Sync currentMonth with selectedMonth and selectedYear
  useEffect(() => {
    setCurrentMonth(new Date(selectedYear, selectedMonth));
  }, [selectedMonth, selectedYear]);

  const getStatusColor = (status) => {
    const colors = {
      'Present': 'bg-green-500',
      'Late Entry': 'bg-amber-500',
      'Absent': 'bg-red-500',
      'Holiday': 'bg-blue-500',
      'On Leave': 'bg-orange-500',
      'Late Departure': 'bg-pink-500'
    };
    return colors[status] || 'bg-gray-200';
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  // Get detailed logs (last 3 entries)
  const detailedLogs = Object.entries(attendanceData)
    .filter(([date, data]) => data.status === 'Present' || data.status === 'Late Entry')
    .slice(-3)
    .reverse();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance Calendar</h1>
              <p className="text-sm text-gray-500 mt-1">View attendance records</p>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                onClick={async () => {
                  try {
                    // Build query parameters for export
                    const params = new URLSearchParams();
                    if (selectedEmployee) params.append('employee_id', selectedEmployee);
                    // Calculate start and end dates for the selected month
                    const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
                    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
                    params.append('start_date', startDate);
                    params.append('end_date', endDate);

                    const response = await api.get(
                      `/attendance/export?${params.toString()}`,
                      { responseType: 'blob' }
                    );

                    // Create filename based on filters
                    let filename = 'attendance';
                    if (selectedEmployee) filename += `-${selectedEmployee}`;
                    filename += `-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
                    filename += '.csv';

                    // Create download link
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', filename);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Error exporting data:', err);
                    alert('Failed to export attendance data');
                  }
                }}
                disabled={isLoading}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            {/* Employee Selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Select an employee</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
            <div className="flex gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square"></div>
                ))}

                {/* Calendar days */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dateStr = formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const dayData = attendanceData[dateStr];

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-lg p-2 ${
                        dayData 
                          ? `${getStatusColor(dayData.status)} text-white` 
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="text-xs font-medium mb-1">{day}</div>
                      {dayData && (
                        <div className="text-xs">
                          <div className="font-medium truncate">{dayData.status}</div>
                          {dayData.checkIn && (
                            <div className="text-xs opacity-90 mt-1">
                              {dayData.checkIn} - {dayData.checkOut}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-gray-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span className="text-sm text-gray-600">Late Entry</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-gray-600">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm text-gray-600">Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-sm text-gray-600">On Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-pink-500"></div>
              <span className="text-sm text-gray-600">Late Departure</span>
            </div>
          </div>
        </div>

        {/* Detailed Attendance Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Detailed Attendance Logs
          </h2>

          <div className="space-y-4">
            {detailedLogs.map(([date, data], index) => {
              const dateObj = new Date(date);
              const formattedDate = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              });

              return (
                <div key={date} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-gray-900">{formattedDate}</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          {data.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Daily Attended Office Work
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-gray-500">Check-in</div>
                          <div className="font-semibold text-gray-900">{data.checkIn}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-gray-500">Checkout</div>
                          <div className="font-semibold text-gray-900">{data.checkOut}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-gray-500">Total Hours</div>
                          <div className="font-semibold text-gray-900">{data.totalHours}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-gray-500">Breaks</div>
                          <div className="font-semibold text-gray-900">{data.breaks}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, Object.keys(attendanceData).length)} of {Object.keys(attendanceData).length} records
            </div>
            <div className="flex gap-2">
              <button 
                className={`px-3 py-1 border border-gray-300 rounded text-sm ${
                  page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    className={`px-3 py-1 rounded text-sm ${
                      page === pageNum 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button 
                className={`px-3 py-1 border border-gray-300 rounded text-sm ${
                  page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;