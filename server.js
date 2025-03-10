require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = 3000;
const uri = process.env.MONGO_URI_RECIPES;

app.use(express.json());
app.use(express.static("public"));

const client = new MongoClient(uri);

app.get("/api/recipes", async (req, res) => {
  try {
    await client.connect();
    const database = client.db("myrecipes");
    const collection = database.collection("recipes");
    const recipes = await collection.find({}).toArray();
    res.json(recipes);
  } catch (error) {
    res.status(500).send("Error fetching recipes");
  } finally {
    await client.close();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
