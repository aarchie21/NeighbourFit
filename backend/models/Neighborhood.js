const mongoose = require('mongoose');

const neighborhoodSchema = new mongoose.Schema({
    city: {
        type: String,
        required: true,
        trim: true
    },
    neighborhood: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['Urban', 'Suburban', 'Rural'],
        required: true
    },
    population: {
        type: Number,
        required: true,
        min: 0
    },
    violentCrimes: {
        type: Number,
        required: true,
        min: 0
    },
    rateOfViolentCrimes: {
        type: Number,
        required: true,
        min: 0
    },
    chargesheetingRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    publicTransportAccess: {
        type: Boolean,
        required: true
    },
    parks: {
        type: Number,
        required: true,
        min: 0
    },
    schools: {
        type: Number,
        required: true,
        min: 0
    },
    petFriendly: {
        type: Boolean,
        required: true
    },
    walkable: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        required: true
    },
    // Additional fields for enhanced matching
    averageRent: {
        type: Number,
        min: 0
    },
    averageHomePrice: {
        type: Number,
        min: 0
    },
    crimeSafetyScore: {
        type: Number,
        min: 0,
        max: 100,
        default: function() {
            // Calculate safety score based on crime rate and chargesheeting rate
            const crimeScore = Math.max(0, 100 - this.rateOfViolentCrimes);
            const chargesheetScore = this.chargesheetingRate;
            return Math.round((crimeScore + chargesheetScore) / 2);
        }
    },
    lifestyleScore: {
        type: Number,
        min: 0,
        max: 100,
        default: function() {
            // Calculate lifestyle score based on amenities
            let score = 0;
            if (this.publicTransportAccess) score += 20;
            if (this.petFriendly) score += 15;
            score += (this.parks * 5); // 5 points per park
            score += (this.schools * 5); // 5 points per school
            
            // Walkability bonus
            if (this.walkable === 'High') score += 20;
            else if (this.walkable === 'Medium') score += 10;
            
            return Math.min(100, score);
        }
    }
}, {
    timestamps: true
});

// Index for efficient querying
neighborhoodSchema.index({ city: 1, neighborhood: 1 });
neighborhoodSchema.index({ crimeSafetyScore: -1 });
neighborhoodSchema.index({ lifestyleScore: -1 });

// Virtual for full location name
neighborhoodSchema.virtual('fullLocation').get(function() {
    return `${this.neighborhood}, ${this.city}`;
});

// Method to calculate match score with user preferences
neighborhoodSchema.methods.calculateMatchScore = function(userPreferences) {
    let score = 0;
    const weights = userPreferences.weights || {
        safety: 0.3,
        lifestyle: 0.3,
        affordability: 0.2,
        walkability: 0.2
    };

    // Safety score (0-100)
    const safetyScore = this.crimeSafetyScore;
    score += (safetyScore / 100) * weights.safety * 100;

    // Lifestyle score (0-100)
    const lifestyleScore = this.lifestyleScore;
    score += (lifestyleScore / 100) * weights.lifestyle * 100;

    // Walkability score
    let walkabilityScore = 0;
    if (this.walkable === 'High') walkabilityScore = 100;
    else if (this.walkable === 'Medium') walkabilityScore = 60;
    else walkabilityScore = 20;
    score += (walkabilityScore / 100) * weights.walkability * 100;

    // Affordability score (if data available)
    if (this.averageRent && userPreferences.maxRent) {
        const affordabilityScore = Math.max(0, 100 - ((this.averageRent - userPreferences.maxRent) / userPreferences.maxRent * 100));
        score += (affordabilityScore / 100) * weights.affordability * 100;
    }

    return Math.round(score);
};

module.exports = mongoose.model('Neighborhood', neighborhoodSchema); 