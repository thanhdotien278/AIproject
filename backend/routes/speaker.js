const express = require('express');
const router = express.Router();
const speakerController = require('../controllers/speakerController');
// const { isAdmin } = require('../middleware/authMiddleware'); // Assuming you have auth middleware
const adminController = require('../controllers/adminController'); // Use existing adminController for isAuthenticated

// Protect all speaker routes - only admins can access
// router.use(isAdmin);
router.use(adminController.isAuthenticated); // Use the existing middleware

// GET /admin/speakers - Display all speakers
router.get('/', speakerController.showSpeakersPage);

// POST /admin/speakers/add - Create a new speaker
router.post('/add', speakerController.uploadAvatar, speakerController.createSpeaker);

// POST /admin/speakers/update/:id - Update an existing speaker
router.post('/update/:id', speakerController.uploadAvatar, speakerController.updateSpeaker);

// GET /admin/speakers/delete/:id - Delete a speaker (Consider using POST or DELETE for semantic correctness)
router.get('/delete/:id', speakerController.deleteSpeaker);

module.exports = router; 