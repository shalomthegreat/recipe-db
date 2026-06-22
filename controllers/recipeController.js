const { getDB } = require('../config/db');
const Recipe = require('../models/Recipe');
const { validateRecipe } = require('../validation/recipeValidation');

/**
 * Get all recipes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllRecipes(req, res) {
  try {
    const db = getDB();
    
    // Handle query parameters for filtering
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.tag) {
      filter.tags = { $in: [req.query.tag] };
    }
    
    // Handle pagination
    const options = {};
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    options.skip = (page - 1) * limit;
    options.limit = limit;
    
    const recipes = await Recipe.getAllRecipes(db, filter, options);
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Error fetching recipes' });
  }
}

/**
 * Get recipe by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getRecipeById(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();
    const recipe = await Recipe.getRecipeById(db, id);
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Error fetching recipe' });
  }
}

/**
 * Create new recipe
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createRecipe(req, res) {
  try {
    const recipeData = req.body;
    
    // Log the incoming data for debugging
    console.log('Creating recipe with data:', JSON.stringify(recipeData));
    
    // Validate recipe data
    const validation = validateRecipe(recipeData);
    if (!validation.isValid) {
      console.log('Validation failed:', validation.errors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }
    
    const db = getDB();
    const newRecipe = await Recipe.createRecipe(db, recipeData);
    
    res.status(201).json(newRecipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Error creating recipe: ' + error.message });
  }
}

/**
 * Update recipe
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateRecipe(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Basic validation
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }
    
    // Validate recipe data if it's a complete update
    if (updateData.title || updateData.category) {
      const validation = validateRecipe({
        ...updateData,
        // Add dummy values for required fields if not provided
        title: updateData.title || 'dummy',
        category: updateData.category || 'dummy'
      });
      
      if (!validation.isValid) {
        return res.status(400).json({ errors: validation.errors });
      }
    }
    
    const db = getDB();
    
    // Check if recipe exists before updating
    const existingRecipe = await Recipe.getRecipeById(db, id);
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const updatedRecipe = await Recipe.updateRecipe(db, id, updateData);
    res.json(updatedRecipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Error updating recipe' });
  }
}

/**
 * Delete recipe
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function deleteRecipe(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();
    
    // Check if recipe exists before deleting
    const existingRecipe = await Recipe.getRecipeById(db, id);
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const deleted = await Recipe.deleteRecipe(db, id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Error deleting recipe' });
  }
}

module.exports = {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe
};
