const Neighborhood = require('../models/Neighborhood');
const fs = require('fs').promises;
const path = require('path');

// Get all neighborhoods
exports.getAllNeighborhoods = async (req, res) => {
    try {
        const { page = 1, limit = 10, city, type, walkable, sortBy = 'city' } = req.query;
        
        const query = {};
        if (city) query.city = { $regex: city, $options: 'i' };
        if (type) query.type = type;
        if (walkable) query.walkable = walkable;
        
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortBy]: 1 }
        };
        
        const neighborhoods = await Neighborhood.find(query)
            .sort(options.sort)
            .limit(options.limit * 1)
            .skip((options.page - 1) * options.limit);
            
        const total = await Neighborhood.countDocuments(query);
        
        res.json({
            neighborhoods,
            totalPages: Math.ceil(total / options.limit),
            currentPage: options.page,
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get neighborhood by ID
exports.getNeighborhoodById = async (req, res) => {
    try {
        const neighborhood = await Neighborhood.findById(req.params.id);
        if (!neighborhood) {
            return res.status(404).json({ error: 'Neighborhood not found' });
        }
        res.json(neighborhood);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get neighborhoods by city
exports.getNeighborhoodsByCity = async (req, res) => {
    try {
        const { city } = req.params;
        const neighborhoods = await Neighborhood.find({
            city: { $regex: city, $options: 'i' }
        });
        res.json(neighborhoods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get neighborhood statistics
exports.getNeighborhoodStats = async (req, res) => {
    try {
        const stats = await Neighborhood.aggregate([
            {
                $group: {
                    _id: null,
                    totalNeighborhoods: { $sum: 1 },
                    avgPopulation: { $avg: '$population' },
                    avgCrimeRate: { $avg: '$rateOfViolentCrimes' },
                    avgSafetyScore: { $avg: '$crimeSafetyScore' },
                    avgLifestyleScore: { $avg: '$lifestyleScore' },
                    cities: { $addToSet: '$city' }
                }
            }
        ]);
        
        const walkabilityStats = await Neighborhood.aggregate([
            {
                $group: {
                    _id: '$walkable',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const typeStats = await Neighborhood.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        res.json({
            general: stats[0] || {},
            walkability: walkabilityStats,
            types: typeStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Seed data from JSON file
exports.seedData = async (req, res) => {
    try {
        // Check if data already exists
        const existingCount = await Neighborhood.countDocuments();
        if (existingCount > 0) {
            return res.status(400).json({ 
                error: 'Data already exists. Use /clear-data to remove existing data first.' 
            });
        }
        
        // Read JSON file
        const dataPath = path.join(__dirname, '../../neighborfit_city_dataset.json');
        const rawData = await fs.readFile(dataPath, 'utf8');
        const neighborhoods = JSON.parse(rawData);
        
        // Transform data to match our schema
        const transformedData = neighborhoods.map(item => ({
            city: item.City,
            neighborhood: item.Neighborhood,
            type: item.Type,
            population: parseFloat(item['Population (Lakhs)']) * 100000, // Convert lakhs to actual population
            violentCrimes: item['Violent Crimes (2022)'],
            rateOfViolentCrimes: item['Rate of Violent Crimes'],
            chargesheetingRate: item['Chargesheeting Rate'],
            publicTransportAccess: item['Public Transport Access'] === 'Yes',
            parks: item.Parks,
            schools: item.Schools,
            petFriendly: item['Pet-Friendly'] === 'Yes',
            walkable: item.Walkable
        }));
        
        // Insert data
        const result = await Neighborhood.insertMany(transformedData);
        
        res.json({
            message: `Successfully seeded ${result.length} neighborhoods`,
            count: result.length
        });
    } catch (error) {
        console.error('Seeding error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Clear all data
exports.clearData = async (req, res) => {
    try {
        const result = await Neighborhood.deleteMany({});
        res.json({
            message: `Cleared ${result.deletedCount} neighborhoods`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add single neighborhood
exports.addNeighborhood = async (req, res) => {
    try {
        const neighborhood = new Neighborhood(req.body);
        await neighborhood.save();
        res.status(201).json({
            message: 'Neighborhood added successfully',
            neighborhood
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Add multiple neighborhoods (bulk insert)
exports.addBulkNeighborhoods = async (req, res) => {
    try {
        const { neighborhoods } = req.body;
        
        if (!Array.isArray(neighborhoods)) {
            return res.status(400).json({ error: 'neighborhoods must be an array' });
        }
        
        const result = await Neighborhood.insertMany(neighborhoods);
        
        res.status(201).json({
            message: `Successfully added ${result.length} neighborhoods`,
            count: result.length,
            neighborhoods: result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Search neighborhoods with filters
exports.searchNeighborhoods = async (req, res) => {
    try {
        const {
            city,
            type,
            walkable,
            petFriendly,
            publicTransport,
            minParks,
            schoolsNearby,
            minSafetyScore,
            maxCrimeRate,
            sortBy = 'city',
            order = 'asc'
        } = req.query;
        
        const query = {};
        
        if (city) query.city = { $regex: city, $options: 'i' };
        if (type) query.type = type;
        if (walkable) query.walkable = walkable;
        if (petFriendly !== undefined) query.petFriendly = petFriendly === 'true';
        if (publicTransport !== undefined) query.publicTransportAccess = publicTransport === 'true';
        if (minParks) query.parks = { $gte: parseInt(minParks) };
        if (schoolsNearby === 'true') query.schools = { $gt: 0 };
        if (minSafetyScore) query.crimeSafetyScore = { $gte: parseInt(minSafetyScore) };
        if (maxCrimeRate) query.rateOfViolentCrimes = { $lte: parseFloat(maxCrimeRate) };
        
        const sortOrder = order === 'desc' ? -1 : 1;
        
        const neighborhoods = await Neighborhood.find(query)
            .sort({ [sortBy]: sortOrder });
            
        res.json({
            neighborhoods,
            count: neighborhoods.length,
            filters: req.query
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}; 

// Get all unique cities
exports.getAllCities = async (req, res) => {
    try {
        const cities = await Neighborhood.distinct('city');
        res.json({ cities });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}; 

// Bulk update neighborhoods
exports.bulkUpdateNeighborhoods = async (req, res) => {
  try {
    const { neighborhoods } = req.body;
    if (!Array.isArray(neighborhoods)) {
      return res.status(400).json({ error: 'neighborhoods must be an array' });
    }

    const results = [];
    for (const n of neighborhoods) {
      // Update by city + neighborhood name
      const filter = { city: n.city, neighborhood: n.neighborhood };
      const update = { $set: n };
      const result = await Neighborhood.updateOne(filter, update);
      results.push(result);
    }

    res.json({
      message: `Updated ${results.length} neighborhoods`,
      results
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}; 