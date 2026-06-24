const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');

// Public API endpoints for dashboards/clients
router.get('/conferences', registerController.getConferencesApi);
router.get('/stats', registerController.getStatsApi);

module.exports = router;
