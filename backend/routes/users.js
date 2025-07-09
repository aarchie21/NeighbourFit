const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.put('/preferences', authenticateToken, userController.updateUserPreferences);

// Favorites management
router.get('/favorites', authenticateToken, userController.getFavorites);
router.post('/favorites', authenticateToken, userController.addToFavorites);
router.delete('/favorites/:neighborhoodId', authenticateToken, userController.removeFromFavorites);

// Search history
router.get('/search-history', authenticateToken, userController.getSearchHistory);
router.post('/search-history', authenticateToken, userController.addSearchHistory);

module.exports = router; 