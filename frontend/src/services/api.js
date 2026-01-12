// This is the ApiService class, which handles all HTTP communication with the backend API.
// It provides a centralized way to make API calls, handle authentication, and manage responses.
// The service uses the Fetch API and includes automatic token handling and error management.

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL; // Base URL for the Laravel backend API

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL; // Initialize the base URL for API requests
  }

  // Generic request method that handles all HTTP requests to the API
  // Automatically includes authentication headers and handles common error cases
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`; // Construct the full URL
    const token = localStorage.getItem('authToken'); // Get auth token from local storage
    const { headers: extraHeaders = {}, ...restOptions } = options;
    const isFormData = restOptions.body instanceof FormData;

    const config = {
      headers: {
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      ...restOptions,
    };

    try {
      const response = await fetch(url, config); // Make the HTTP request

      if (!response.ok) { // If response is not successful (status not 2xx)
        let errorData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json(); // Parse JSON error response
          // Handle Laravel validation errors specifically
          if (response.status === 422 && errorData.errors) {
            const messages = Object.values(errorData.errors).flat(); // Flatten error messages
            throw { message: messages.join(' ') }; // Throw combined error message
          }
        } else {
          // If response is not JSON (e.g., HTML error page), use text
          const text = await response.text();
          errorData = { message: text };
        }
        throw errorData; // Throw the error to be caught by the caller
      }

      // Handle different response types
      if (options.responseType === 'blob') {
        return response.blob(); // Return blob for file downloads
      } else {
        return response.json(); // Return parsed JSON for regular responses
      }
    } catch (error) {
      console.error('API request failed:', error); // Log errors for debugging
      throw error; // Re-throw the error
    }
  }

  // Generic HTTP methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data, options = {}) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, { method: 'POST', body, ...options });
  }

  async put(endpoint, data, options = {}) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, { method: 'PUT', body, ...options });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  // Authentication methods
  async login(credentials) {
    // Use the generic post helper so the `Accept: application/json` header
    // (and other standard headers) are included. This prevents Laravel from
    // returning an HTML redirect on validation errors when the request
    // doesn't declare it expects JSON.
    const data = await this.post('/login', credentials);
    // Store the token
    localStorage.setItem('authToken', data.token);
    return data;
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      // Always clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('isAuthenticated');
    }
  }

  async getCurrentUser() {
    return this.request('/user');
  }

  // Employee endpoints
  async getEmployees() {
    return this.request('/employees');
  }

  async createEmployee(employeeData) {
    const isFormData = employeeData instanceof FormData;
    return this.request('/employees', {
      method: 'POST',
      body: isFormData ? employeeData : JSON.stringify(employeeData),
    });
  }

  async updateEmployee(id, employeeData) {
    const isFormData = employeeData instanceof FormData;
    return this.request(`/employees/${id}`, {
      method: 'PUT',
      body: isFormData ? employeeData : JSON.stringify(employeeData),
    });
  }

  async deleteEmployee(id) {
    return this.request(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // Policy endpoints
  async getPolicies() {
    return this.request('/policies');
  }

  async createPolicy(policyData) {
    return this.request('/policies', {
      method: 'POST',
      body: JSON.stringify(policyData),
    });
  }

  async updatePolicy(id, policyData) {
    return this.request(`/policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(policyData),
    });
  }

  async deletePolicy(id) {
    return this.request(`/policies/${id}`, {
      method: 'DELETE',
    });
  }

  async togglePolicyStatus(id) {
    return this.request(`/policies/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  // Leave policy endpoints
  async getLeavePolicies(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/leave-policies?${queryString}` : '/leave-policies';
    return this.request(endpoint);
  }

  async createLeavePolicy(payload) {
    return this.request('/leave-policies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateLeavePolicy(id, payload) {
    return this.request(`/leave-policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async copyLeavePolicy(id) {
    return this.request(`/leave-policies/${id}/copy`, {
      method: 'POST',
    });
  }

  async toggleLeavePolicyStatus(id) {
    return this.request(`/leave-policies/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  async deleteLeavePolicy(id) {
    return this.request(`/leave-policies/${id}`, {
      method: 'DELETE',
    });
  }

  // Leave assignments
  async getEmployeeLeavePolicies(employeeId) {
    return this.request(`/employees/${employeeId}/leave-policies`);
  }

  async assignLeavePolicies(employeeId, policyIds) {
    return this.request(`/employees/${employeeId}/leave-policies`, {
      method: 'POST',
      body: JSON.stringify({ policy_ids: policyIds }),
    });
  }

  async detachLeavePolicy(employeeId, policyId) {
    return this.request(`/employees/${employeeId}/leave-policies/${policyId}`, {
      method: 'DELETE',
    });
  }

  // Leave requests
  async getLeaveRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/leave/requests?${queryString}` : '/leave/requests';
    return this.request(endpoint);
  }

  async getLeaveRequest(id) {
    return this.request(`/leave/requests/${id}`);
  }

  async getLeaveApprovals(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/leave/approvals?${queryString}` : '/leave/approvals';
    return this.request(endpoint);
  }

  async createLeaveRequest(formData) {
    return this.request('/leave/requests', {
      method: 'POST',
      body: formData,
    });
  }

  async cancelLeaveRequest(id) {
    return this.request(`/leave/requests/${id}/cancel`, {
      method: 'POST',
    });
  }

  async approveLeaveRequest(id, payload = {}) {
    return this.request(`/leave/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async rejectLeaveRequest(id, payload = {}) {
    return this.request(`/leave/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async requestLeaveClarification(id, payload) {
    return this.request(`/leave/requests/${id}/clarify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async overwriteLeaveRequestDates(id, payload) {
    return this.request(`/leave/requests/${id}/overwrite-dates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getEmployeeLeaveRequests(employeeId) {
    return this.request(`/leave/requests?employee_id=${employeeId}`);
  }

  async getCorrectionData() {
    return this.request('/leave/correction-data');
  }

  async applyLeaveCorrection(payload) {
    return this.request('/leave/manual-correction', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Attendance endpoints
  async getAttendances(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/attendances?${queryString}` : '/attendances';
    return this.request(endpoint);
  }

  async createAttendance(attendanceData) {
    return this.request('/attendances', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  async updateAttendance(id, attendanceData) {
    return this.request(`/attendances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(attendanceData),
    });
  }

  async deleteAttendance(id) {
    return this.request(`/attendances/${id}`, {
      method: 'DELETE',
    });
  }

  async markAttendance(employeeId) {
    return this.request('/attendances/mark', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    });
  }

  // Face endpoints
  async enrollFace(employeeId, descriptors, metadata = {}) {
    return this.request('/faces/enroll', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, descriptors, metadata }),
    });
  }

  async recognizeFace(descriptor, threshold = 0.6) {
    return this.request('/faces/recognize', {
      method: 'POST',
      body: JSON.stringify({ descriptor, threshold }),
    });
  }

  async unenrollFace(employeeId) {
    return this.request('/faces/unenroll', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    });
  }

  // Dashboard endpoints
  async getDashboardData() {
    return this.request('/attendance/dashboard');
  }

  async getAttendanceStats() {
    return this.request('/attendance/stats');
  }

  async getDepartmentStats() {
    return this.request('/attendance/departments');
  }

  async getAttendanceTrends() {
    return this.request('/attendance/trends');
  }

  async getLiveActivity() {
    return this.request('/attendance/live');
  }

  async getPresentToday() {
    return this.request('/attendance/present-today');
  }

  async getAbsentToday() {
    return this.request('/attendance/absent-today');
  }

  async getOnLeaveToday() {
    return this.request('/attendance/on-leave-today');
  }

  async getLateArrivalsToday() {
    return this.request('/attendance/late-arrivals-today');
  }

  async getEarlyDeparturesToday() {
    return this.request('/attendance/early-departures-today');
  }

  // Employee Monthly Attendance
  async getEmployeeMonthlyAttendance(employeeId, year, month) {
    return this.request(`/attendance/employee/${employeeId}/${year}/${month}`);
  }

  // Export Employee Monthly Attendance
  async exportEmployeeMonthlyAttendance(employeeId, year, month) {
    return this.request(`/attendance/export/employee/${employeeId}/${year}/${month}`, {
      responseType: 'blob'
    });
  }

  // Export Employee Daily Attendance
  async exportEmployeeDailyAttendance(employeeId, date) {
    return this.request(`/attendance/export/daily/employee/${employeeId}/${date}`, {
      responseType: 'blob'
    });
  }

  // Export Employee Custom Range Attendance
  async exportEmployeeCustomRangeAttendance(employeeId, startDate, endDate) {
    return this.request(`/attendance/export/custom/employee/${employeeId}/${startDate}/${endDate}`, {
      responseType: 'blob'
    });
  }

  // Email Employee Attendance Report
  async emailEmployeeAttendanceReport(employeeId, email, reportType, year, month, startDate, endDate) {
    return this.request('/attendance/email', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        email,
        report_type: reportType,
        year,
        month,
        start_date: startDate,
        end_date: endDate
      }),
    });
  }


}

export default new ApiService();
