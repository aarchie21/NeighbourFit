const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register new user
exports.register = async (req, res) => {
    try {
        const { name, email, password, preferences } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }
        
        // Create new user
        const user = new User({
            name,
            email,
            password,
            preferences: preferences || {}
        });
        
        // Validate preferences if provided
        if (preferences) {
            user.validatePreferences();
        }
        
        await user.save();
        
        // Generate token
        const token = generateToken(user._id);
        
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                preferences: user.preferences
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = generateToken(user._id);
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                preferences: user.preferences
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, age, occupation, familySize, hasPets } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update fields
        if (name) user.name = name;
        if (age !== undefined) user.age = age;
        if (occupation !== undefined) user.occupation = occupation;
        if (familySize !== undefined) user.familySize = familySize;
        if (hasPets !== undefined) user.hasPets = hasPets;
        
        await user.save();
        
        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                age: user.age,
                occupation: user.occupation,
                familySize: user.familySize,
                hasPets: user.hasPets
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update user preferences
exports.updatePreferences = async (req, res) => {
    try {
        const { preferences } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update preferences
        if (preferences) {
            user.preferences = { ...user.preferences, ...preferences };
            user.validatePreferences();
        }
        
        await user.save();
        
        res.json({
            message: 'Preferences updated successfully',
            preferences: user.preferences
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update user preferences and profile (comprehensive update)
exports.updateUserPreferences = async (req, res) => {
    try {
        const { preferences, age, occupation, familySize, hasPets } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update preferences
        if (preferences) {
            user.preferences = { ...user.preferences, ...preferences };
            user.validatePreferences();
        }
        
        // Update profile information
        if (age !== undefined) user.age = age;
        if (occupation !== undefined) user.occupation = occupation;
        if (familySize !== undefined) user.familySize = familySize;
        if (hasPets !== undefined) user.hasPets = hasPets;
        
        await user.save();
        
        res.json({
            message: 'User preferences and profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                age: user.age,
                occupation: user.occupation,
                familySize: user.familySize,
                hasPets: user.hasPets,
                preferences: user.preferences
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add neighborhood to favorites
exports.addToFavorites = async (req, res) => {
    try {
        const { neighborhoodId } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if already in favorites
        const existingFavorite = user.favorites.find(
            fav => fav.neighborhood.toString() === neighborhoodId
        );
        
        if (existingFavorite) {
            return res.status(400).json({ error: 'Neighborhood already in favorites' });
        }
        
        user.favorites.push({ neighborhood: neighborhoodId });
        await user.save();
        
        res.json({
            message: 'Added to favorites successfully',
            favorites: user.favorites
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Remove neighborhood from favorites
exports.removeFromFavorites = async (req, res) => {
    try {
        const { neighborhoodId } = req.params;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.favorites = user.favorites.filter(
            fav => fav.neighborhood.toString() !== neighborhoodId
        );
        
        await user.save();
        
        res.json({
            message: 'Removed from favorites successfully',
            favorites: user.favorites
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get user favorites
exports.getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate('favorites.neighborhood')
            .select('favorites');
            
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add search to history
exports.addSearchHistory = async (req, res) => {
    try {
        const { query } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.searchHistory.push({ query });
        
        // Keep only last 10 searches
        if (user.searchHistory.length > 10) {
            user.searchHistory = user.searchHistory.slice(-10);
        }
        
        await user.save();
        
        res.json({
            message: 'Search history updated',
            searchHistory: user.searchHistory
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get search history
exports.getSearchHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('searchHistory');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user.searchHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}; 