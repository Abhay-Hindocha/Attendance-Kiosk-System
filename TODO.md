# TODO: Optimize Camera Start Speed in Attendance Page

## Steps to Complete:
- [x] Modify useEffect in AttendancePage.jsx to pre-acquire camera stream after models load
- [x] Update startVideo function to assign pre-acquired stream instead of requesting new one
- [x] Add cleanup in useEffect to stop stream on component unmount
- [x] Ensure error handling for camera access failures
- [x] Fix null reference error in startVideo function
- [ ] Test the changes to verify faster camera start
