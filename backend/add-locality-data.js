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
.then(() => console.log('Connected to MongoDB for adding locality data'))
.catch(err => console.error('MongoDB connection error:', err));

// Read the locality data
const dataPath = path.join(__dirname, 'complete-locality-data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const localityData = JSON.parse(rawData);

// Transform locality data to flat structure for database
const transformLocalityData = (localityData) => {
    const flatNeighborhoods = [];
    
    localityData.neighborhoods.forEach(cityData => {
        cityData.localities.forEach(locality => {
            flatNeighborhoods.push({
                city: cityData.city,
                neighborhood: locality.name, // This will be the locality name
                type: locality.type,
                population: locality.population,
                violentCrimes: locality.violentCrimes,
                rateOfViolentCrimes: locality.rateOfViolentCrimes,
                chargesheetingRate: locality.chargesheetingRate,
                publicTransportAccess: locality.publicTransportAccess,
                parks: locality.parks,
                schools: locality.schools,
                petFriendly: locality.petFriendly,
                walkable: locality.walkable,
                averageRent: locality.averageRent,
                averageHomePrice: locality.averageHomePrice
            });
        });
    });
    
    return flatNeighborhoods;
};

// Add the locality data
const addLocalityData = async () => {
    try {
        // Clear existing data first
        await Neighborhood.deleteMany({});
        console.log('Cleared existing neighborhood data');

        // Transform and insert data
        const transformedData = transformLocalityData(localityData);
        const neighborhoods = await Neighborhood.insertMany(transformedData);
        
        console.log(`Successfully added ${neighborhoods.length} localities`);
        
        // Log some sample data
        console.log('\nSample localities:');
        neighborhoods.slice(0, 6).forEach(neighborhood => {
            console.log(`- ${neighborhood.neighborhood}, ${neighborhood.city}`);
            console.log(`  Safety Score: ${neighborhood.crimeSafetyScore}, Lifestyle Score: ${neighborhood.lifestyleScore}`);
        });

        // Show summary by city
        const citySummary = {};
        neighborhoods.forEach(n => {
            if (!citySummary[n.city]) {
                citySummary[n.city] = [];
            }
            citySummary[n.city].push(n.neighborhood);
        });

        console.log('\n📊 Summary by City:');
        Object.entries(citySummary).forEach(([city, localities]) => {
            console.log(`${city}: ${localities.join(', ')}`);
        });

    } catch (error) {
        console.error('Error adding locality data:', error);
    } finally {
        mongoose.connection.close();
        console.log('Database connection closed');
    }
};

// Run the data addition
addLocalityData(); 