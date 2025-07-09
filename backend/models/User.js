const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    preferences: {
        // Lifestyle preferences
        lifestyle: {
            type: String,
            enum: ['Urban', 'Suburban', 'Rural', 'Any'],
            default: 'Any'
        },
        walkability: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Any'],
            default: 'Any'
        },
        petFriendly: {
            type: Boolean,
            default: null // null means any preference
        },
        publicTransport: {
            type: Boolean,
            default: null
        },
        
        // Safety preferences
        minSafetyScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },
        
        // Budget preferences
        maxRent: {
            type: Number,
            min: 0
        },
        maxHomePrice: {
            type: Number,
            min: 0
        },
        
        // Amenity preferences
        minParks: {
            type: Number,
            min: 0,
            default: 0
        },
        schoolsNearby: {
            type: Boolean,
            default: false
        },
        
        // Weight preferences for matching algorithm
        weights: {
            safety: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.3
            },
            lifestyle: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.3
            },
            affordability: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.2
            },
            walkability: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.2
            }
        }
    },
    
    // User profile
    age: {
        type: Number,
        min: 18,
        max: 120
    },
    occupation: {
        type: String,
        trim: true
    },
    familySize: {
        type: Number,
        min: 1,
        default: 1
    },
    hasPets: {
        type: Boolean,
        default: false
    },
    preferredCity: {
        type: String,
        trim: true
    },
    
    // Search history
    searchHistory: [{
        query: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Favorite neighborhoods
    favorites: [{
        neighborhood: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Neighborhood'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to validate preferences
userSchema.methods.validatePreferences = function() {
    const weights = this.preferences.weights;
    const totalWeight = weights.safety + weights.lifestyle + weights.affordability + weights.walkability;
    
    if (Math.abs(totalWeight - 1) > 0.01) {
        throw new Error('Weights must sum to 1.0');
    }
    
    return true;
};

// Method to get search criteria
userSchema.methods.getSearchCriteria = function() {
    const criteria = {};
    
    if (this.preferences.lifestyle !== 'Any') {
        criteria.type = this.preferences.lifestyle;
    }
    
    if (this.preferences.walkability !== 'Any') {
        criteria.walkable = this.preferences.walkability;
    }
    
    if (this.preferences.petFriendly !== null) {
        criteria.petFriendly = this.preferences.petFriendly;
    }
    
    if (this.preferences.publicTransport !== null) {
        criteria.publicTransportAccess = this.preferences.publicTransport;
    }
    
    if (this.preferences.minParks > 0) {
        criteria.parks = { $gte: this.preferences.minParks };
    }
    
    if (this.preferences.schoolsNearby) {
        criteria.schools = { $gt: 0 };
    }
    
    if (this.preferences.minSafetyScore > 0) {
        criteria.crimeSafetyScore = { $gte: this.preferences.minSafetyScore };
    }
    
    return criteria;
};

module.exports = mongoose.model('User', userSchema); 