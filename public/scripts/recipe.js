// Recipe detail page functionality
let recipeId = null;

// Get recipe ID from URL parameters
function getRecipeIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Fetch recipe data from API
async function fetchRecipe(isInitial = false) {
  recipeId = getRecipeIdFromUrl();
  if (!recipeId) {
    showError("No recipe ID provided");
    return;
  }

  try {
    if (!isInitial) {
      showLoader();
    }
    const recipe = await Storage.getById(recipeId);
    populateRecipeData(recipe);
    if (!isInitial) {
      hideLoader();
    }
  } catch (error) {
    console.error("Error fetching recipe:", error);
    showError("Failed to load recipe. Please try again later.");
    if (!isInitial) {
      hideLoader();
    }
  }
}

// Populate recipe data into the page
function populateRecipeData(recipe) {
  // Set title
  $("h3.fdancing").text(recipe.title || "Recipe Title");
  
  // Set time information (with defaults for empty recipes)
  $("#prep").text(recipe.prep || "20 mins");
  $("#bake").text(recipe.cook || "30 mins");
  $("#total").text(recipe.total || "50 mins");
  $("#yield").text(recipe.yield || "8 servings");
  
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
          <textarea class="field">${items.join("\n")}</textarea>
        </div>
      `);
    });
  } else {
    // Add default cake-baking ingredients section
    $items.append(`
      <p class="mtitle edit">Dry</p>
      <div class="set">
        <div class="text">2 cups all-purpose flour<br>1 cup granulated sugar<br>1 tbsp baking powder</div>
        <textarea class="field">2 cups all-purpose flour\n1 cup granulated sugar\n1 tbsp baking powder</textarea>
      </div>
    `);
  }
  
  // Set instructions
  const $instructions = $("#instructions");
  $instructions.empty();
  
  const defaultSteps = [
    'Preheat oven to 350\u00B0F',
    'Mix dry ingredients in a large bowl',
    'Add wet ingredients and stir until smooth'
  ];

  if (recipe.steps && recipe.steps.length > 0) {
    recipe.steps.forEach(step => {
      $instructions.append(`<li>${step}</li>`);
    });
  } else {
    defaultSteps.forEach(step => {
      $instructions.append(`<li>${step}</li>`);
    });
  }

  // Update the instructions textarea
  const instructionsText = recipe.steps && recipe.steps.length > 0 ? recipe.steps.join("\n") : defaultSteps.join("\n");
  $instructions.siblings("textarea").val(instructionsText);
  
  // Set notes if they exist
  if (recipe.notes && recipe.notes.length > 0) {
    $("#note").show();
    $("#note .text").html(recipe.notes.join("<br>"));
    $("#note textarea").val(recipe.notes.join("\n"));
  } else {
    $("#note").hide();
  }
  
  const $credits = $("#credits");
  if (recipe.credit) {
    $credits.text(recipe.credit).removeClass("is-placeholder");
    $credits.siblings(".field").val(recipe.credit);
  } else {
    $credits.text($credits.attr("data-placeholder")).addClass("is-placeholder");
    $credits.siblings(".field").val("");
  }
  
  // Set author
  $("#author").text(recipe.author || "");
}

const AUTOSAVE_KEY = "autoSaveOn";

function isAutoSaveOn() {
  return $("#autosave").is(":checked");
}

function applySavedAutoSave() {
  $("#autosave").prop("checked", localStorage.getItem(AUTOSAVE_KEY) === "on");
}

function updateSaveButton() {
  $("#save").toggle(!isAutoSaveOn());
}

function autoSave() {
  if (!isAutoSaveOn()) return;
  saveRecipe({ auto: true });
}

function getCreditValue() {
  const $credits = $("#credits");
  if ($credits.hasClass("is-placeholder")) return "";
  const value = $credits.text().trim();
  return value === $credits.attr("data-placeholder") ? "" : value;
}

// Save recipe changes
async function saveRecipe(options = {}) {
  const isAuto = options.auto === true;
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
    author: $("#author").text().trim(),
    credit: getCreditValue()
  };
  
  // Collect ingredients by section
  recipeData.ingredients = [];
  $("#items .mtitle").each(function(index) {
    const sectionName = $(this).text().trim();
    const $set = $(this).next(".set");
    const itemsText = $set.find("textarea").val();
    const items = itemsText ? itemsText.split("\n").filter(item => item.trim() !== "") : [];
    
    recipeData.ingredients.push({
      section: sectionName,
      items: items
    });
  });
  
  // Collect instructions
  const instructionsText = $("#instructions").siblings("textarea").val();
  recipeData.steps = instructionsText ? instructionsText.split("\n").filter(step => step.trim() !== "") : [];
  
  // Collect notes
  if ($("#note").is(":visible")) {
    const notesText = $("#note textarea").val();
    recipeData.notes = notesText ? notesText.split("\n").filter(note => note.trim() !== "") : [];
  } else {
    recipeData.notes = [];
  }
  
  try {
    if (!isAuto) showLoader();
    await Storage.update(recipeId, recipeData);

    if (!isAuto) hideLoader();
    showSuccess(isAuto ? "Auto-saved" : "Recipe saved successfully!");
  } catch (error) {
    console.error("Error saving recipe:", error);
    showError("Failed to save recipe. Please try again later.");
    if (!isAuto) hideLoader();
  }
}

// Helper functions
function showLoader() {
  $("#loader").removeClass("fade-out");
}

function hideLoader() {
  $("#loader").addClass("fade-out");
}

// Apply the user's saved theme preference
function applySavedTheme() {
  const savedTheme = localStorage.getItem("preferred-theme");
  if (savedTheme) {
    document.body.className = `theme-${savedTheme}`;
  }
}

// Set up inline editing handlers
function initInlineEditing() {
  // Multi-line fields: click text to reveal its textarea, blur to re-render
  $(document)
    .on("click", ".set button, .text", function () {
      if (this.id === "credits" && $(this).hasClass("is-placeholder")) {
        $(this).removeClass("is-placeholder").siblings(".field").val("");
      }
      $(this).siblings(".field").show().focus();
      $(this).parent().children("button, .text").hide();
    })
    .on("blur", "textarea.field", function () {
      $(this).hide();
      const $text = $(this).prev(".text");
      if ($text.attr("id") === "credits" && $(this).val().trim() === "") {
        $text.text($text.attr("data-placeholder")).addClass("is-placeholder").show();
        autoSave();
        return;
      }
      const lines = $(this).val().split("\n");
      const isOL = $(this).siblings("ol").is(":hidden");
      let html = "";
      lines.forEach(function (line) {
        html += isOL ? `<li>${line}</li>` : `<p>${line}</p>`;
      });
      $text.html(html).show();
      autoSave();
    });

  // Single-line fields: click wraps content in a textarea, blur writes it back
  $("body")
    .on("click", ".edit", function () {
      if ($(this).find("textarea").length < 1) {
        $(this).wrapInner("<textarea/>").find("textarea").focus();
      }
    })
    .on("blur", ".edit textarea", function () {
      $(this).parent().text(this.value);
      autoSave();
    });
}

// Add a new ingredient section (confirm first if there are already several)
function addSection() {
  if ($("#items .mtitle").length >= 4) {
    showConfirmDialog("Are you sure you want to add another section?", appendSection);
    return;
  }
  appendSection();
}

function appendSection() {
  $("#items").append(`
    <p class="mtitle edit" style="margin-top:25px;">Seasonings</p>
    <div class="set">
      <div class="text"></div>
      <textarea class="field">1 tsp Salt</textarea>
      <button class="secondary">ingredients</button>
    </div>`);
}

// Toggle the optional note callout under the instructions
function addNote() {
  $("#note").toggle();
}

// Initialize on document ready
$(document).ready(function () {
  applySavedTheme();
  initInlineEditing();

  // Action buttons
  $("#save").on("click", function () {
    saveRecipe();
  });

  applySavedAutoSave();
  $("#autosave").on("change", function () {
    localStorage.setItem(AUTOSAVE_KEY, isAutoSaveOn() ? "on" : "off");
    updateSaveButton();
  });
  updateSaveButton();
  $("#print").on("click", function (e) {
    e.preventDefault();
    window.print();
  });

  // Ingredient section / note controls
  $("#add-section").on("click", addSection);
  $("#noteb").on("click", addNote);

  // Coordinate loading: fetch recipe data and wait for fonts in parallel
  const recipePromise = fetchRecipe(true);
  const fontsPromise = document.fonts ? document.fonts.ready : Promise.resolve();

  Promise.all([recipePromise, fontsPromise]).then(function () {
    hideLoader();
  });
});
