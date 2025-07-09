# NeighborFit Backend API

A comprehensive backend API for the NeighborFit neighborhood lifestyle matching platform.

## Features

- **Neighborhood Management**: CRUD operations for neighborhood data
- **User Authentication**: JWT-based authentication with user profiles
- **Matching Algorithm**: Intelligent neighborhood matching based on user preferences
- **Data Seeding**: Import neighborhood data from JSON/CSV files
- **Search & Filtering**: Advanced search with multiple criteria
- **Favorites System**: Save and manage favorite neighborhoods
- **Comparison Tools**: Compare multiple neighborhoods side-by-side

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `config.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/neighborfit
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user

### Neighborhoods
- `GET /api/neighborhoods` - Get all neighborhoods (with pagination)
- `GET /api/neighborhoods/:id` - Get neighborhood by ID
- `GET /api/neighborhoods/city/:city` - Get neighborhoods by city
- `GET /api/neighborhoods/search` - Search neighborhoods with filters
- `GET /api/neighborhoods/stats` - Get neighborhood statistics
- `POST /api/neighborhoods/seed-data` - Seed data from JSON file
- `DELETE /api/neighborhoods/clear-data` - Clear all data

### User Management
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)
- `PUT /api/users/preferences` - Update user preferences (protected)
- `GET /api/users/favorites` - Get user favorites (protected)
- `POST /api/users/favorites` - Add to favorites (protected)
- `DELETE /api/users/favorites/:id` - Remove from favorites (protected)

### Matching
- `GET /api/matching/matches` - Get personalized matches (protected)
- `GET /api/matching/anonymous` - Get anonymous matches (public)
- `GET /api/matching/recommendations` - Get recommendations (protected)
- `POST /api/matching/compare` - Compare neighborhoods (optional auth)

## Data Models

### Neighborhood Schema
```javascript
{
  city: String,
  neighborhood: String,
  type: String (Urban/Suburban/Rural),
  population: Number,
  violentCrimes: Number,
  rateOfViolentCrimes: Number,
  chargesheetingRate: Number,
  publicTransportAccess: Boolean,
  parks: Number,
  schools: Number,
  petFriendly: Boolean,
  walkable: String (Low/Medium/High),
  crimeSafetyScore: Number (calculated),
  lifestyleScore: Number (calculated)
}
```

### User Schema
```javascript
{
  name: String,
  email: String,
  password: String (hashed),
  preferences: {
    lifestyle: String,
    walkability: String,
    petFriendly: Boolean,
    publicTransport: Boolean,
    minSafetyScore: Number,
    maxRent: Number,
    weights: {
      safety: Number,
      lifestyle: Number,
      affordability: Number,
      walkability: Number
    }
  },
  favorites: [Neighborhood],
  searchHistory: [String]
}
```

## Matching Algorithm

The matching algorithm calculates a score based on:

1. **Safety Score** (30% weight by default)
   - Based on crime rate and chargesheeting rate
   - Higher score = safer neighborhood

2. **Lifestyle Score** (30% weight by default)
   - Based on amenities (parks, schools, transport)
   - Pet-friendliness and walkability

3. **Walkability Score** (20% weight by default)
   - High: 100 points, Medium: 60 points, Low: 20 points

4. **Affordability Score** (20% weight by default)
   - Based on rent/home prices vs user budget

## Data Seeding

To populate the database with neighborhood data:

1. Ensure your JSON file is in the root directory
2. Make a POST request to `/api/neighborhoods/seed-data`
3. The API will transform and insert the data

## Error Handling

All endpoints return consistent error responses:
```javascript
{
  "error": "Error message",
  "message": "Detailed error description" // optional
}
```

## Authentication

Protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Development

- Use `npm run dev` for development with auto-restart
- MongoDB must be running locally or update MONGODB_URI
- Check console for detailed error messages 