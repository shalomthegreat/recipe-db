const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI_RECIPES;
const client = new MongoClient(uri);

// Database and collection names
const DB_NAME = 'myrecipes';
const COLLECTIONS = {
  RECIPES: 'recipes',
  USERS: 'users'
};

/**
 * Connect to the database
 * @returns {Promise<Object>} MongoDB client connection
 */
async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get database instance
 * @returns {Object} MongoDB database instance
 */
function getDB() {
  return client.db(DB_NAME);
}

/**
 * Close database connection
 */
async function closeDB() {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
  COLLECTIONS
};
