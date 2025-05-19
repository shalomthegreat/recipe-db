# Family Recipe Database

A recipe database application built with MongoDB and Express. This application provides a RESTful API for managing recipes with full CRUD operations.

## Project Structure

```
recipe-db/
├── config/               # Configuration files
│   └── db.js             # Database connection
├── controllers/          # Route controllers
│   └── recipeController.js
├── middleware/           # Express middleware
├── models/               # Data models
│   └── Recipe.js
├── routes/               # API routes
│   └── recipeRoutes.js
├── validation/           # Data validation schemas
│   └── recipeValidation.js
├── public/               # Static files (frontend)
├── .env                  # Environment variables
├── package.json
└── server.js             # Entry point
```

## Installation

```bash
# Install dependencies
npm ci

# Create .env file with your MongoDB connection string
echo "MONGO_URI_RECIPES={Your MongoDB connection string}" > .env
```

## Running the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on http://localhost:3000

## API Endpoints

### Recipes

| Method | Endpoint         | Description         |
| ------ | ---------------- | ------------------- |
| GET    | /api/recipes     | Get all recipes     |
| GET    | /api/recipes/:id | Get recipe by ID    |
| POST   | /api/recipes     | Create a new recipe |
| PUT    | /api/recipes/:id | Update a recipe     |
| DELETE | /api/recipes/:id | Delete a recipe     |

### Query Parameters

The GET /api/recipes endpoint supports the following query parameters:

- `category`: Filter recipes by category
- `tag`: Filter recipes by tag
- `page`: Page number for pagination (default: 1)
- `limit`: Number of recipes per page (default: 20)

## Recipe Schema

```javascript
{
  title: String,         // Required - Recipe title
  category: String,      // Required - Recipe category (e.g., "entree")
  tags: String,          // Optional - Comma-separated tags (e.g., "pasta, cream")
  author: String,        // Optional - Author of the recipe
  
  // Time information
  prep: String,          // Optional - Prep time as string (e.g., "20mins")
  cook: String,          // Optional - Cook time as string (e.g., "40mins")
  total: String,         // Optional - Total time as string (e.g., "1hr")
  yield: String,         // Optional - Yield as string (e.g., "8 servings")
  
  // Recipe content
  steps: Array,          // Required - Array of instruction steps
  notes: Array,          // Optional - Array of notes
  ingredients: Array,    // Optional - Complex structure with sections and items
                         // Format: [{ section: "veggies", items: ["peppers", "basil"] }]
  credit: String,        // Optional - Source attribution
  
  // Metadata
  createdAt: Date,       // Auto-generated
  updatedAt: Date        // Auto-generated
}
```
