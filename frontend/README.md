# Attendance Kiosk System - Frontend (React)

This is the frontend for the Attendance Kiosk System, built with React. It provides a user interface for employees to check in/out using face recognition.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 16 or higher)
- npm or yarn
- A running backend API (Laravel server)

## Installation

1. **Navigate to the frontend directory**:
   ```
   cd frontend
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Start the development server**:
   ```
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173` (or the port shown in the terminal).

## Features

- **Face Recognition**: Uses face-api.js for real-time face detection and recognition
- **Attendance Tracking**: Check in/out functionality
- **Responsive Design**: Works on kiosk screens and mobile devices
- **Real-time Updates**: Live status updates for attendance

## Project Structure

- `src/components/`: React components (e.g., AttendancePage)
- `src/services/`: API service functions
- `src/`: Main app files (App.jsx, main.jsx)
- `public/`: Static assets

## Usage

1. Ensure the backend API is running.
2. Open the frontend in a browser.
3. Allow camera access for face recognition.
4. Follow on-screen instructions to check in/out.

## Development

To contribute to the frontend:

1. Follow React best practices
2. Use ESLint for code quality
3. Test components thoroughly
4. Ensure responsive design

## Dependencies

Key dependencies include:
- React
- face-api.js (for face recognition)
- Axios (for API calls)
- Tailwind CSS (for styling)

## Troubleshooting

- If face recognition doesn't work, ensure camera permissions are granted.
- Check browser console for errors.
- Ensure the backend API is accessible.

## License

This project is licensed under the MIT License.
