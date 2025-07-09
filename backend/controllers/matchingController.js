const Neighborhood = require('../models/Neighborhood');
const User = require('../models/User');

// Get personalized neighborhood matches
exports.getMatches = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 10, city } = req.query;
        
        // Get user with preferences
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Build search criteria
        const searchCriteria = user.getSearchCriteria();
        if (city) {
            searchCriteria.city = { $regex: city, $options: 'i' };
        }
        
        // Get neighborhoods that match basic criteria
        const neighborhoods = await Neighborhood.find(searchCriteria);
        
        // Calculate match scores for each neighborhood
        const matchesWithScores = neighborhoods.map(neighborhood => {
            const matchScore = neighborhood.calculateMatchScore(user.preferences);
            return {
                neighborhood,
                matchScore,
                breakdown: {
                    safety: Math.round((neighborhood.crimeSafetyScore / 100) * user.preferences.weights.safety * 100),
                    lifestyle: Math.round((neighborhood.lifestyleScore / 100) * user.preferences.weights.lifestyle * 100),
                    walkability: calculateWalkabilityScore(neighborhood.walkable, user.preferences.weights.walkability),
                    affordability: calculateAffordabilityScore(neighborhood, user.preferences)
                }
            };
        });
        
        // Sort by match score (descending)
        matchesWithScores.sort((a, b) => b.matchScore - a.matchScore);
        
        // Apply limit
        const limitedMatches = matchesWithScores.slice(0, parseInt(limit));
        
        res.json({
            matches: limitedMatches,
            totalMatches: matchesWithScores.length,
            userPreferences: user.preferences,
            appliedFilters: searchCriteria
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get matches for anonymous users (without preferences)
exports.getAnonymousMatches = async (req, res) => {
    try {
        const { 
            city, 
            type, 
            walkable, 
            petFriendly, 
            publicTransport,
            minSafetyScore = 50,
            limit = 10 
        } = req.query;
        
        const query = {};
        
        if (city) query.city = { $regex: city, $options: 'i' };
        if (type) query.type = type;
        if (walkable) query.walkable = walkable;
        if (petFriendly !== undefined) query.petFriendly = petFriendly === 'true';
        if (publicTransport !== undefined) query.publicTransportAccess = publicTransport === 'true';
        if (minSafetyScore) query.crimeSafetyScore = { $gte: parseInt(minSafetyScore) };
        
        const neighborhoods = await Neighborhood.find(query)
            .sort({ crimeSafetyScore: -1, lifestyleScore: -1 })
            .limit(parseInt(limit));
            
        res.json({
            neighborhoods,
            count: neighborhoods.length,
            filters: req.query
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Compare neighborhoods
exports.compareNeighborhoods = async (req, res) => {
    try {
        const { neighborhoodIds } = req.body;
        
        if (!neighborhoodIds || !Array.isArray(neighborhoodIds) || neighborhoodIds.length < 2) {
            return res.status(400).json({ error: 'Please provide at least 2 neighborhood IDs to compare' });
        }
        
        const neighborhoods = await Neighborhood.find({
            _id: { $in: neighborhoodIds }
        });
        
        if (neighborhoods.length !== neighborhoodIds.length) {
            return res.status(404).json({ error: 'One or more neighborhoods not found' });
        }
        
        // Calculate comparison metrics
        const comparison = neighborhoods.map(neighborhood => ({
            id: neighborhood._id,
            name: neighborhood.fullLocation,
            metrics: {
                population: neighborhood.population,
                crimeRate: neighborhood.rateOfViolentCrimes,
                safetyScore: neighborhood.crimeSafetyScore,
                lifestyleScore: neighborhood.lifestyleScore,
                parks: neighborhood.parks,
                schools: neighborhood.schools,
                walkability: neighborhood.walkable,
                petFriendly: neighborhood.petFriendly,
                publicTransport: neighborhood.publicTransportAccess
            }
        }));
        
        res.json({
            comparison,
            summary: {
                bestSafety: comparison.reduce((best, current) => 
                    current.metrics.safetyScore > best.metrics.safetyScore ? current : best
                ),
                bestLifestyle: comparison.reduce((best, current) => 
                    current.metrics.lifestyleScore > best.metrics.lifestyleScore ? current : best
                ),
                mostWalkable: comparison.filter(n => n.metrics.walkability === 'High'),
                petFriendly: comparison.filter(n => n.metrics.petFriendly)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get neighborhood recommendations based on similar users
exports.getRecommendations = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 5 } = req.query;
        
        // Get user's favorites
        const user = await User.findById(userId).populate('favorites.neighborhood');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.favorites.length === 0) {
            return res.json({ 
                recommendations: [],
                message: 'No favorites found. Add some neighborhoods to get recommendations.' 
            });
        }
        
        // Get average scores from user's favorites
        const avgSafetyScore = user.favorites.reduce((sum, fav) => 
            sum + fav.neighborhood.crimeSafetyScore, 0) / user.favorites.length;
        const avgLifestyleScore = user.favorites.reduce((sum, fav) => 
            sum + fav.neighborhood.lifestyleScore, 0) / user.favorites.length;
        
        // Find similar neighborhoods
        const recommendations = await Neighborhood.find({
            _id: { $nin: user.favorites.map(fav => fav.neighborhood._id) },
            crimeSafetyScore: { $gte: avgSafetyScore - 10, $lte: avgSafetyScore + 10 },
            lifestyleScore: { $gte: avgLifestyleScore - 10, $lte: avgLifestyleScore + 10 }
        })
        .sort({ crimeSafetyScore: -1, lifestyleScore: -1 })
        .limit(parseInt(limit));
        
        res.json({
            recommendations,
            basedOn: {
                favoritesCount: user.favorites.length,
                avgSafetyScore: Math.round(avgSafetyScore),
                avgLifestyleScore: Math.round(avgLifestyleScore)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Helper function to calculate walkability score
function calculateWalkabilityScore(walkable, weight) {
    let score = 0;
    if (walkable === 'High') score = 100;
    else if (walkable === 'Medium') score = 60;
    else score = 20;
    
    return Math.round((score / 100) * weight * 100);
}

// Helper function to calculate affordability score
function calculateAffordabilityScore(neighborhood, preferences) {
    if (!neighborhood.averageRent || !preferences.maxRent) {
        return 0;
    }
    
    const affordabilityScore = Math.max(0, 100 - ((neighborhood.averageRent - preferences.maxRent) / preferences.maxRent * 100));
    return Math.round((affordabilityScore / 100) * preferences.weights.affordability * 100);
} 