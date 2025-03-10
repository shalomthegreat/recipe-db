// data setup
var dataSet = [];
var columnsF = [
  { title: "Title" },
  { title: "Category", data: "category" },
  { title: "Tags", data: "tags" },
  { title: "Author", data: "author" },
  { title: "Edit" },
];
var columnRenderF = [
  {
    render: function (data, type, full, meta) {
      return `<a href="/recipe.html?id=${full._id}">${full.title}</a>`;
    },
    width: "25%",
    targets: 0,
  },
  {
    width: "50px",
    targets: 1,
  },
  {
    width: "100px",
    targets: 3,
  },
  {
    render: function (data, type, full, meta) {
      return '<a class="edit icon" data="' + meta.row + '"">&#128221;</a>';
    },
    width: "30px",
    targets: 4,
  },
];

// DataTables functions
function init() {
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
          "<p style='margin:10px'>This is the beginning of your log.</p><p id='first'>Add your first entry to get started!</p>",
      },
      order: [[0, "desc"]],
      pageLength: 30,
      lengthMenu: [
        [10, 30, 50, -1],
        [10, 30, 50, "All"],
      ],
      data: dataSet,
      columns: columnsF,
      columnDefs: columnRenderF,
    });
  } catch (error) {
    console.error("An error occurred during DataTable initialization:", error);
  }

  if ($(".dataTables_empty").length == 1)
    $("#welcome").css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);
}
function formRow() {
  let row = [];
  function checkVal(v) {
    if (v.length < 1) v = "--";
    return v;
  }
  row.push($("#title").val(), $("#category").val(), checkVal($("#comment").val()));
  return row;
}
function save(d) {
  // if (Array.isArray(dataSet)) dataSet.push(d);
  // $("#mytable").DataTable().destroy();
  dataSet = d;
  console.log("DataSet:", dataSet);
  init();
}
function clear() {
  $("#title").val("");
  $("#category").val("");
  $("#comment").val("");
}

// fetch data
async function getData() {
  try {
    const response = await fetch("/api/recipes"); // Fetch data from the new API endpoint
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const result = await response.json(); // Parse the JSON response
    save(result); // Save the fetched data
  } catch (error) {
    console.error("Error fetching recipes:", error);
  }
}

$(document).ready(function () {
  //click functions
  $("#newb").click(function () {
    clear();
    $("#new-entry-title, #addb").show();
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
  $("#addb").click(function () {
    d = formRow();
    // TODO: upload d to api
    // TODO: update dataSet with d
    $(".hideme").fadeOut();
  });
  $("#mytable tbody").on("click", ".edit", function () {
    rowNum = parseInt($(this).attr("data"));
    row = dataSet[rowNum];
    $("#title").val(row[0]);
    $("#category").val(row[1]);
    $("#comment").val(row[2]);
    $("#new-entry-title, #addb").hide();
    $("#editb").show();
    $("#new").css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);
  });
  $("#editb").click(function () {
    row[0] = $("#title").val();
    row[1] = $("#category").val();
    row[2] = $("#comment").val();
    // TODO: upload edited row to api
    // TODO: update dataSet with edited row
    $(".hideme").fadeOut();
  });

  // fetch data
  getData();
});
