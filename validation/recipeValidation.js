// Fields expected to be string-typed when provided.
const STRING_FIELDS = {
  tags: 'Tags must be a comma-separated string',
  prep: 'Prep time must be a string',
  cook: 'Cook time must be a string',
  total: 'Total time must be a string',
  yield: 'Yield must be a string'
};

/**
 * Validates the shared, non-required recipe fields (ingredients, steps, notes,
 * tags, and time fields). Used by both full and partial validation.
 * @param {Object} recipeData - Recipe data to validate
 * @param {Object} errors - Errors object to populate in place
 */
function validateOptionalFields(recipeData, errors) {
  // Validate ingredients
  if (recipeData.ingredients !== undefined) {
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
  if (recipeData.steps !== undefined) {
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

  // Validate notes if provided
  if (recipeData.notes !== undefined && !Array.isArray(recipeData.notes)) {
    errors.notes = 'Notes must be an array';
  }

  // Validate string-typed fields if provided
  for (const [field, message] of Object.entries(STRING_FIELDS)) {
    if (recipeData[field] !== undefined && typeof recipeData[field] !== 'string') {
      errors[field] = message;
    }
  }
}

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

  validateOptionalFields(recipeData, errors);

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates partial recipe data for PATCH updates
 * @param {Object} recipeData - Partial recipe data to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
function validatePatchRecipe(recipeData) {
  const errors = {};

  // Required fields are only validated when present (partial update)
  if (recipeData.title !== undefined && (!recipeData.title || recipeData.title.trim() === '')) {
    errors.title = 'Title cannot be empty';
  }

  if (recipeData.category !== undefined && (!recipeData.category || recipeData.category.trim() === '')) {
    errors.category = 'Category cannot be empty';
  }

  validateOptionalFields(recipeData, errors);

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateRecipe,
  validatePatchRecipe
};
