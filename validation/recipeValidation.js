/**
 * Validates recipe data based on the existing MongoDB schema
 * @param {Object} recipeData - Recipe data to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
function validateRecipe(recipeData) {
  const errors = {};
  
  // Required fields
  if (!recipeData.title || recipeData.title.trim() === '') {
    errors.title = 'Title is required';
  }
  
  if (!recipeData.category || recipeData.category.trim() === '') {
    errors.category = 'Category is required';
  }
  
  // Validate ingredients
  if (recipeData.ingredients) {
    if (!Array.isArray(recipeData.ingredients)) {
      errors.ingredients = 'Ingredients must be an array';
    } else {
      // Validate the section-based ingredients structure
      for (let i = 0; i < recipeData.ingredients.length; i++) {
        const section = recipeData.ingredients[i];
        
        if (!section || typeof section !== 'object') {
          errors.ingredients = `Ingredient section at index ${i} must be an object`;
          break;
        }
        
        if (!section.section || section.section.trim() === '') {
          errors.ingredients = `Ingredient section at index ${i} must have a section name`;
          break;
        }
        
        // If items are provided, they must be an array
        if (section.items && !Array.isArray(section.items)) {
          errors.ingredients = `Items in section "${section.section}" must be an array`;
          break;
        }
      }
    }
  }
  
  // Validate steps if provided
  if (recipeData.steps) {
    if (!Array.isArray(recipeData.steps)) {
      errors.steps = 'Steps must be an array';
    } else {
      const emptySteps = recipeData.steps.some(
        step => !step || step.trim() === ''
      );
      
      if (emptySteps) {
        errors.steps = 'Steps cannot be empty';
      }
    }
  }
  // Steps are now optional for new recipes
  
  // Validate notes if provided
  if (recipeData.notes && !Array.isArray(recipeData.notes)) {
    errors.notes = 'Notes must be an array';
  }
  
  // Validate tags
  if (recipeData.tags !== undefined && typeof recipeData.tags !== 'string') {
    errors.tags = 'Tags must be a comma-separated string';
  }
  
  // Validate time fields if provided
  if (recipeData.prep !== undefined && typeof recipeData.prep !== 'string') {
    errors.prep = 'Prep time must be a string';
  }
  
  if (recipeData.cook !== undefined && typeof recipeData.cook !== 'string') {
    errors.cook = 'Cook time must be a string';
  }
  
  if (recipeData.total !== undefined && typeof recipeData.total !== 'string') {
    errors.total = 'Total time must be a string';
  }
  
  if (recipeData.yield !== undefined && typeof recipeData.yield !== 'string') {
    errors.yield = 'Yield must be a string';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateRecipe
};
