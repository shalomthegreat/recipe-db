// data setup
var dataSet = [];
var columnsF = [
  { title: "Title", data: "title" },
  { title: "Category", data: "category" },
  { title: "Tags", data: "tags" },
  { title: "Author", data: "author" },
  { title: "Actions" }
];
var columnRenderF = [
  {
    render: function (data, type, full, meta) {
      return `<a href="/recipe.html?id=${full._id}">${full.title}</a>`;
    },
    width: "25%",
    targets: 0
  },
  {
    width: "50px",
    targets: 1
  },
  {
    width: "100px",
    targets: 3
  },
  {
    render: function (data, type, full, meta) {
      const recipeId = full._id || "";
      return `
        <div class="action-buttons">
          <button type="button" class="edit-btn action-btn icon" data-recipe-id="${recipeId}">📝</button>
          <button type="button" class="delete-btn action-btn icon" data-recipe-id="${recipeId}">🚮</button>
        </div>
      `;
    },
    width: "80px",
    targets: 4
  }
];

// DataTables functions
function init() {
  // If DataTable already exists, destroy it first
  if ($.fn.DataTable.isDataTable("#mytable")) {
    $("#mytable").DataTable().destroy();
  }

  $("#mytable").off();

  // Set up DataTables error handling
  $.fn.dataTable.ext.errMode = "none";
  $("#mytable").on("error.dt", function (e, settings, techNote, message) {
    console.log("An error has been reported by DataTables: ", message);
  });

  try {
    $("#mytable").DataTable({
      language: {
        emptyTable:
          "<p style='margin:10px'>This is the beginning of your recipe collection.</p><p id='first'>Add your first recipe to get started!</p>"
      },
      order: [[0, "asc"]],
      pageLength: 30,
      lengthMenu: [
        [10, 30, 50, -1],
        [10, 30, 50, "All"]
      ],
      data: dataSet,
      columns: columnsF,
      columnDefs: columnRenderF,
      // This function runs after the table is drawn or redrawn
      drawCallback: function() {
        console.log("Table drawn/redrawn - binding edit/delete buttons");
        // Bind click events directly to the buttons after table is drawn
        bindEditDeleteButtons();
        bindRowClicks();
      }
    });
  } catch (error) {
    console.error("An error occurred during DataTable initialization:", error);
  }

  if ($(".dataTables_empty").length == 1) {
    $("#welcome").css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);
  }
}

// Form handling functions
function createRecipeObject() {
  // Get basic recipe info - simplified for initial creation
  const recipe = {
    title: $("#title").val().trim(),
    category: $("#category").val().trim(),
    tags: $("#comment").val().trim(),
    author: $("#author").val() || "",

    // Initialize empty arrays for required fields
    steps: [],
    notes: [],
    ingredients: []
  };

  return recipe;
}

function clearForm() {
  $("#title").val("");
  $("#category").val("");
  $("#comment").val("");
  $("#author").val("");
  $("#recipe-id").val(""); // Hidden field for recipe ID when editing
  clearValidation();
}

// Inline validation functions
function showFieldError(fieldId, message) {
  const $input = $("#" + fieldId);
  const $error = $("#" + fieldId + "-error");
  $input.addClass("invalid").removeClass("valid");
  $error.text(message).addClass("visible");
}

function clearFieldError(fieldId) {
  const $input = $("#" + fieldId);
  const $error = $("#" + fieldId + "-error");
  $input.removeClass("invalid");
  if ($input.val().trim()) {
    $input.addClass("valid");
  } else {
    $input.removeClass("valid");
  }
  $error.text("").removeClass("visible");
}

function clearValidation() {
  $("#title, #category").removeClass("invalid valid");
  $(".error-message").text("").removeClass("visible");
}

function validateField(fieldId) {
  const value = $("#" + fieldId).val().trim();
  if (!value) {
    const label = fieldId === "title" ? "Title" : "Category";
    showFieldError(fieldId, label + " is required");
    return false;
  }
  clearFieldError(fieldId);
  return true;
}

function validateForm() {
  const isTitleValid = validateField("title");
  const isCategoryValid = validateField("category");
  return isTitleValid && isCategoryValid;
}

// API functions
async function fetchRecipes() {
  try {
    showLoader();
    const response = await fetch("/api/recipes");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const recipes = await response.json();
    dataSet = recipes;
    init();
    hideLoader();
  } catch (error) {
    console.error("Error fetching recipes:", error);
    showError("Failed to load recipes. Please try again later.");
    hideLoader();
  }
}

async function fetchRecipeById(id) {
  try {
    showLoader();
    const response = await fetch(`/api/recipes/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const recipe = await response.json();
    hideLoader();
    return recipe;
  } catch (error) {
    console.error(`Error fetching recipe ${id}:`, error);
    showError("Failed to load recipe details. Please try again later.");
    hideLoader();
    return null;
  }
}

async function createRecipe(recipeData) {
  try {
    showLoader();
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(recipeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = errorData.error || `HTTP error! Status: ${response.status}`;

      // Check for detailed validation errors
      if (errorData.details) {
        errorMessage +=
          ": " +
          Object.entries(errorData.details)
            .map(([field, msg]) => `${field} - ${msg}`)
            .join(", ");
      }

      throw new Error(errorMessage);
    }

    const newRecipe = await response.json();
    hideLoader();
    showSuccess("Recipe created successfully!");
    return newRecipe;
  } catch (error) {
    console.error("Error creating recipe:", error);
    showError(error.message || "Failed to create recipe. Please check your data and try again.");
    hideLoader();
    return null;
  }
}

async function updateRecipe(id, recipeData) {
  try {
    showLoader();
    const response = await fetch(`/api/recipes/${id}`, {
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

    const updatedRecipe = await response.json();
    hideLoader();
    showSuccess("Recipe updated successfully!");
    return updatedRecipe;
  } catch (error) {
    console.error(`Error updating recipe ${id}:`, error);
    showError("Failed to update recipe. Please check your data and try again.");
    hideLoader();
    return null;
  }
}

async function deleteRecipe(id) {
  try {
    showLoader();
    const response = await fetch(`/api/recipes/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    hideLoader();
    showSuccess("Recipe deleted successfully!");
    return true;
  } catch (error) {
    console.error(`Error deleting recipe ${id}:`, error);
    showError("Failed to delete recipe. Please try again later.");
    hideLoader();
    return false;
  }
}

// UI helper functions
function showLoader() {
  // Implement a loading indicator
  $("#loader").show();
}

function hideLoader() {
  // Hide loading indicator
  $("#loader").hide();
}

function showError(message) {
  // Display error message to user
  alert(message); // Simple implementation, could be improved with a toast or modal
}

function showSuccess(message) {
  // Display success message to user
  alert(message); // Simple implementation, could be improved with a toast or modal
}

// Function to bind edit and delete button events after table is drawn
function bindEditDeleteButtons() {
  // Remove any existing handlers to prevent duplicates
  $(".edit-btn").off("click");
  $(".delete-btn").off("click");
  
  // Add edit button handler
  $(".edit-btn").on("click", async function(e) {
    console.log("Edit button clicked via direct binding", this);
    e.preventDefault();
    e.stopPropagation();
    
    const recipeId = $(this).attr("data-recipe-id");
    console.log("Recipe ID from attribute:", recipeId);
    
    if (!recipeId) {
      showError("No recipe ID found on the edit button");
      return;
    }
    
    const recipe = await fetchRecipeById(recipeId);
    console.log("Fetched recipe:", recipe);
    
    if (recipe) {
      // Populate the form with recipe data - simplified for our basic form
      $("#title").val(recipe.title || "");
      $("#category").val(recipe.category || "");
      $("#comment").val(recipe.tags || "");
      $("#author").val(recipe.author || "");
      
      // Store the recipe ID in a hidden field
      $("#recipe-id").val(recipe._id);
      
      // Update form title and show edit button
      $("#new-entry-title").text("Edit Recipe");
      $("#addb").hide();
      $("#editb").show();
      
      // Show the form
      $("#new").css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);
    }
  });
  
  // Add delete button handler
  $(".delete-btn").on("click", async function(e) {
    console.log("Delete button clicked via direct binding", this);
    e.preventDefault();
    e.stopPropagation();
    
    const recipeId = $(this).attr("data-recipe-id");
    console.log("Recipe ID for delete:", recipeId);
    
    if (!recipeId) {
      showError("No recipe ID found on the delete button");
      return;
    }
    
    if (confirm("Are you sure you want to delete this recipe?")) {
      const deleted = await deleteRecipe(recipeId);
      if (deleted) {
        await fetchRecipes(); // Refresh the recipe list
      }
    }
  });
}

$(document).ready(function () {
  // Add a loading indicator if it doesn't exist
  if ($("#loader").length === 0) {
    $("body").append(
      '<div id="loader" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);z-index:9999;text-align:center;padding-top:20%;">Loading...</div>'
    );
  }

  // Click functions
  $("#newb").click(function () {
    clearForm();
    $("#new-entry-title").text("New Recipe");
    $("#recipe-id").val(""); // Clear any existing recipe ID
    $("#addb").show();
    $("#editb").hide();
    $("#new").css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);
  });

  $(".hideme, #okb, #cancelb")
    .click(function () {
      $(".hideme").fadeOut();
    })
    .children()
    .click(function (e) {
      e.stopPropagation();
    });

  // Create new recipe
  $("#addb").click(async function () {
    if (!validateForm()) {
      return;
    }

    const recipeData = createRecipeObject();
    const newRecipe = await createRecipe(recipeData);
    if (newRecipe) {
      $(".hideme").fadeOut();
      await fetchRecipes(); // Refresh the recipe list
    }
  });

  // Edit recipe button events are now handled by bindEditDeleteButtons()

  // Update recipe
  $("#editb").click(async function () {
    const recipeId = $("#recipe-id").val();
    if (!recipeId) {
      showError("Recipe ID is missing!");
      return;
    }

    // First fetch the existing recipe to preserve data not in our form
    const existingRecipe = await fetchRecipeById(recipeId);
    if (!existingRecipe) {
      showError("Could not fetch the existing recipe!");
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Get the form data
    const formData = {
      title: $("#title").val().trim(),
      category: $("#category").val().trim(),
      tags: $("#comment").val().trim(),
      author: $("#author").val() || ""
    };

    // Merge the form data with existing recipe data
    // This preserves all the fields that aren't in our simplified form
    const recipeData = {
      ...existingRecipe,
      ...formData
    };

    const updatedRecipe = await updateRecipe(recipeId, recipeData);
    if (updatedRecipe) {
      $(".hideme").fadeOut();
      await fetchRecipes(); // Refresh the recipe list
    }
  });

  // Delete recipe button events are now handled by bindEditDeleteButtons()

  // Real-time inline validation on required fields
  $("#title, #category").on("blur", function () {
    validateField(this.id);
  });

  $("#title, #category").on("input", function () {
    const $input = $(this);
    if ($input.hasClass("invalid")) {
      validateField(this.id);
    }
  });

  // Fetch initial data
  fetchRecipes();
});

// Function to bind row clicks for navigation to recipe detail page
function bindRowClicks() {
  // Remove any existing handlers to prevent duplicates
  $("#mytable tbody tr").off("click.rowNav");

  $("#mytable tbody tr").on("click.rowNav", function(e) {
    // Don't navigate if clicking action buttons or the actions cell
    if ($(e.target).closest(".action-buttons, button").length > 0) {
      return;
    }

    // Don't navigate if clicking a link directly
    if ($(e.target).closest("a").length > 0) {
      return;
    }

    const rowData = $("#mytable").DataTable().row(this).data();
    if (rowData && rowData._id) {
      window.location.href = `/recipe.html?id=${rowData._id}`;
    }
  });
}
