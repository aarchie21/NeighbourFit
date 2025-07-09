const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Neighborhood = require('./models/Neighborhood');

// Load environment variables
dotenv.config({ path: './config.env' });

console.log('Clearing existing neighborhood data...');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/neighborfit', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Clear all neighborhoods
    const result = await Neighborhood.deleteMany({});
    console.log(`🗑️ Cleared ${result.deletedCount} neighborhoods`);
    
    console.log('✅ Database cleared successfully!');
})
.catch(err => {
    console.error('❌ Error:', err.message);
})
.finally(() => {
    mongoose.connection.close();
    console.log('🔌 Connection closed');
}); 