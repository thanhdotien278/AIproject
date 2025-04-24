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

// Root path redirect to dashboard if authenticated, otherwise to login
router.get('/', (req, res) => {
  if (req.session.isAuthenticated) {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login');
  }
});

module.exports = router; 