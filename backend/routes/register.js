const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');

// GET /register - Show registration form
router.get('/', registerController.showRegisterForm);

// POST /register - Process registration
router.post('/', registerController.registerParticipant);

module.exports = router; 