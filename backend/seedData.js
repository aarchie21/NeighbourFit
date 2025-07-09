const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: './config.env' });

// Import models
const Neighborhood = require('./models/Neighborhood');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/neighborfit', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB for seeding'))
.catch(err => console.error('MongoDB connection error:', err));

// Read the JSON data
const dataPath = path.join(__dirname, '..', 'neighborfit_city_dataset.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const neighborhoodsData = JSON.parse(rawData);

// City-specific rent ranges (₹/month)
const cityRentRanges = {
    'Ahmedabad (Gujarat)': { min: 12000, max: 22000 },
    'Bengaluru (Karnataka)': { min: 20000, max: 35000 },
    'Chennai (Tamil Nadu)': { min: 15000, max: 30000 },
    'Delhi City': { min: 25000, max: 45000 },
    'Hyderabad (Telangana)': { min: 18000, max: 32000 },
    'Indore (Madhya Pradesh)': { min: 9000, max: 18000 },
    'Kolkata (West Bengal)': { min: 15000, max: 28000 },
    'Mumbai (Maharashtra)': { min: 30000, max: 60000 }, // Mumbai has higher rents
    'Patna (Bihar)': { min: 8000, max: 15000 },
    'Chandigarh (Chandigarh)': { min: 15000, max: 28000 },
    'Amritsar (Punjab)': { min: 10000, max: 18000 }
};

// City-specific home price ranges (₹)
const cityHomePriceRanges = {
    'Ahmedabad (Gujarat)': { min: 3000000, max: 8000000 },
    'Bengaluru (Karnataka)': { min: 5000000, max: 15000000 },
    'Chennai (Tamil Nadu)': { min: 4000000, max: 12000000 },
    'Delhi City': { min: 6000000, max: 20000000 },
    'Hyderabad (Telangana)': { min: 4000000, max: 12000000 },
    'Indore (Madhya Pradesh)': { min: 2000000, max: 6000000 },
    'Kolkata (West Bengal)': { min: 3500000, max: 10000000 },
    'Mumbai (Maharashtra)': { min: 8000000, max: 30000000 },
    'Patna (Bihar)': { min: 1500000, max: 5000000 },
    'Chandigarh (Chandigarh)': { min: 4000000, max: 12000000 },
    'Amritsar (Punjab)': { min: 2500000, max: 7000000 }
};

// Helper function to get random value within a range
const getRandomInRange = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Transform data to match our schema
const transformData = (rawData) => {
    return rawData.map(item => {
        const cityName = item.City;
        const rentRange = cityRentRanges[cityName] || { min: 15000, max: 30000 };
        const homePriceRange = cityHomePriceRanges[cityName] || { min: 4000000, max: 10000000 };
        
        return {
            city: item.City,
            neighborhood: item.Neighborhood,
            type: item.Type,
            population: parseFloat(item['Population (Lakhs)']) * 100000, // Convert lakhs to actual numbers
            violentCrimes: item['Violent Crimes (2022)'],
            rateOfViolentCrimes: item['Rate of Violent Crimes'],
            chargesheetingRate: item['Chargesheeting Rate'],
            publicTransportAccess: item['Public Transport Access'] === 'Yes',
            parks: item.Parks,
            schools: item.Schools,
            petFriendly: item['Pet-Friendly'] === 'Yes',
            walkable: item.Walkable,
            // Use city-specific rent ranges
            averageRent: getRandomInRange(rentRange.min, rentRange.max),
            averageHomePrice: getRandomInRange(homePriceRange.min, homePriceRange.max)
        };
    });
};

// Seed the database
const seedDatabase = async () => {
    try {
        // Clear existing data
        await Neighborhood.deleteMany({});
        console.log('Cleared existing neighborhood data');

        // Transform and insert data
        const transformedData = transformData(neighborhoodsData);
        const neighborhoods = await Neighborhood.insertMany(transformedData);
        
        console.log(`Successfully seeded ${neighborhoods.length} neighborhoods`);
        
        // Log some sample data with rent information
        console.log('\nSample neighborhoods with rent ranges:');
        neighborhoods.slice(0, 5).forEach(neighborhood => {
            console.log(`- ${neighborhood.neighborhood}, ${neighborhood.city}`);
            console.log(`  Rent: ₹${neighborhood.averageRent.toLocaleString()}/month`);
            console.log(`  Home Price: ₹${(neighborhood.averageHomePrice/100000).toFixed(1)}L`);
            console.log(`  Safety Score: ${neighborhood.crimeSafetyScore}, Lifestyle Score: ${neighborhood.lifestyleScore}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the seeding
seedDatabase(); 