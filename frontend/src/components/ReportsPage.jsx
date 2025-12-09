import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Clock, LogOut, Users, Filter, Mail } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

// This component is a visual refinement of the original AttendanceReportsPage
// to more closely match the provided screenshot (larger calendar tiles, compact header,
// bold month label, color legend, and card-like detailed logs with pagination).

export default function AttendanceReportsPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [selectedReportType, setSelectedReportType] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [departments, setDepartments] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const monthDate = new Date(selectedYear, selectedMonth, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const startingDay = new Date(selectedYear, selectedMonth, 1).getDay();

  const formatLocalYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateKey = (year, monthIndex, day) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  function getStatusColor(status) {
    switch (status) {
      case 'Present': return 'bg-green-500 text-white';
      case 'Late Arrival': return 'bg-purple-500 text-white';
      case 'Absent': return 'bg-red-500 text-white';
      case 'Holiday': return 'bg-blue-500 text-white';
      case 'On Leave': return 'bg-orange-500 text-white';
      case 'Early Departure': return 'bg-pink-500 text-white';
      case 'Half Day': return 'bg-yellow-500 text-white';
      default: return '';
    }
  }

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data || []);
      const uniqueDepts = [...new Set((data || []).map(emp => emp.department).filter(Boolean))];
      setDepartments(uniqueDepts);
      setFilteredEmployees(data || []);
      if (data && data.length > 0 && !selectedEmployee) {
        setSelectedEmployee(data[0].employee_id);
      }
    } catch (err) {
      if (err?.response?.status === 401) navigate('/login');
      setError('Failed to fetch employees');
    }
  };



  const fetchAttendance = async () => {
    if (!selectedEmployee) return;
    setLoading(true); setError(null);
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const data = await api.getEmployeeMonthlyAttendance(selectedEmployee, year, month);
      const recordMap = {};
      (data || []).forEach(record => {
        const dateKey = record.date;
        recordMap[dateKey] = {
          status: record.status,
          checkIn: record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          checkOut: record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          totalHours: record.total_hours || '-',
          breaks: record.breaks || [],
          holiday: record.holiday || null,
          leaveReason: record.leave_reason || null
        };
      });



      setAttendanceRecords(recordMap);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) navigate('/login');
      setError('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchAttendance(); }, [selectedEmployee, selectedYear, selectedMonth]);

  useEffect(() => {
    const id = setInterval(() => { if (selectedEmployee) fetchAttendance(); }, 30000);
    return () => clearInterval(id);
  }, [selectedEmployee, selectedYear, selectedMonth]);

  // Filter employees based on selected department
  useEffect(() => {
    const newFiltered = selectedDepartment ? employees.filter(emp => emp.department === selectedDepartment) : employees;
    setFilteredEmployees(newFiltered);
    // Reset selectedEmployee if not in new filtered list
    if (selectedEmployee && !newFiltered.some(emp => emp.employee_id === selectedEmployee)) {
      setSelectedEmployee(newFiltered.length > 0 ? newFiltered[0].employee_id : null);
    }
  }, [selectedDepartment, employees]);

  // Handle filter application
  const handleApplyFilter = () => {
    setShowFilterModal(false);
  };

  // Handle filter reset
  const handleResetFilter = () => {
    setSelectedDepartment(null);
    setShowFilterModal(false);
  };

  // Close dropdown when clicking outside


  const buildCalendar = () => {
    const cells = [];
    const year = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const todayKey = formatLocalYMD(new Date());

    for (let i = 0; i < startingDay; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(year, m, d);
      const cellDate = new Date(year, m, d);
      const cellKeyISO = formatLocalYMD(cellDate);
      let rec = attendanceRecords[key];

      if (!rec) {
        const yesterdayKey = new Date(today);
        yesterdayKey.setDate(yesterdayKey.getDate() - 1);
        const yesterdayKeyStr = formatLocalYMD(yesterdayKey);
        const dayOfWeek = cellDate.getDay();
        if (cellKeyISO <= yesterdayKeyStr && selectedEmployee && dayOfWeek !== 0 && dayOfWeek !== 6) {
          rec = { status: 'Absent', checkIn: '-', checkOut: '-', totalHours: '-', holiday: null };
        }
      }

      cells.push({ day: d, key, rec, date: cellDate });
    }

    return cells;
  };

  const cells = buildCalendar();

  const allLogs = cells
    .filter(Boolean)
    .filter(c => c.rec)
    .map(c => ({ date: c.key, ...c.rec }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const pagedLogs = loading ? Array(pageSize).fill({ skeleton: true }) : allLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(allLogs.length / pageSize));

  const handleExport = async () => {
    if (!selectedEmployee) return;
    if (selectedReportType === 'custom' && (!customStartDate || !customEndDate)) {
      setError('Please select both start and end dates for custom range');
      return;
    }
    if (selectedReportType === 'custom' && new Date(customStartDate) > new Date(customEndDate)) {
      setError('Start date cannot be after end date');
      return;
    }
    try {
      let blob, filename;
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;

      if (selectedReportType === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        blob = await api.exportEmployeeDailyAttendance(selectedEmployee, today);
        filename = `attendance-daily-${selectedEmployee}-${today}.csv`;
      } else if (selectedReportType === 'monthly') {
        blob = await api.exportEmployeeMonthlyAttendance(selectedEmployee, year, month);
        filename = `attendance-monthly-${selectedEmployee}-${year}-${month}.csv`;
      } else if (selectedReportType === 'custom') {
        blob = await api.exportEmployeeCustomRangeAttendance(selectedEmployee, customStartDate, customEndDate);
        filename = `attendance-custom-${selectedEmployee}-${customStartDate}-to-${customEndDate}.csv`;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowExportModal(false);
    } catch (err) {
      if (err?.response?.status === 401) navigate('/login');
      setError('Failed to download attendance records');
    }
  };

  const handleEmailReport = async () => {
    if (!selectedEmployee || !email) {
      setError('Please select an employee and enter an email address');
      return;
    }
    if (selectedReportType === 'custom' && (!customStartDate || !customEndDate)) {
      setError('Please select both start and end dates for custom range');
      return;
    }
    if (selectedReportType === 'custom' && new Date(customStartDate) > new Date(customEndDate)) {
      setError('Start date cannot be after end date');
      return;
    }
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      await api.emailEmployeeAttendanceReport(
        selectedEmployee,
        email,
        selectedReportType,
        year,
        month,
        customStartDate,
        customEndDate
      );
      setShowEmailModal(false);
      setEmail('');
      setError(null);
      // You might want to show a success message here
    } catch (err) {
      if (err?.response?.status === 401) navigate('/login');
      setError('Failed to send email report');
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="p-3 space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance Calendar</h1>
            <p className="text-md text-gray-500">View attendance records</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowFilterModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filter
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={loading || !selectedEmployee}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
              Email Report
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              disabled={loading || !selectedEmployee}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {loading ? 'Export' : 'Export'}
            </button>
          </div>
        </div>

        {/* Controls and Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
              <div className="relative">
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:border-gray-400 transition-colors"
                  value={selectedEmployee || ''}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  disabled={loading}
                >
                  {filteredEmployees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>{emp.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handlePreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-900 text-center">{monthName}</h2>
              <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1"></div>
          </div>

          {error && <div className="text-rose-500 text-sm">{error}</div>}

          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Sun</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Mon</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Tue</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Wed</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Thu</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Fri</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {/* leading placeholders */}
            {cells.slice(0, startingDay).map((_, i) => <div key={`lead-${i}`} className="aspect-square" />)}

            {cells.slice(startingDay).map((c, idx) => {
              const status = c.rec?.status;
              const colorClass = getStatusColor(status);
              const isWeekend = new Date(c.key).getDay() === 0 || new Date(c.key).getDay() === 6;

              return (
                <div key={`${c.key}-${idx}`} className={`aspect-square border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-md ${status ? colorClass : isWeekend ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
                  <div className="h-full flex flex-col">

                    {/* Day */}
                    <span className={`text-sm font-semibold mb-1 ${status ? 'text-white' : 'text-gray-700'}`}>{c.day}</span>

                    {/* Status details */}
                    <div className="flex-1 flex flex-col justify-center text-xs">
                      {c.rec ? (
                        <>
                          {status === 'Holiday' ? (
                            <span className={`font-medium ${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.holiday?.name || 'Holiday'}</span>
                          ) : status === 'On Leave' ? (
                            <span className={`font-medium ${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.leaveReason || 'Sick Leave'}</span>
                          ) : status === 'Present' || status === 'Late Arrival' || status === 'Early Departure' || status === 'Half Day' ? (
                            <>
                              <span className={`${status ? 'text-white' : 'text-gray-700'}`}>In: {c.rec.checkIn}</span>
                              <span className={`${status ? 'text-white' : 'text-gray-700'}`}>Out: {c.rec.checkOut}</span>
                            </>
                          ) : (
                            <span>&nbsp;</span>
                          )}
                        </>
                      ) : (
                        <span>&nbsp;</span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 md:gap-4">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded"></div><span className="text-sm text-gray-700">Present</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div><span className="text-sm text-gray-700">Half Day</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded"></div><span className="text-sm text-gray-700">Absent</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded"></div><span className="text-sm text-gray-700">Holiday</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 rounded"></div><span className="text-sm text-gray-700">On Leave</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-500 rounded"></div><span className="text-sm text-gray-700">Late Arrival</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-pink-500 rounded"></div><span className="text-sm text-gray-700">Early Departure</span></div>
          </div>
        </div>

        {/* Detailed Attendance Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Calendar className="w-5 h-5" /> Detailed Attendance Logs</h2>

          <div className="space-y-4">
            {pagedLogs.map((log, i) => (
              <div key={log.skeleton ? i : log.date} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  {log.skeleton ? (
                    <>
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mt-2"></div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(n => (
                          <div key={n} className="flex items-start gap-3">
                            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mt-1"></div>
                            <div>
                              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        <p className="text-sm text-gray-600">
                          {(() => {
                            const employee = employees.find(emp => emp.employee_id === selectedEmployee);
                            const policy = employee?.policy;
                            if (policy) {
                              return `${policy.name} (${policy.status === 'active' ? 'Active' : 'Inactive'})`;
                            }
                            return 'No Policy';
                          })()}
                        </p>
                          
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${log.status === 'Present' ? 'bg-green-100 text-green-700' :
                        log.status === 'Absent' ? 'bg-red-100 text-red-800' :
                          log.status === 'Late Arrival' ? 'bg-purple-100 text-purple-800' :
                            log.status === 'Early Departure' ? 'bg-pink-100 text-pink-800' :
                              log.status === 'Holiday' ? 'bg-blue-100 text-blue-800' :
                                log.status === 'On Leave' ? 'bg-orange-100 text-orange-800' :
                                  log.status === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                        }`}>{log.status}</span>
                    </>
                  )}
                </div>

                {!log.skeleton && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Check-In</p>
                        <p className="text-base font-semibold text-gray-900">{log.checkIn}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <LogOut className="w-5 h-5 text-red-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Check-Out</p>
                        <p className="text-base font-semibold text-gray-900">{log.checkOut}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Total Duration</p>
                        <p className="text-base font-semibold text-gray-900">{log.totalHours}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-purple-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Re-entries</p>
                        <p className="text-base font-semibold text-gray-900">{Array.isArray(log.breaks) ? log.breaks.length : (log.breaks || 0)} times</p>
                      </div>
                    </div>
                  </div>
                )}

                {log.breaks && log.breaks.length > 0 && (
                  <>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Break Details:</p>
                      {log.breaks.map((b, idx) => (
                        <div key={idx} className="flex gap-4 text-sm">
                          <span className="text-gray-700">Start: {b.break_start ? new Date(b.break_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>
                          <span className="text-gray-700">End: {b.break_end ? new Date(b.break_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 gap-4">
            <p className="text-sm text-gray-600">Showing {pagedLogs.length} of {allLogs.length} records</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}>Previous</button>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">{page}</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}>Next</button>
            </div>
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Attendance Report</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                  <div className="relative">
                    <select
                      value={selectedReportType}
                      onChange={(e) => setSelectedReportType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:border-gray-400 transition-colors"
                    >
                      <option value="daily">Daily (CSV)</option>
                      <option value="monthly">Monthly (CSV)</option>
                      <option value="custom">Custom range (CSV)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {selectedReportType === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Downloading...' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Employees</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <div className="relative">
                    <select
                      value={selectedDepartment || ''}
                      onChange={(e) => setSelectedDepartment(e.target.value || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:border-gray-400 transition-colors"
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleResetFilter}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilter}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Attendance Report</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom range</option>
                  </select>
                </div>

                {selectedReportType === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmail('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailReport}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
