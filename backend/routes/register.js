const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');

// GET /register - Show registration form for default conference
router.get('/', registerController.showRegisterForm);

// GET /register/:conferenceCode - Show registration form for specific conference
router.get('/:conferenceCode', registerController.showRegisterForm);

// POST /register - Process registration for default conference
router.post('/', registerController.registerParticipant);

// POST /register/:conferenceCode - Process registration for specific conference
router.post('/:conferenceCode', registerController.registerParticipant);

module.exports = router; 