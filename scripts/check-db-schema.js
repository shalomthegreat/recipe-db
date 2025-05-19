require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkDatabaseSchema() {
  const uri = process.env.MONGO_URI_RECIPES;
  
  if (!uri) {
    console.error('Error: MONGO_URI_RECIPES environment variable is not set');
    process.exit(1);
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db('myrecipes');
    const collection = database.collection('recipes');
    
    // Check if collection exists and has documents
    const count = await collection.countDocuments();
    console.log(`Found ${count} recipes in the database`);
    
    if (count > 0) {
      // Get a sample document to examine the schema
      const sampleRecipe = await collection.findOne({});
      console.log('\nSample recipe document structure:');
      console.log(JSON.stringify(sampleRecipe, null, 2));
      
      // List all fields present in the collection
      console.log('\nFields present in the collection:');
      const fieldNames = Object.keys(sampleRecipe).filter(key => key !== '_id');
      console.log(fieldNames);
      
      // Get a few more samples to check for consistency
      if (count > 1) {
        console.log('\nChecking schema consistency across multiple documents...');
        const recipes = await collection.find({}).limit(5).toArray();
        
        // Check if all documents have the same fields
        const allFields = new Set();
        const fieldFrequency = {};
        
        recipes.forEach(recipe => {
          Object.keys(recipe).forEach(field => {
            if (field !== '_id') {
              allFields.add(field);
              fieldFrequency[field] = (fieldFrequency[field] || 0) + 1;
            }
          });
        });
        
        console.log('\nField frequency across sample documents:');
        for (const [field, frequency] of Object.entries(fieldFrequency)) {
          const percentage = (frequency / recipes.length) * 100;
          console.log(`${field}: ${frequency}/${recipes.length} documents (${percentage.toFixed(2)}%)`);
        }
      }
    } else {
      console.log('No recipes found in the database. The collection might be empty.');
    }
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

checkDatabaseSchema();
