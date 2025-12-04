const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;
const EMPLOYEE_TOKEN_KEY = 'employeeAuthToken';

class EmployeeApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  get token() {
    return localStorage.getItem(EMPLOYEE_TOKEN_KEY);
  }

  set token(value) {
    if (value) {
      localStorage.setItem(EMPLOYEE_TOKEN_KEY, value);
    } else {
      localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    const isFormData = options.body instanceof FormData;

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {
        error = { message: 'Something went wrong.' };
      }
      throw error;
    }

    if (options.responseType === 'blob') {
      return response.blob();
    }

    return response.json();
  }

  async login(credentials) {
    const data = await this.request('/employee/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.token = data.token;
    localStorage.setItem('employeeProfile', JSON.stringify(data.employee));
    return data;
  }

  async logout() {
    try {
      await this.request('/employee/logout', { method: 'POST' });
    } finally {
      this.token = null;
      localStorage.removeItem('employeeProfile');
    }
  }

  async requestPasswordOtp(email) {
    return this.request('/employee/password/otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(payload) {
    return this.request('/employee/password/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getProfile() {
    return this.request('/employee/profile');
  }

  async getDashboard() {
    return this.request('/employee/portal/dashboard');
  }

  async getLeaveBalances() {
    return this.request('/employee/portal/leave-balances');
  }

  async getAttendanceReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/employee/portal/attendance?${query}` : '/employee/portal/attendance';
    return this.request(endpoint);
  }

  async exportAttendanceReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/employee/portal/attendance/export?${query}` : '/employee/portal/attendance/export';
    return this.request(endpoint, { responseType: 'blob' });
  }

  async getLeaveRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/leave/requests?${query}` : '/leave/requests';
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

  async getHolidays(year = new Date().getFullYear()) {
    return this.request(`/employee/portal/holidays?year=${year}`);
  }
}

export default new EmployeeApiService();

