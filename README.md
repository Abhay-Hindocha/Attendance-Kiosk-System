# Attendance Kiosk System

A comprehensive attendance management system featuring face recognition technology, built with a Laravel backend and React frontend. This system allows organizations to efficiently track employee attendance, manage policies, and generate reports.

## Project Structure

This project consists of two main components:

- **Backend** (`backend/`): Laravel-based API server handling data management, authentication, and business logic.
- **Frontend** (`frontend/`): React-based user interface for administrators and employees to interact with the system.

## Features

- **Face Recognition**: Advanced facial recognition for secure and automated attendance tracking.
- **Employee Management**: Add, edit, and manage employee profiles.
- **Attendance Tracking**: Real-time attendance recording with break time management.
- **Policy Configuration**: Flexible attendance policies tailored to organizational needs.
- **Reports and Analytics**: Generate detailed attendance reports and statistics.
- **Admin Dashboard**: Comprehensive dashboard for system administration.

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **For Backend**:
  - PHP 8.1 or higher
  - Composer
  - MySQL or another supported database

- **For Frontend**:
  - Node.js (version 16 or higher)
  - npm or yarn

## Quick Start

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd attendance-kiosk-system
   ```

2. **Set up the Backend**:
   - Navigate to the backend directory: `cd backend`
   - Follow the detailed setup instructions in [backend/README.md](backend/README.md)

3. **Set up the Frontend**:
   - Navigate to the frontend directory: `cd ../frontend`
   - Follow the detailed setup instructions in [frontend/README.md](frontend/README.md)

4. **Start the System**:
   - Backend: Run `php artisan serve` 
   - Frontend: Run `npm run dev` 

## API Documentation

The backend provides RESTful APIs. For detailed endpoint documentation, refer to the [backend README](backend/README.md) or use tools like Postman to explore the API.

## Key Technologies

- **Backend**: Laravel, PHP, MySQL
- **Frontend**: React, Vite, Tailwind CSS, Face-api.js
- **Face Recognition**: TensorFlow.js models for client-side face detection and recognition

## Development

- Follow the contribution guidelines in the respective component READMEs.
- Ensure code quality with linting and testing.
- Use Git for version control and follow conventional commit messages.

## Troubleshooting

- Refer to the troubleshooting sections in [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).
- Common issues: Database connections, port conflicts, camera permissions for face recognition.


## Contributing

We welcome contributions! Please read the contribution guidelines in the backend and frontend READMEs before submitting pull requests.

## Support

For support or questions, please refer to the documentation or create an issue in the repository.
