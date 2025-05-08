const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// GET /admin/login - Show login page
router.get('/login', adminController.showLoginPage);

// POST /admin/login - Process login
router.post('/login', adminController.login);

// GET /admin/logout - Logout
router.get('/logout', adminController.logout);

// GET /admin/dashboard - Show dashboard (protected)
router.get('/dashboard', adminController.isAuthenticated, adminController.showDashboard);

// GET /admin/export - Export to Excel (protected)
router.get('/export', adminController.isAuthenticated, adminController.exportToExcel);

// POST /admin/send-email/:participantId - Send email to participant (protected)
router.post('/send-email/:participantId', adminController.isAuthenticated, adminController.sendEmail);

// POST /admin/send-bulk-emails - Send emails to all participants (protected)
router.post('/send-bulk-emails', adminController.isAuthenticated, adminController.sendBulkEmails);

// GET /admin/settings - Show settings page (protected)
router.get('/settings', adminController.isAuthenticated, adminController.showSettings);

// POST /admin/settings - Update admin settings (protected)
router.post('/settings', adminController.isAuthenticated, adminController.updateSettings);

// POST /admin/conferences/create - Create new conference (protected)
router.post('/conferences/create', adminController.isAuthenticated, adminController.createConference);

// GET /admin/conferences - Show conference management page (protected) 
router.get('/conferences', adminController.isAuthenticated, adminController.showConferencesPage);

// POST /admin/conferences/update/:id - Update conference (protected)
router.post('/conferences/update/:id', adminController.isAuthenticated, adminController.updateConference);

// DELETE /admin/conferences/delete/:id - Delete conference (protected)
router.delete('/conferences/delete/:id', adminController.isAuthenticated, adminController.deleteConference);

// Add routes for locations
router.get('/locations', adminController.isAuthenticated, adminController.getLocations);
router.post('/locations', adminController.isAuthenticated, adminController.createLocation);
router.put('/locations/:id', adminController.isAuthenticated, adminController.updateLocation);
router.delete('/locations/:id', adminController.isAuthenticated, adminController.deleteLocation);

// Add routes for user management
router.get('/users', adminController.isAuthenticated, adminController.showUsers);
router.get('/api/users', adminController.isAuthenticated, adminController.getUsers);
router.post('/api/users', adminController.isAuthenticated, adminController.createUser);
router.put('/api/users/:id', adminController.isAuthenticated, adminController.updateUser);
router.delete('/api/users/:id', adminController.isAuthenticated, adminController.deleteUser);

// API route to get single conference details (for editing)
router.get('/api/conferences/:id', adminController.isAuthenticated, adminController.getConferenceDetails);

// Import speaker routes
const speakerRoutes = require('./speaker'); 

// Mount speaker routes under /speakers
router.use('/speakers', speakerRoutes);

// Root path redirect to dashboard if authenticated, otherwise to login
router.get('/', (req, res) => {
  if (req.session.isAuthenticated) {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login');
  }
});

module.exports = router; 