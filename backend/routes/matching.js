const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matchingController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Public routes (anonymous matching)
router.get('/anonymous', matchingController.getAnonymousMatches);

// Protected routes (personalized matching)
router.get('/matches', authenticateToken, matchingController.getMatches);
router.get('/recommendations', authenticateToken, matchingController.getRecommendations);

// Comparison (works with or without authentication)
router.post('/compare', optionalAuth, matchingController.compareNeighborhoods);

module.exports = router; 