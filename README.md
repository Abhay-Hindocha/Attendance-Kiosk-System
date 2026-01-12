# Attendance Kiosk System

A comprehensive attendance management system featuring face recognition technology, built with a Laravel backend and React frontend. This system allows organizations to efficiently track employee attendance, manage leave policies, handle attendance corrections, and generate detailed reports.

## Project Structure

This project consists of two main components:

- **Backend** (`backend/`): Laravel-based API server handling data management, authentication, business logic, and face recognition processing.
- **Frontend** (`frontend/`): React-based user interface for administrators and employees to interact with the system, featuring a responsive design suitable for kiosk screens and mobile devices.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Laravel)     │◄──►│   (MySQL)       │
│                 │    │                 │    │                 │
│ - Face Recognition│   │ - RESTful APIs │    │ - Employees     │
│ - Admin Dashboard│   │ - Authentication│    │ - Attendance    │
│ - Employee Portal│   │ - Business Logic│    │ - Policies      │
│ - Reports        │   │ - File Uploads  │    │ - Leave Mgmt    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Features

### Core Features
- **Face Recognition**: Advanced facial recognition using TensorFlow.js models for secure and automated attendance tracking
- **Real-time Attendance Tracking**: Check-in/check-out with break time management and automatic status calculation
- **Employee Management**: Complete CRUD operations for employee profiles with department and policy assignments

### Leave Management
- **Leave Policies**: Flexible leave policy configuration with accrual rules, eligibility criteria, and balance tracking
- **Leave Requests**: Employee self-service leave application with approval workflows
- **Leave Approvals**: Multi-level approval system with admin dashboard for leave management
- **Leave Balances**: Automatic leave balance calculation and carry-forward rules

### Attendance Corrections
- **Correction Requests**: Employee-initiated attendance correction requests
- **Admin Corrections**: Administrative tools for manual attendance adjustments
- **Audit Trail**: Complete audit logging for all attendance modifications

### Reporting & Analytics
- **Dashboard Analytics**: Real-time statistics including present/absent counts, trends, and department-wise breakdowns
- **Employee Reports**: Individual attendance reports with export capabilities (CSV/PDF)
- **Custom Date Range Reports**: Flexible reporting for any date range
- **Live Activity Feed**: Real-time activity monitoring

### Administration
- **Policy Management**: Configurable attendance policies with grace periods and tracking rules
- **Holiday Management**: Public holiday configuration and automatic attendance adjustments
- **User Roles**: Separate admin and employee portals with appropriate permissions
- **Email Notifications**: Automated notifications for corrections and reports

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **For Backend**:
  - PHP 8.1 or higher
  - Composer (PHP dependency manager)
  - MySQL 5.7+ or MariaDB 10.3+
  - Node.js and npm (for asset compilation)

- **For Frontend**:
  - Node.js (version 16 or higher)
  - npm or yarn package manager

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd attendance-kiosk-system
   ```

2. **Set up the Backend**:
   ```bash
   cd backend
   composer install
   cp .env.example .env
   # Configure your database settings in .env
   php artisan key:generate
   php artisan migrate
   php artisan db:seed
   php artisan serve
   ```

3. **Set up the Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Access the Application**:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8000`

## API Documentation

The backend provides comprehensive RESTful APIs organized into the following categories:

### Authentication Endpoints
- `POST /api/login` - Admin authentication
- `POST /api/employee/login` - Employee portal authentication
- `POST /api/logout` - Session termination

### Public Endpoints (Kiosk Access)
- `POST /api/faces/recognize` - Face recognition for attendance
- `POST /api/attendances/mark` - Mark attendance (check-in/out)
- `GET /api/attendance/live` - Live attendance activity

### Admin Protected Endpoints
- **Employees**: `/api/employees` - CRUD operations
- **Attendance**: `/api/attendances` - Attendance management and reporting
- **Policies**: `/api/policies` - Attendance policy configuration
- **Leave Management**: `/api/leave/*` - Leave policies, requests, and approvals
- **Corrections**: `/api/admin/correction-requests` - Attendance corrections

### Employee Portal Endpoints
- `GET /api/employee/dashboard` - Employee dashboard data
- `POST /api/leave/requests` - Submit leave requests
- `GET /api/employee/attendance` - Personal attendance reports

For detailed API specifications, see [PROJECT_DOCUMENT.md](PROJECT_DOCUMENT.md) or use Postman to explore the endpoints.

## Key Technologies

- **Backend**: Laravel 10.x, PHP 8.1+, MySQL/MariaDB
- **Frontend**: React 18, Vite, Tailwind CSS
- **Face Recognition**: TensorFlow.js, face-api.js
- **Authentication**: Laravel Sanctum
- **File Storage**: Laravel Storage (local/cloud)
- **Email**: Laravel Mail (SMTP/Mailgun/etc.)

## Database Schema

The system uses a relational database with the following key tables:
- `users` - Admin users
- `employees` - Employee profiles
- `attendances` - Attendance records
- `policies` - Attendance policies
- `leave_policies` - Leave policy configurations
- `leave_requests` - Leave applications
- `attendance_correction_requests` - Correction requests
- `audit_logs` - System audit trail

See [PROJECT_DOCUMENT.md](PROJECT_DOCUMENT.md) for complete schema documentation.

## Development

### Code Quality
- Follow PSR-12 coding standards for PHP
- Use ESLint for JavaScript/React code
- Write comprehensive tests for new features
- Use Git for version control with conventional commits

### Environment Setup
- Use Laravel Valet or Homestead for local development
- Configure proper environment variables
- Set up database migrations and seeders

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Deployment

### Production Requirements
- Web server (Apache/Nginx)
- PHP 8.1+ with required extensions
- MySQL 5.7+ or MariaDB 10.3+
- SSL certificate for HTTPS
- Proper file permissions

### Deployment Steps
1. Configure production environment variables
2. Run database migrations
3. Set up cron jobs for automated tasks
4. Configure web server
5. Set up SSL certificates
6. Test face recognition functionality

See [PROJECT_DOCUMENT.md](PROJECT_DOCUMENT.md) for detailed deployment instructions.

## Troubleshooting

### Common Issues
- **Face Recognition Not Working**: Check camera permissions and TensorFlow.js model loading
- **Database Connection Errors**: Verify database credentials and network connectivity
- **API Authentication Issues**: Check Sanctum token configuration
- **File Upload Problems**: Verify storage permissions and disk space

### Debug Mode
Enable debug mode in `.env` for detailed error logging:
```
APP_DEBUG=true
APP_LOG_LEVEL=debug
```

### Support
- Check [PROJECT_DOCUMENT.md](PROJECT_DOCUMENT.md) for detailed troubleshooting
- Review backend and frontend READMEs for component-specific issues
- Create an issue in the repository for bugs or feature requests


## Support

For support or questions, please:
- Check the documentation in [PROJECT_DOCUMENT.md](PROJECT_DOCUMENT.md)
- Review the troubleshooting sections
- Create an issue in the repository
- Contact the development team
