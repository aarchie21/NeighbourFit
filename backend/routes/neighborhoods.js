const express = require('express');
const router = express.Router();
const neighborhoodController = require('../controllers/neighborhoodController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', neighborhoodController.getAllNeighborhoods);
router.get('/stats', neighborhoodController.getNeighborhoodStats);
router.get('/search', neighborhoodController.searchNeighborhoods);
router.get('/cities', neighborhoodController.getAllCities);

// Admin routes (for data management)
router.post('/seed-data', neighborhoodController.seedData);
router.delete('/clear-data', neighborhoodController.clearData);
router.post('/', neighborhoodController.addNeighborhood);
router.post('/bulk', neighborhoodController.addBulkNeighborhoods);
router.put('/bulk-update', neighborhoodController.bulkUpdateNeighborhoods);

// Parameter routes
router.get('/city/:city', neighborhoodController.getNeighborhoodsByCity);
router.get('/:id', neighborhoodController.getNeighborhoodById);

module.exports = router; 