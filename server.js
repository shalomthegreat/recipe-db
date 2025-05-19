require("dotenv").config();
const express = require("express");
const { connectDB, closeDB } = require("./config/db");
const recipeRoutes = require("./routes/recipeRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// API Routes
app.use("/api/recipes", recipeRoutes);

// Connect to database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down server...");
      await closeDB();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Shutting down server...");
      await closeDB();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
