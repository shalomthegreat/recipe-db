const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

// GET all recipes
router.get('/', recipeController.getAllRecipes);

// GET recipe by ID
router.get('/:id', recipeController.getRecipeById);

// POST new recipe
router.post('/', recipeController.createRecipe);

// PUT update recipe
router.put('/:id', recipeController.updateRecipe);

// PATCH update recipe fields partially
router.patch('/:id', recipeController.patchRecipe);

// DELETE recipe
router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;
