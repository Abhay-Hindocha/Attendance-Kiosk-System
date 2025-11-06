# Face Recognition Attendance System

A modern, responsive web application for attendance tracking using face recognition technology. Built with Next.js, React, and Tailwind CSS.

## Features

### 🏠 Home Page
- Hero section with compelling call-to-action
- Feature highlights and statistics
- Modern, responsive design

### 📷 Attendance Tracking
- Real-time face recognition interface
- Camera integration with live video feed
- Automatic attendance marking
- Status feedback (success/error)
- Real-time clock display

### 📊 Dashboard
- Comprehensive attendance overview
- Employee management interface
- Real-time statistics and metrics
- Search and filter functionality
- Quick actions and recent activity

### 📈 Reports & Analytics
- Weekly attendance trends
- Department performance metrics
- Top performer tracking
- Export options (PDF, Excel, CSV)
- Customizable date ranges

### ⚙️ Settings
- General system configuration
- Camera settings and preferences
- Notification management
- Security and privacy controls
- Database and backup settings
- User profile management

## Technology Stack

- **Frontend**: Next.js 15.5.5, React 19.1.0
- **Styling**: Tailwind CSS 4.0
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Responsive Design**: Mobile-first approach

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.js          # Root layout with metadata
│   │   ├── page.js            # Main app with routing
│   │   └── globals.css        # Global styles
│   └── components/
│       ├── Layout.jsx         # Main layout wrapper
│       ├── Header.jsx         # Navigation header
│       ├── Footer.jsx         # Footer component
│       ├── HomePage.jsx       # Landing page
│       ├── AttendancePage.jsx # Face recognition interface
│       ├── DashboardPage.jsx  # Admin dashboard
│       ├── ReportsPage.jsx    # Analytics and reports
│       └── SettingsPage.jsx   # System configuration
├── public/                    # Static assets
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Key Features

### Face Recognition Interface
- Live camera feed with real-time face detection
- Automatic photo capture and processing
- Success/error feedback with visual indicators
- Responsive design for various screen sizes

### Admin Dashboard
- Real-time attendance monitoring
- Employee search and filtering
- Attendance statistics and metrics
- Quick action buttons for common tasks

### Comprehensive Reporting
- Visual charts and graphs
- Department-wise performance analysis
- Export functionality for multiple formats
- Customizable date ranges and filters

### System Configuration
- Tabbed interface for organized settings
- Camera and recognition preferences
- Notification and alert management
- Security and privacy controls
- User profile and role management

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Code Style

- Uses modern React hooks and functional components
- Consistent naming conventions
- Responsive design with Tailwind CSS
- Component-based architecture

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.