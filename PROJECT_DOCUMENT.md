# Attendance Kiosk System - Detailed Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Face Recognition System](#face-recognition-system)
6. [Leave Management System](#leave-management-system)
7. [Attendance Correction System](#attendance-correction-system)
8. [Reporting & Analytics](#reporting--analytics)
9. [Development Guidelines](#development-guidelines)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)

## Project Overview

The Attendance Kiosk System is a comprehensive workforce management solution that combines facial recognition technology with traditional attendance tracking. The system provides organizations with automated attendance monitoring, leave management, policy enforcement, and detailed reporting capabilities.

### Key Objectives
- Automate attendance tracking using facial recognition
- Provide real-time attendance monitoring and analytics
- Enable flexible leave policy management
- Support attendance corrections and audit trails
- Generate comprehensive reports for management
- Ensure secure and scalable architecture

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   Web Browser   │  │   Kiosk App    │  │   Mobile    │  │
│  │   (React SPA)   │  │   (React)      │  │   (PWA)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     API Gateway        │
                    │    (Laravel Routes)    │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Business Logic       │
                    │   (Laravel Services)   │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Data Access         │
                    │   (Eloquent Models)    │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Database           │
                    │    (MySQL/MariaDB)     │
                    └─────────────────────────┘
```

### Component Breakdown

#### Frontend (React)
- **Technology Stack**: React 18, Vite, Tailwind CSS
- **Key Libraries**:
  - `face-api.js` - Facial recognition
  - `axios` - HTTP client
  - `react-router-dom` - Routing
  - `lucide-react` - Icons
- **Modules**:
  - Admin Dashboard
  - Employee Portal
  - Attendance Kiosk
  - Reports & Analytics

#### Backend (Laravel)
- **Technology Stack**: Laravel 10.x, PHP 8.1+
- **Key Features**:
  - RESTful API design
  - Laravel Sanctum authentication
  - Eloquent ORM
  - Queue system for background jobs
  - Mail system for notifications

#### Database (MySQL/MariaDB)
- **Structure**: Relational database with 20+ tables
- **Key Tables**: Users, Employees, Attendances, Policies, Leave management
- **Features**: Foreign key constraints, indexes, triggers

## Database Schema

### Core Tables

#### Users (Admin Users)
```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

#### Employees
```sql
CREATE TABLE employees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NULL,
    department VARCHAR(100) NULL,
    position VARCHAR(100) NULL,
    policy_id BIGINT UNSIGNED NULL,
    status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
    leave_reason TEXT NULL,
    portal_auth TINYINT(1) DEFAULT 0,
    hire_date DATE NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (policy_id) REFERENCES policies(id)
);
```

#### Attendances
```sql
CREATE TABLE attendances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    date DATE NOT NULL,
    check_in TIMESTAMP NULL,
    check_out TIMESTAMP NULL,
    status ENUM('present', 'absent', 'late', 'half_day', 'early_departure', 'leave') DEFAULT 'present',
    scan_count INT DEFAULT 0,
    scan_times JSON NULL,
    early_departure TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    UNIQUE KEY unique_employee_date (employee_id, date)
);
```

#### Policies
```sql
CREATE TABLE policies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    work_start_time TIME NOT NULL,
    work_end_time TIME NOT NULL,
    late_grace_period INT DEFAULT 0, -- minutes
    early_grace_period INT DEFAULT 0, -- minutes
    enable_late_tracking TINYINT(1) DEFAULT 1,
    enable_early_tracking TINYINT(1) DEFAULT 1,
    enable_absence_tracking TINYINT(1) DEFAULT 1,
    effective_from DATE NULL,
    effective_to DATE NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

### Leave Management Tables

#### Leave Policies
```sql
CREATE TABLE leave_policies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    leave_type ENUM('annual', 'sick', 'maternity', 'paternity', 'emergency', 'other') NOT NULL,
    max_days_per_year INT NOT NULL,
    max_consecutive_days INT NULL,
    requires_approval TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    -- Eligibility criteria
    min_service_months INT DEFAULT 0,
    max_service_months INT NULL,
    gender_restriction ENUM('male', 'female', 'all') DEFAULT 'all',
    -- Accrual rules
    accrual_type ENUM('fixed', 'monthly', 'yearly') DEFAULT 'yearly',
    accrual_rate DECIMAL(5,2) DEFAULT 0.00,
    accrual_day_of_month INT DEFAULT 1,
    -- Carry forward rules
    carry_forward_allowed TINYINT(1) DEFAULT 0,
    max_carry_forward_days INT NULL,
    reset_notice_days INT DEFAULT 30,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

#### Leave Balances
```sql
CREATE TABLE leave_balances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    leave_policy_id BIGINT UNSIGNED NOT NULL,
    balance DECIMAL(8,2) DEFAULT 0.00,
    used DECIMAL(8,2) DEFAULT 0.00,
    pending_deduction DECIMAL(8,2) DEFAULT 0.00,
    accrued_this_year DECIMAL(8,2) DEFAULT 0.00,
    carry_forward_balance DECIMAL(8,2) DEFAULT 0.00,
    last_accrual_date DATE NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (leave_policy_id) REFERENCES leave_policies(id),
    UNIQUE KEY unique_employee_policy (employee_id, leave_policy_id)
);
```

#### Leave Requests
```sql
CREATE TABLE leave_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    leave_policy_id BIGINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5,2) NOT NULL,
    reason TEXT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'clarification_required') DEFAULT 'pending',
    approved_by BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    partial_session ENUM('full_day', 'first_half', 'second_half') DEFAULT 'full_day',
    leave_type ENUM('annual', 'sick', 'maternity', 'paternity', 'emergency', 'other') DEFAULT 'annual',
    days_counted DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (leave_policy_id) REFERENCES leave_policies(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

### Additional Tables
- `faces` - Facial recognition data
- `break_records` - Break time tracking
- `holidays` - Public holidays
- `attendance_correction_requests` - Correction requests
- `audit_logs` - System audit trail
- `employee_password_resets` - Password reset tokens

## API Reference

### Authentication Endpoints

#### Admin Login
```http
POST /api/login
Content-Type: application/json

{
    "email": "admin@example.com",
    "password": "password"
}
```

#### Employee Portal Login
```http
POST /api/employee/login
Content-Type: application/json

{
    "employee_id": "EMP001",
    "password": "password"
}
```

### Attendance Endpoints

#### Mark Attendance (Public)
```http
POST /api/attendances/mark
Content-Type: application/json

{
    "employee_id": "EMP001"
}
```

#### Get Dashboard Data
```http
GET /api/attendance/dashboard
Authorization: Bearer {token}
```

#### Get Employee Monthly Attendance
```http
GET /api/attendance/employee/{employeeId}/{year}/{month}
Authorization: Bearer {token}
```

### Leave Management Endpoints

#### Get Leave Policies
```http
GET /api/leave-policies
Authorization: Bearer {token}
```

#### Submit Leave Request
```http
POST /api/leave/requests
Authorization: Bearer {token}
Content-Type: application/json

{
    "leave_policy_id": 1,
    "start_date": "2024-01-15",
    "end_date": "2024-01-20",
    "reason": "Vacation"
}
```

#### Get Leave Approvals (Admin)
```http
GET /api/leave/approvals
Authorization: Bearer {token}
```

#### Approve Leave Request
```http
POST /api/leave/requests/{id}/approve
Authorization: Bearer {token}
Content-Type: application/json

{
    "comments": "Approved"
}
```

### Employee Portal Endpoints

#### Get Dashboard
```http
GET /api/employee/portal/dashboard
Authorization: Bearer {token}
```

#### Get Leave Balances
```http
GET /api/employee/portal/leave-balances
Authorization: Bearer {token}
```

#### Update Profile
```http
PUT /api/employee/portal/profile
Authorization: Bearer {token}
Content-Type: application/json

{
    "phone": "+1234567890",
    "department": "IT"
}
```

## Face Recognition System

### Technical Implementation
- **Library**: face-api.js (TensorFlow.js wrapper)
- **Models Used**:
  - SSD MobileNet v1 (face detection)
  - Face Landmark 68 (facial landmarks)
  - Face Recognition (feature extraction)
  - Face Expression (optional)

### Recognition Process
1. **Face Detection**: Identify faces in camera feed
2. **Face Alignment**: Align detected faces using landmarks
3. **Feature Extraction**: Generate face descriptors
4. **Matching**: Compare with enrolled face data
5. **Threshold Check**: Verify match confidence

### Enrollment Process
```javascript
// Frontend enrollment code
const detection = await faceapi.detectSingleFace(image)
    .withFaceLandmarks()
    .withFaceDescriptor();

if (detection) {
    const descriptor = detection.descriptor;
    // Send descriptor to backend for storage
}
```

### Recognition Process
```javascript
// Frontend recognition code
const detections = await faceapi.detectAllFaces(image)
    .withFaceLandmarks()
    .withFaceDescriptors();

for (const detection of detections) {
    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
    if (bestMatch.distance < 0.3) { // Confidence threshold
        // Match found
    }
}
```

## Leave Management System

### Leave Accrual Logic
- **Fixed Accrual**: Fixed days per year (e.g., 20 days annually)
- **Monthly Accrual**: Pro-rated monthly accrual
- **Yearly Accrual**: Annual accrual based on service

### Balance Calculation
```php
// Example accrual calculation
$monthsOfService = $employee->hire_date->diffInMonths(now());
$accruedDays = $monthsOfService * ($policy->max_days_per_year / 12);
$balance = min($accruedDays, $policy->max_days_per_year);
```

### Approval Workflow
1. **Submission**: Employee submits leave request
2. **Validation**: System validates against policy rules
3. **Approval**: Admin reviews and approves/rejects
4. **Balance Update**: System updates leave balances
5. **Notification**: Email notifications sent

## Attendance Correction System

### Correction Types
- **Missing Check-in/Out**: Add missing attendance records
- **Wrong Time**: Correct check-in/check-out times
- **Wrong Status**: Change attendance status
- **Break Corrections**: Adjust break times

### Correction Request Flow
1. **Employee Request**: Submit correction request with details
2. **Admin Review**: Admin reviews request and evidence
3. **Approval/Rejection**: Admin approves or rejects with comments
4. **Audit Logging**: All changes logged in audit trail
5. **Notification**: Employee notified of decision

### Audit Trail
```sql
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    employee_id BIGINT UNSIGNED NULL,
    action VARCHAR(255) NOT NULL,
    model_type VARCHAR(255) NOT NULL,
    model_id BIGINT UNSIGNED NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

## Reporting & Analytics

### Dashboard Metrics
- **Real-time Stats**: Present/absent counts, trends
- **Department Breakdown**: Attendance by department
- **Time Analytics**: Average check-in times, work hours
- **Leave Analytics**: Leave utilization rates

### Report Types
- **Individual Reports**: Employee-specific attendance
- **Department Reports**: Team attendance summaries
- **Date Range Reports**: Custom period reports
- **Compliance Reports**: Policy compliance analysis

### Export Formats
- **CSV**: For spreadsheet analysis
- **PDF**: For formal reporting
- **Email**: Automated report delivery

## Development Guidelines

### Code Standards
- **PHP**: PSR-12 coding standards
- **JavaScript**: ESLint configuration
- **Git**: Conventional commit messages

### Testing
```bash
# Backend testing
php artisan test

# Frontend testing
npm test
```

### API Development
- Use resource controllers for CRUD operations
- Implement proper validation using Form Requests
- Return consistent JSON responses
- Use API versioning for breaking changes

### Database Migrations
```bash
# Create migration
php artisan make:migration create_feature_table

# Run migrations
php artisan migrate

# Rollback
php artisan migrate:rollback
```

## Deployment Guide

### Environment Setup
```bash
# Production environment variables
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=attendance_db
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

# Email configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=your_mailgun_username
MAIL_PASSWORD=your_mailgun_password
```

### Web Server Configuration (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/attendance-kiosk-system/backend/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location /api/ {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

### SSL Configuration
```bash
# Let's Encrypt SSL certificate
certbot --nginx -d your-domain.com
```

### Cron Jobs
```bash
# Leave accrual (daily at midnight)
0 0 * * * php /var/www/attendance-kiosk-system/backend/artisan leave:accrue

# Database backups (daily at 2 AM)
0 2 * * * mysqldump attendance_db > /backups/attendance_$(date +\%Y\%m\%d).sql
```

### Performance Optimization
- **Caching**: Use Redis for session and cache storage
- **Database**: Add proper indexes and optimize queries
- **Assets**: Minify and compress static assets
- **CDN**: Use CDN for static assets and face recognition models

## Troubleshooting

### Common Issues

#### Face Recognition Problems
```
Error: Face detection failed
Solution:
1. Check camera permissions
2. Verify TensorFlow.js models are loaded
3. Ensure adequate lighting
4. Check browser compatibility
```

#### Database Connection Issues
```
Error: SQLSTATE[HY000] [2002] Connection refused
Solution:
1. Verify database credentials in .env
2. Check MySQL service status
3. Ensure correct host and port
4. Check firewall settings
```

#### API Authentication Errors
```
Error: 401 Unauthorized
Solution:
1. Verify Sanctum token is valid
2. Check token expiration
3. Ensure correct token format
4. Verify user permissions
```

#### File Upload Issues
```
Error: Upload failed
Solution:
1. Check storage directory permissions
2. Verify disk space availability
3. Check file size limits
4. Ensure correct MIME types
```

### Debug Tools
```bash
# Laravel debug commands
php artisan tinker
php artisan route:list
php artisan config:cache

# Database debugging
php artisan db:monitor
php artisan migrate:status
```

### Log Analysis
```bash
# View Laravel logs
tail -f storage/logs/laravel.log

# Search for specific errors
grep "ERROR" storage/logs/laravel.log
```

## Security Considerations

### Authentication & Authorization
- **Laravel Sanctum**: Token-based authentication
- **Role-based Access**: Admin vs Employee permissions
- **Session Management**: Secure session handling
- **Password Policies**: Strong password requirements

### Data Protection
- **Encryption**: Sensitive data encryption at rest
- **HTTPS**: SSL/TLS for all communications
- **CSRF Protection**: Cross-site request forgery prevention
- **XSS Prevention**: Input sanitization and validation

### Face Recognition Security
- **Privacy**: Face data stored securely with encryption
- **Consent**: User consent for face data collection
- **Access Control**: Restricted access to face recognition data
- **Audit Trail**: Logging of all face recognition activities

### API Security
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Proper cross-origin policies

### Best Practices
- **Regular Updates**: Keep dependencies updated
- **Security Audits**: Regular security assessments
- **Backup Strategy**: Automated database backups
- **Monitoring**: Real-time security monitoring
- **Incident Response**: Defined security incident procedures

---

## Support & Maintenance

### Regular Maintenance Tasks
- **Database Optimization**: Regular index maintenance
- **Log Rotation**: Automated log file management
- **Backup Verification**: Regular backup integrity checks
- **Performance Monitoring**: System performance tracking
- **Security Updates**: Dependency and system updates

### Monitoring & Alerting
- **System Health**: CPU, memory, disk usage monitoring
- **Application Metrics**: Response times, error rates
- **Database Performance**: Query performance monitoring
- **User Activity**: Abnormal activity detection

### Documentation Updates
- **API Documentation**: Keep API docs synchronized
- **User Guides**: Update user documentation
- **Troubleshooting Guides**: Maintain troubleshooting resources
- **Release Notes**: Document changes and fixes

For additional support or questions, please refer to the main README.md or create an issue in the project repository.
