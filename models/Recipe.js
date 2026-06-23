const { ObjectId } = require('mongodb');

/**
 * Recipe schema definition based on the existing MongoDB structure
 * This is not enforced by MongoDB directly but serves as a reference
 * for our application code
 */
const recipeSchema = {
  title: String,         // Required - Recipe title
  category: String,      // Required - Recipe category (e.g., "entree")
  tags: String,          // Comma-separated tags (e.g., "pasta, cream")
  author: String,        // Author of the recipe
  
  // Time information
  prep: String,          // Prep time as string (e.g., "20mins")
  cook: String,          // Cook time as string (e.g., "40mins")
  total: String,         // Total time as string (e.g., "1hr")
  yield: String,         // Yield as string (e.g., "8 servings")
  
  // Recipe content
  steps: Array,          // Array of instruction steps
  notes: Array,          // Array of notes
  ingredients: Array,    // Complex structure with sections and items
  credit: String,        // Source attribution
  
  // Metadata
  createdAt: Date,       // Auto-generated
  updatedAt: Date        // Auto-generated
};

/**
 * Create a new recipe
 * @param {Object} db - Database instance
 * @param {Object} recipeData - Recipe data
 * @returns {Promise<Object>} Created recipe
 */
async function createRecipe(db, recipeData) {
  const { COLLECTIONS } = require('../config/db');
  
  const newRecipe = {
    ...recipeData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await db.collection(COLLECTIONS.RECIPES).insertOne(newRecipe);
  return { _id: result.insertedId, ...newRecipe };
}

/**
 * Get all recipes
 * @param {Object} db - Database instance
 * @param {Object} filter - Filter criteria
 * @param {Object} options - Query options (sort, limit, etc.)
 * @returns {Promise<Array>} Array of recipes
 */
async function getAllRecipes(db, filter = {}, options = {}) {
  const { COLLECTIONS } = require('../config/db');
  
  const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
  
  return db.collection(COLLECTIONS.RECIPES)
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();
}

/**
 * Get recipe by ID
 * @param {Object} db - Database instance
 * @param {String} id - Recipe ID
 * @returns {Promise<Object|null>} Recipe or null if not found
 */
async function getRecipeById(db, id) {
  const { COLLECTIONS } = require('../config/db');
  
  try {
    const objectId = new ObjectId(id);
    return db.collection(COLLECTIONS.RECIPES).findOne({ _id: objectId });
  } catch (error) {
    console.error('Invalid ID format:', error);
    return null;
  }
}

/**
 * Update recipe
 * @param {Object} db - Database instance
 * @param {String} id - Recipe ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object|null>} Updated recipe or null if not found
 */
async function updateRecipe(db, id, updateData) {
  const { COLLECTIONS } = require('../config/db');
  
  try {
    const objectId = new ObjectId(id);
    
    const updatedRecipe = {
      ...updateData,
      updatedAt: new Date()
    };
    
    const result = await db.collection(COLLECTIONS.RECIPES).findOneAndUpdate(
      { _id: objectId },
      { $set: updatedRecipe },
      { returnDocument: 'after' }
    );

    return result;
  } catch (error) {
    console.error('Error updating recipe:', error);
    return null;
  }
}

/**
 * Delete recipe
 * @param {Object} db - Database instance
 * @param {String} id - Recipe ID
 * @returns {Promise<Boolean>} True if deleted, false otherwise
 */
async function deleteRecipe(db, id) {
  const { COLLECTIONS } = require('../config/db');
  
  try {
    const objectId = new ObjectId(id);
    const result = await db.collection(COLLECTIONS.RECIPES).deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return false;
  }
}

module.exports = {
  createRecipe,
  getAllRecipes,
  getRecipeById,
  updateRecipe,
  deleteRecipe
};
