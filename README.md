# 📑 Family Recipe Box

A beautiful, light-weight, self-hosted web application for organizing, sharing, and preserving **your family's treasured recipes**. Built with a fast, modern `express.js` API and connected to `MongoDB`, this application combines developer-friendly simplicity with an elegant, responsive frontend interface.

<img width="2252" height="1330" alt="main-page-example" src="https://github.com/user-attachments/assets/88d04dc5-b86b-42ce-b77c-40743ea40779" />
<img width="2248" height="1486" alt="recipe-page-example" src="https://github.com/user-attachments/assets/f0ed6f13-ae39-47ea-9d02-3d2578a5c788" />


## ✨ Features

Whether you are looking to retire that grease-stained paper binder or build a private family portal that can be accessed anywhere, the **Family Recipe Box** is designed for the modern era:

- **🏠 Self-Hosted:** Run it on your own server or local machine for complete privacy and access-control.
- **💾 Flexible Storage:** Keep recipes in your browser (IndexedDB, no server needed) or in a local MongoDB — choose on first run, switch anytime, and copy or sync between the two. Export and import your collection as JSON to move it between devices.
- **✍️ Intuitive Natural Language Schema:** Traditional databases force strict numeric units, causing errors for entries like "a pinch of salt" or "3 medium carrots". Our flexible string-based schema preserves original recipe notes, hand-written directions, and cultural measurements.
- **🎨 Dynamic Theme Customization:** Switch between multiple hand-crafted themes (**Orange Warmth**, **Purple Amethyst**, and **Ocean Blue**) to suit your kitchen's aesthetic.
- **⚡ Supercharged Search and Filters:** Powered by jQuery DataTables, you can search and filter through hundreds of recipes instantly by title, author, category, or tags.
- **📱 Fully Responsive Design:** Optimized for mobile phones, tablets, and desktops alike, so you can keep it open on your phone or tablet on the kitchen counter while cooking
- **🖨️ Printer Friendly by Design:** Print beautiful copies of your recipes, for easy reference, quick sharing, and even for updating that one notebook that no one else can read expect Mom.

  <img width="200" height="auto" alt="print-page-example" src="https://github.com/user-attachments/assets/cea8b26e-76b1-4e65-8d7f-545d21c5ba57" /><br />
  Example: Formatted for Print

## 🛠️ Project Structure

```
recipe-db/
├── config/               # Database configuration & diagnostics
│   └── db.js             
├── controllers/          # Business logic for API endpoints
│   └── recipeController.js
├── middleware/           # Express middleware
├── models/               # Data access schemas (MongoDB)
│   └── recipeModel.js
├── routes/               # API endpoint definitions
│   └── recipeRoutes.js
├── validation/           # Data validation schemas (Joi/Custom)
│   └── recipeValidation.js
├── public/               # Static frontend files (HTML/CSS/JS)
│   ├── css/
│   │   └── modern.css    # Responsive theme styles
│   ├── scripts/
│   │   ├── main.js       # Client interaction layer
│   │   └── notifications.js
│   └── index.html        # Main dashboard
├── scripts/              # Developer helper utilities
│   └── check-db-schema.js
├── .env                  # Local environment variables
├── package.json
└── server.js             # Main server entrypoint
```

## 🚀 Installation & Local Development

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v16+) and [npm](https://www.npmjs.com/) installed.

### 2. Install Dependencies
```bash
# Clone the repository, navigate in, and install dependencies
npm ci
```

### 3. Setup Environment Variables
Create a `.env` file in the root of the project:
```bash
MONGO_URI_RECIPES=your_mongodb_connection_string_here
# Optional: Specify a custom port (defaults to 3000 if not set)
# PORT=3000
```

### 4. Running the Application
```bash
# Development mode with nodemon auto-reloading
npm run dev

# Production start
npm start
```
The application will run locally at **http://localhost:3000**.

### 5. Developer Utilities
We include a helper utility to check your database connection status and inspect the document schemas:
```bash
# Verify MongoDB schema structure and count existing recipes
npm run check-schema
```

## 🔌 Connecting MongoDB (Simple Setup Guide)

Getting your database up and running takes less than 5 minutes. You can choose a cloud-hosted free instance or run it locally on your computer.

### Option A: MongoDB Atlas (Recommended Cloud Setup - Free Forever)
1. **Create an Account:** Sign up for a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Deploy a Free Cluster:** Select **Create Database**, then choose the **M0 Free Tier** cluster.
3. **Configure Network Access:** 
   - Go to **Security > Network Access** in the left sidebar.
   - Click **Add IP Address**.
   - For simple testing and home hosting, select **Allow Access from Anywhere** (`0.0.0.0/0`) or input your own [public IP address](https://ipchicken.com/).
4. **Create a Database User:**
   - Go to **Security > Database Access**.
   - Create a user with a username and password (e.g., `recipeuser` / `securepassword123`). This is how your host will authenticate to the database.
5. **Get Your Connection String:**
   - Go to the **Deployment > Database** tab and click **Connect** next to your cluster.
   - Select **Drivers** (Node.js).
   - Copy the provided connection string. It will look something like this:
     `mongodb+srv://recipeuser:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
6. **Set up `.env`:**
   - Replace `<password>` in your copied string with your actual database user password.
   - Define your connection variable in `.env`:
     ```env
     MONGO_URI_RECIPES="mongodb+srv://recipeuser:securepassword123@cluster0..."
     ```

### Option B: Local MongoDB (Offline)
If you prefer keeping your family recipes completely offline on your local machine,
you can run MongoDB natively or in Docker — either works. Docker is **not** required.

**Native install (no Docker):**
```bash
# macOS (Homebrew):
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Linux / Windows: follow the official install guide:
# https://www.mongodb.com/docs/manual/administration/install-community/
```

**Or, using Docker:**
```bash
# This command starts a MongoDB container:
# -d: Runs in detached mode (background)
# -p 27017:27017: Maps host port 27017 to container port 27017
# --name local-recipe-mongo: Assigns a name to the container
# mongo:latest: Uses the latest official MongoDB image
docker run -d -p 27017:27017 --name local-recipe-mongo mongo:latest
```

**Set your `.env` connection string:**
```env
MONGO_URI_RECIPES="mongodb://localhost:27017/familyrecipes"
```

> **Note:** The database name (`familyrecipes`) will be created automatically when the first recipe is inserted. No additional setup is required for local development.

**Useful Docker Commands:**
```bash
# Stop the MongoDB container
docker stop local-recipe-mongo

# Start it again later
docker start local-recipe-mongo

# View container logs
docker logs local-recipe-mongo
```

## 📡 API Reference

### Recipe Resource Endpoints

| Method | Endpoint         | Description                        |
| :----- | :--------------- | :--------------------------------- |
| `GET`    | `/api/recipes`     | Retrieve all recipes (paginated)   |
| `GET`    | `/api/recipes/:id` | Retrieve a single recipe by its ID |
| `POST`   | `/api/recipes`     | Create a new recipe                |
| `PUT`    | `/api/recipes/:id` | Update an existing recipe (full)   |
| `PATCH`  | `/api/recipes/:id` | Partially update a recipe's fields |
| `DELETE` | `/api/recipes/:id` | Delete a recipe                    |

### Query Parameters for `GET /api/recipes`
- `category` *(string)*: Filter recipes (e.g., `category=dessert` or `category=entree`).
- `tag` *(string)*: Filter by associated tags (e.g., `tag=pasta`).
- `page` *(number)*: The page offset to return (default: `1`).
- `limit` *(number)*: Number of items per page (default: `20`).

## 📝 Recipe Schema Specification

Our recipe document uses the following structure:

```json
{
  "title": "Grandma's Chocolate Chip Cookies", // Required (String)
  "category": "dessert",                        // Required (String)
  "tags": "cookies, chocolate, family",          // Optional (Comma-separated string)
  "author": "Grandma Sandy",                     // Optional (String)
  
  "prep": "15 mins",                            // Optional (String-based duration)
  "cook": "10 mins",                            // Optional (String-based duration)
  "total": "25 mins",                           // Optional (String-based duration)
  "yield": "2 dozen",                           // Optional (String-based description)
  
  "steps": [                                    // Required (Array of Strings)
    "Preheat oven to 375 degrees.",
    "Cream butter, brown sugar, and white sugar together."
  ],
  "notes": [                                    // Optional (Array of Strings)
    "Grandma recommends using real vanilla extract for the best flavor."
  ],
  "ingredients": [                              // Optional (Array of Objects)
    {
      "section": "Cookie Dough",
      "items": [
        "2 1/4 cups all-purpose flour",
        "1 tsp baking soda",
        "1 cup softened butter",
        "3/4 cup semi-sweet chocolate chips"
      ]
    }
  ],
  "credit": "Original Family Recipe",            // Optional (String)

  "uid": "5f3b9c2a-...",                         // Automated (String) - stable cross-store id used to de-duplicate during sync/import
  "createdAt": "2026-06-23T21:51:00.000Z",       // Automated (ISO Date String)
  "updatedAt": "2026-06-23T21:51:00.000Z"        // Automated (ISO Date String)
}
```

> **Note on `uid`:** When recipes are stored in the browser (IndexedDB mode) or transferred between the browser and MongoDB, each recipe carries a stable `uid` so the same recipe is recognized across stores and devices. It is assigned automatically and is preserved by export/import.

## 📜 Open Source, Licensing & Attribution

Family Recipe Box is open-source software built for families and fellow foodies.

### License
This project is licensed under the **MIT License**. You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of this software, subject to including the original copyright notice and permission notice in any substantial portions of the software.

### Attribution & Contributions
- **Attribution:** If you feature this project in a public repository, video, blog post, or use it as a base for your own application, please link back to this repository and credit the original contributors.
- **Contributions:** Contributions are highly encouraged! Whether you want to add user authentication, meal planning calendars, or shopping list exports, feel free to open a Pull Request.

