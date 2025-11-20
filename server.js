require('dotenv').config(); // Load environment variables (like the Mongo URI) to keep them secure
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = 3000;

// --- MIDDLEWARE ---

// Enable CORS so the front-end (on a different port/domain) can communicate with this server
app.use(cors());

// Middleware to parse JSON bodies in incoming requests (needed for POST/PUT)
app.use(express.json());

// [Coursework Requirement] Logger Middleware
// Logs the HTTP method and URL for every request to help with debugging
app.use((req, res, next) => {
    console.log(`[Logger] Incoming Request: ${req.method} ${req.url}`);
    next(); // Passes control to the next middleware or route handler
});

// [Coursework Requirement] Static File Middleware
// Configures the server to return files from the 'images' folder (used for the background image)
app.use('/images', express.static('images'));


// --- MONGODB CONNECTION ---

// Get the connection string from the .env file
const uri = process.env.MONGO_URI;

// Create the MongoDB client with the necessary API version settings
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db; // This variable will hold our database connection

async function run() {
  try {
    // Attempt to connect to the Atlas cluster
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    
    // Select the specific database for this coursework
    db = client.db('coursework');

  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}
run().catch(console.dir);


// --- API ROUTES ---

// GET Route: Retrieve all lessons
// Used by the front-end to display the main list of activities
app.get('/lessons', async (req, res) => {
  try {
    const lessons = await db.collection('lessons').find({}).toArray();
    res.json(lessons);
  } catch (err) {
    console.error("Error fetching lessons:", err);
    res.status(500).send("Error fetching lessons from database.");
  }
});

// POST Route: Save a new order
// Receives order details (name, phone, lesson IDs) and saves them to the 'orders' collection
app.post('/orders', async (req, res) => {
  try {
    const order = req.body;
    const result = await db.collection('orders').insertOne(order);
    // Return the ID of the new order document
    res.status(201).json({ message: "Order saved successfully", insertedId: result.insertedId });
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).send("Error saving order to database.");
  }
});

// PUT Route: Update lesson spaces
// Updates the 'spaces' field for a specific lesson (identified by ID) after a purchase
app.put('/lessons/:id', async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id); // Extract ID from the URL parameter
    const newSpaces = req.body.spaces;        // Get the new space count from the request body

    // Basic validation to ensure we are sending a number
    if (typeof newSpaces !== 'number') {
        return res.status(400).send("Invalid 'spaces' value provided.");
    }

    // Update the specific document in MongoDB
    const result = await db.collection('lessons').updateOne(
      { _id: lessonId },
      { $set: { spaces: newSpaces } }
    );

    if (result.matchedCount > 0) {
      res.json({ message: "Lesson spaces updated successfully" });
    } else {
      res.status(404).send("Lesson not found.");
    }
  } catch (err) {
    console.error("Error updating lesson spaces:", err);
    res.status(500).send("Error updating lesson spaces.");
  }
});

// GET Route: Search functionality
// Performs a text search on 'subject' or 'location' using regex
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q; // Get the search term from the URL query string

    if (!query) {
      return res.status(400).send("Search query is missing.");
    }

    // Use MongoDB Regex for case-insensitive ('i') pattern matching
    const results = await db.collection('lessons').find({
      $or: [
        { subject: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } }
      ]
    }).toArray();

    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Simple root route to verify the server is running
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});