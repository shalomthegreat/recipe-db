// Recipe detail page functionality
let recipeId = null;

// Get recipe ID from URL parameters
function getRecipeIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Fetch recipe data from API
async function fetchRecipe() {
  recipeId = getRecipeIdFromUrl();
  if (!recipeId) {
    showError("No recipe ID provided");
    return;
  }

  try {
    showLoader();
    const response = await fetch(`/api/recipes/${recipeId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const recipe = await response.json();
    populateRecipeData(recipe);
    hideLoader();
  } catch (error) {
    console.error("Error fetching recipe:", error);
    showError("Failed to load recipe. Please try again later.");
    hideLoader();
  }
}

// Populate recipe data into the page
function populateRecipeData(recipe) {
  // Set title
  $("h3.fdancing").text(recipe.title || "Recipe Title");
  
  // Set time information
  $("#prep").text(recipe.prep || "");
  $("#bake").text(recipe.cook || "");
  $("#total").text(recipe.total || "");
  $("#yield").text(recipe.yield || "");
  
  // Handle ingredients (complex structure)
  const $items = $("#items");
  // Clear existing ingredients except the heading
  $items.find(".set, .mtitle").remove();
  
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    recipe.ingredients.forEach(section => {
      const sectionName = section.section || "Ingredients";
      const items = section.items || [];
      
      // Add section title
      $items.append(`<p class="mtitle edit">${sectionName}</p>`);
      
      // Add ingredients
      const ingredientsHtml = items.join("<br>");
      $items.append(`
        <div class="set">
          <div class="text">${ingredientsHtml}</div>
          <textarea class="field">${items.join("\\n")}</textarea>
        </div>
      `);
    });
  } else {
    // Add default empty section
    $items.append(`
      <p class="mtitle edit">Ingredients</p>
      <div class="set">
        <div class="text"></div>
        <textarea class="field"></textarea>
      </div>
    `);
  }
  
  // Set instructions
  const $instructions = $("#instructions");
  $instructions.empty();
  
  if (recipe.steps && recipe.steps.length > 0) {
    recipe.steps.forEach(step => {
      $instructions.append(`<li>${step}</li>`);
    });
  } else {
    $instructions.append("<li>Add instructions here</li>");
  }
  
  // Update the instructions textarea
  const instructionsText = recipe.steps ? recipe.steps.join("\\n") : "";
  $instructions.siblings("textarea").val(instructionsText);
  
  // Set notes if they exist
  if (recipe.notes && recipe.notes.length > 0) {
    $("#note").show();
    $("#note .text").html(recipe.notes.join("<br>"));
    $("#note textarea").val(recipe.notes.join("\\n"));
  } else {
    $("#note").hide();
  }
  
  // Set credits
  $("#credits").text(recipe.credit ? `Credits - ${recipe.credit}` : "");
  
  // Set author
  $("span.edit.wider").text(recipe.author || "");
}

// Save recipe changes
async function saveRecipe() {
  if (!recipeId) {
    showError("No recipe ID available");
    return;
  }
  
  // Collect all recipe data from the page
  const recipeData = {
    title: $("h3.fdancing").text().trim(),
    prep: $("#prep").text().trim(),
    cook: $("#bake").text().trim(),
    total: $("#total").text().trim(),
    yield: $("#yield").text().trim(),
    author: $("span.edit.wider").text().trim(),
    credit: $("#credits").text().replace("Credits - ", "").trim()
  };
  
  // Collect ingredients by section
  recipeData.ingredients = [];
  $("#items .mtitle").each(function(index) {
    const sectionName = $(this).text().trim();
    const $set = $(this).next(".set");
    const itemsText = $set.find("textarea").val();
    const items = itemsText ? itemsText.split("\\n").filter(item => item.trim() !== "") : [];
    
    recipeData.ingredients.push({
      section: sectionName,
      items: items
    });
  });
  
  // Collect instructions
  const instructionsText = $("#instructions").siblings("textarea").val();
  recipeData.steps = instructionsText ? instructionsText.split("\\n").filter(step => step.trim() !== "") : [];
  
  // Collect notes
  if ($("#note").is(":visible")) {
    const notesText = $("#note textarea").val();
    recipeData.notes = notesText ? notesText.split("\\n").filter(note => note.trim() !== "") : [];
  } else {
    recipeData.notes = [];
  }
  
  try {
    showLoader();
    const response = await fetch(`/api/recipes/${recipeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(recipeData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }
    
    hideLoader();
    showSuccess("Recipe saved successfully!");
  } catch (error) {
    console.error("Error saving recipe:", error);
    showError("Failed to save recipe. Please try again later.");
    hideLoader();
  }
}

// Helper functions
function showLoader() {
  // Create loader if it doesn't exist
  if ($("#loader").length === 0) {
    $("body").append('<div id="loader" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);z-index:9999;text-align:center;padding-top:20%;">Loading...</div>');
  }
  $("#loader").show();
}

function hideLoader() {
  $("#loader").hide();
}

function showError(message) {
  alert(message);
}

function showSuccess(message) {
  alert(message);
}

// Initialize on document ready
$(document).ready(function() {
  // Override the presave function
  window.presave = function() {
    saveRecipe();
  };
  
  // Load recipe data
  fetchRecipe();
});
