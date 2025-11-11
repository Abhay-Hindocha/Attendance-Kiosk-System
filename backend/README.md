# Attendance Kiosk System - Backend (Laravel)

This is the backend API for the Attendance Kiosk System, built with Laravel. It provides RESTful APIs for managing employees, policies, attendances, and more.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- PHP 8.1 or higher
- Composer (PHP dependency manager)
- MySQL or another supported database
- Node.js and npm (for frontend assets, if needed)

## Installation

1. **Clone the repository** (if not already done):
   ```
   git clone <repository-url>
   cd attendance-kiosk-system/backend
   ```

2. **Install PHP dependencies**:
   ```
   composer install
   ```

3. **Set up environment variables**:
   - Copy the `.env.example` file to `.env`:
     ```
     cp .env.example .env
     ```
   - Edit `.env` and configure your database settings:
     ```
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=attendance_kiosk
     DB_USERNAME=your_username
     DB_PASSWORD=your_password
     ```

4. **Generate application key**:
   ```
   php artisan key:generate
   ```

5. **Run database migrations**:
   ```
   php artisan migrate
   ```

6. **Seed the database** (optional, for sample data):
   ```
   php artisan db:seed
   ```

7. **Start the Laravel development server**:
   ```
   php artisan serve
   ```

   The API will be available at `http://localhost:8000`.

## API Endpoints

The API provides endpoints for:

- **Employees**: CRUD operations for employee management
- **Policies**: Manage attendance policies
- **Attendances**: Record and manage attendance data
- **Faces**: Handle face recognition data
- **Breaks**: Manage break times
- **Holidays**: Configure holidays
- **Admins**: Admin user management

For detailed API documentation, you can use tools like Postman to test the endpoints.

## Key Features

- Face recognition integration
- Flexible attendance policies
- Break time tracking
- Holiday management
- Admin dashboard support

## Development

To contribute to the backend:

1. Follow Laravel coding standards
2. Write tests for new features
3. Update API documentation

## Troubleshooting

- If you encounter database connection issues, double-check your `.env` file settings.
- Ensure PHP extensions required by Laravel are installed.
- For face recognition features, ensure proper permissions and dependencies.

## License

This project is licensed under the MIT License.
