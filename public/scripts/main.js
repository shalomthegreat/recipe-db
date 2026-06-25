// data setup
var dataSet = [];
var currentEditRecipe = null;
var columnsF = [
  { title: "Author", data: "author" },
  { title: "Category", data: "category" },
  { title: "Title", data: "title" },
  { title: "Tags", data: "tags" },
  { title: "Actions" }
];
var columnRenderF = [
  {
    width: "100px",
    targets: 0
  },
  {
    width: "70px",
    targets: 1
  },
  {
    render: function (data, type, full, meta) {
      return `<a class="recipe-link" href="/recipe.html?id=${full._id}">${full.title || ""}</a>`;
    },
    width: "25%",
    targets: 2
  },
  {
    render: function (data, type, full, meta) {
      const recipeId = full._id || "";
      return `
        <div class="action-buttons">
          <button type="button" class="edit-btn action-btn icon" data-recipe-id="${recipeId}" title="Edit Recipe">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
          <button type="button" class="delete-btn action-btn icon" data-recipe-id="${recipeId}" title="Delete Recipe">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
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

  if ($(".dataTables_empty").length == 1 && !Storage.hasChosenMode()) {
    goToStep(1);
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
  currentEditRecipe = null;
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
async function fetchRecipes(silent = false) {
  try {
    if (!silent) showLoader();
    const recipes = await Storage.getAll();
    dataSet = recipes;
    init();
    if (!silent) hideLoader();
  } catch (error) {
    console.error("Error fetching recipes:", error);
    showError("Failed to load recipes. Please try again later.");
    if (!silent) hideLoader();
  }
}

async function fetchRecipeById(id) {
  try {
    const recipe = await Storage.getById(id);
    return recipe;
  } catch (error) {
    console.error(`Error fetching recipe ${id}:`, error);
    showError("Failed to load recipe details. Please try again later.");
    return null;
  }
}

async function createRecipe(recipeData) {
  try {
    const newRecipe = await Storage.create(recipeData);
    showSuccess("Recipe created successfully!");
    return newRecipe;
  } catch (error) {
    console.error("Error creating recipe:", error);
    showError(error.message || "Failed to create recipe. Please check your data and try again.");
    return null;
  }
}

async function updateRecipe(id, recipeData) {
  try {
    const updatedRecipe = await Storage.update(id, recipeData);
    showSuccess("Recipe updated successfully!");
    return updatedRecipe;
  } catch (error) {
    console.error(`Error updating recipe ${id}:`, error);
    showError("Failed to update recipe. Please check your data and try again.");
    return null;
  }
}

async function deleteRecipe(id) {
  try {
    await Storage.remove(id);
    showSuccess("Recipe deleted successfully!");
    return true;
  } catch (error) {
    console.error(`Error deleting recipe ${id}:`, error);
    showError("Failed to delete recipe. Please try again later.");
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
      // Cache the full recipe object so we don't need to re-fetch on save
      currentEditRecipe = recipe;

      // Populate the form with recipe data - simplified for our basic form
      $("#title").val(recipe.title || "");
      $("#category").val(recipe.category || "");
      $("#comment").val(recipe.tags || "");
      $("#author").val(recipe.author || "");
      
      // Store the recipe ID in a hidden field
      $("#recipe-id").val(recipe._id);
      
      // Update form title and show edit button
      $("#new-entry-title h2").text("Edit Recipe");
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
    
    showConfirmDialog("Are you sure you want to delete this recipe?", async function () {
      const deleted = await deleteRecipe(recipeId);
      if (deleted) {
        await fetchRecipes(true); // Refresh the recipe list silently
      }
    });
  });
}

$(document).ready(async function () {
  // Add a loading indicator if it doesn't exist
  if ($("#loader").length === 0) {
    $("body").append(
      '<div id="loader" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.8);z-index:9999;text-align:center;padding-top:20%;">Loading...</div>'
    );
  }

  // Click functions
  $("#newb").click(function () {
    clearForm();
    currentEditRecipe = null;
    $("#new-entry-title h2").text("New Recipe");
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

  $("#onboard-next").on("click", function () { goToStep(onboardStep + 1); });
  $("#onboard-back").on("click", function () { goToStep(onboardStep - 1); });
  $("#onboard-finish").on("click", finishOnboarding);
  $("#onboard-cancel").on("click", function () { $("#welcome").fadeOut(); });

  // Create new recipe
  $("#addb").click(async function () {
    if (!validateForm()) {
      return;
    }

    const recipeData = createRecipeObject();
    const newRecipe = await createRecipe(recipeData);
    if (newRecipe) {
      $("#new").fadeOut(200, async function() {
          await fetchRecipes(true);
      });
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

    // Use the cached recipe from when the edit modal was opened
    const existingRecipe = currentEditRecipe;
    if (!existingRecipe) {
      showError("Recipe data is missing. Please close and reopen the edit dialog.");
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

    // Remove _id before sending - MongoDB rejects updates to the immutable _id field
    delete recipeData._id;

    const updatedRecipe = await updateRecipe(recipeId, recipeData);
    if (updatedRecipe) {
      $("#new").fadeOut(200, async function() {
        await fetchRecipes(true);
      });
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

  $("#exportb").on("click", exportRecipes);
  $("#loadb").on("click", function () { $("#loadfile").click(); });
  $("#loadfile").on("change", loadRecipesFromFile);

  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && $("#welcome").is(":visible") && Storage.hasChosenMode()) {
      $("#welcome").fadeOut();
    }
  });

  $("#storageb").on("click", async function () {
    await renderStorageOptions();
    const $local = $("input[name='storageMode'][value='" + Storage.getMode() + "']");
    if ($local.length) $local.prop("checked", true);
    goToStep(2);
    $("#welcome").css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);
  });

  await renderStorageOptions();
  if (!Storage.hasChosenMode()) {
    goToStep(1);
    $("#welcome").css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);
  }

  // Fetch initial data
  fetchRecipes();
});

let onboardStep = 1;
const ONBOARD_LAST = 3;

function goToStep(step) {
  if (step < 1 || step > ONBOARD_LAST) return;
  onboardStep = step;
  $(".onboard-step").each(function () {
    this.hidden = Number($(this).data("step")) !== step;
  });
  if (step === ONBOARD_LAST) renderTransferStep();
  // Cancel is only offered once setup has been completed before (i.e. opened via
  // the Storage button); a first-time user must make a choice.
  $("#onboard-cancel").prop("hidden", !Storage.hasChosenMode());
  $("#onboard-back").prop("hidden", step === 1);
  $("#onboard-next").prop("hidden", step === ONBOARD_LAST);
  $("#onboard-finish").prop("hidden", step !== ONBOARD_LAST);
}

async function renderStorageOptions() {
  const server = await Storage.probeServer();
  const localN = await Storage.localCount();
  const $opts = $("#storage-options");
  $opts.data("serverCount", server.available ? server.count : 0);
  $opts.data("localCount", localN);

  let html =
    '<label><input type="radio" name="storageMode" value="local" checked />' +
    '<span><strong>This device</strong> — saved privately in your browser (IndexedDB)</span></label>';

  if (server.available) {
    html +=
      '<label><input type="radio" name="storageMode" value="remote" />' +
      '<span><strong>Local MongoDB</strong> — saved to a MongoDB database run by this app' +
      (server.count > 0 ? ` (${server.count} recipe${server.count === 1 ? "" : "s"} found)` : "") +
      "</span></label>";
  } else {
    html +=
      '<label class="storage-disabled"><input type="radio" name="storageMode" value="remote" disabled />' +
      '<span><strong>Local MongoDB</strong> — not detected. ' +
      '<a href="https://github.com/shalomthegreat/recipe-db#-connecting-mongodb-simple-setup-guide" target="_blank" rel="noopener">How to set it up</a></span></label>';
  }

  $opts.html(html);
}

function renderTransferStep() {
  const chosen = $("input[name='storageMode']:checked").val() || "local";
  const mongoN = Number($("#storage-options").data("serverCount")) || 0;
  const browserN = Number($("#storage-options").data("localCount")) || 0;
  const $t = $("#onboard-transfer");

  let html = "";
  if (chosen === "local" && mongoN > 0) {
    html =
      `<p class="subtitle">You're keeping recipes in your browser.</p>` +
      '<label class="onboard-transfer-opt"><input type="radio" name="transfer" value="none" checked />' +
      "<span>Keep only what's already in your browser</span></label>" +
      '<label class="onboard-transfer-opt"><input type="radio" name="transfer" value="copy" />' +
      `<span>Copy the ${mongoN} recipe${mongoN === 1 ? "" : "s"} from the local MongoDB into your browser</span></label>` +
      (browserN > 0
        ? '<label class="onboard-transfer-opt"><input type="radio" name="transfer" value="sync" />' +
          `<span>Sync — combine both so the ${mongoN} in MongoDB and ${browserN} in your browser match</span></label>`
        : "");
  } else if (chosen === "remote" && browserN > 0) {
    html =
      `<p class="subtitle">You're keeping recipes in the local MongoDB.</p>` +
      '<label class="onboard-transfer-opt"><input type="radio" name="transfer" value="none" checked />' +
      "<span>Keep only what's already in the local MongoDB</span></label>" +
      '<label class="onboard-transfer-opt"><input type="radio" name="transfer" value="copy" />' +
      `<span>Copy the ${browserN} recipe${browserN === 1 ? "" : "s"} from your browser into the local MongoDB</span></label>` +
      (mongoN > 0
        ? '<label class="onboard-transfer-opt"><input type="radio" name="transfer" value="sync" />' +
          `<span>Sync — combine both so the ${browserN} in your browser and ${mongoN} in MongoDB match</span></label>`
        : "");
  } else {
    html = `<p class="subtitle">Nothing to transfer — you're all set. Click "Got it!" to start.</p>`;
  }
  $t.html(html);
}

async function finishOnboarding() {
  const chosen = $("input[name='storageMode']:checked").val() || "local";
  const transfer = $("input[name='transfer']:checked").val() || "none";
  Storage.setMode(chosen === "remote" ? "remote" : "local");

  if (transfer === "sync") {
    const result = await Storage.mergeBothWays();
    if (result.serverFailed > 0) {
      showSuccess(`Synced ${result.total} recipe${result.total === 1 ? "" : "s"} to your browser; ${result.serverFailed} could not be saved to the local MongoDB.`);
    } else {
      showSuccess(`Synced — ${result.total} recipe${result.total === 1 ? "" : "s"} now match in both your browser and the local MongoDB.`);
    }
  } else if (transfer === "copy" && chosen === "local") {
    const copied = await Storage.migrateRemoteToLocal();
    showSuccess(`Copied ${copied} recipe${copied === 1 ? "" : "s"} from the local MongoDB to your browser.`);
  } else if (transfer === "copy" && chosen === "remote") {
    const res = await Storage.migrateLocalToRemote();
    if (res.failed > 0) {
      showSuccess(`Copied ${res.copied} recipe${res.copied === 1 ? "" : "s"} to the local MongoDB; ${res.failed} could not be saved.`);
    } else {
      showSuccess(`Copied ${res.copied} recipe${res.copied === 1 ? "" : "s"} from your browser to the local MongoDB.`);
    }
  }

  $("#welcome").fadeOut();
  fetchRecipes(true);
}

async function exportRecipes() {
  try {
    const recipes = (await Storage.exportAll()).map(function (r) {
      const clean = Object.assign({}, r);
      delete clean._id;
      return clean;
    });
    const json = JSON.stringify(recipes, null, 2);
    const file = new File([json], "recipes.json", { type: "application/json" });

    // On phones, use the native share sheet (AirDrop / Messages / Save to Files)
    // when the browser can share a file; otherwise fall back to a download.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My Recipes" });
        return;
      } catch (shareErr) {
        if (shareErr && shareErr.name === "AbortError") return; // user dismissed the sheet
        // otherwise fall through to the download path
      }
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recipes.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess(`Exported ${recipes.length} recipe${recipes.length === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error("Error exporting recipes:", error);
    showError("Failed to export recipes.");
  }
}

async function loadRecipesFromFile(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const recipes = Array.isArray(parsed) ? parsed : [parsed];
    const result = await Storage.importRecipes(recipes, askImportConflict);
    const parts = [];
    if (result.added) parts.push(`${result.added} added`);
    if (result.updated) parts.push(`${result.updated} updated`);
    if (result.skipped) parts.push(`${result.skipped} skipped`);
    if (result.invalid) parts.push(`${result.invalid} not valid recipes`);
    if (result.failed) parts.push(`${result.failed} could not be saved`);
    showSuccess(`Import complete — ${parts.join(", ") || "nothing to import"}.`);
    fetchRecipes(true);
  } catch (error) {
    console.error("Error loading recipes:", error);
    showError("Couldn't load that file — make sure it's a recipes JSON export.");
  }
}

function askImportConflict(incoming, existing) {
  return new Promise(function (resolve) {
    const modal = document.getElementById("import-conflict");
    modal.querySelector(".conflict-message").textContent =
      `"${incoming.title || "Untitled"}" already exists with different details. What should we do?`;
    document.getElementById("conflict-applyall").checked = false;
    $(modal).css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);

    function choose(action) {
      const applyAll = document.getElementById("conflict-applyall").checked;
      cleanup();
      $(modal).fadeOut();
      resolve({ action: action, applyAll: applyAll });
    }
    function onUpdate() { choose("update"); }
    function onAdd() { choose("add"); }
    function onSkip() { choose("skip"); }
    function cleanup() {
      document.getElementById("conflict-update").removeEventListener("click", onUpdate);
      document.getElementById("conflict-add").removeEventListener("click", onAdd);
      document.getElementById("conflict-skip").removeEventListener("click", onSkip);
    }
    document.getElementById("conflict-update").addEventListener("click", onUpdate);
    document.getElementById("conflict-add").addEventListener("click", onAdd);
    document.getElementById("conflict-skip").addEventListener("click", onSkip);
  });
}

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
