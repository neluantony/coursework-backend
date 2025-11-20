require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db; // Variable to hold the database connection

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    // Set the db variable to your database
    db = client.db('coursework');

  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}
run().catch(console.dir);


// -- API ROUTES --

// GET route to fetch all lessons
app.get('/lessons', async (req, res) => {
  try {
    const lessons = await db.collection('lessons').find({}).toArray();
    res.json(lessons);
  } catch (err) {
    console.error("Error fetching lessons:", err);
    res.status(500).send("Error fetching lessons from database.");
  }
});

// POST route to save a new order
app.post('/orders', async (req, res) => {
  try {
    const order = req.body; // The order data sent from the front-end
    const result = await db.collection('orders').insertOne(order);
    res.status(201).json({ message: "Order saved successfully", insertedId: result.insertedId });
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).send("Error saving order to database.");
  }
});

// PUT route to update the spaces in a lesson
app.put('/lessons/:id', async (req, res) => {
  try {
    const lessonId = parseInt(req.params.id); // Get the ID from the URL
    const newSpaces = req.body.spaces;       // Get the new number of spaces from the request

    if (typeof newSpaces !== 'number') {
        return res.status(400).send("Invalid 'spaces' value provided.");
    }

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

// GET route for search functionality
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q; // Get the query parameter (e.g. ?q=math)

    if (!query) {
      return res.status(400).send("Search query is missing.");
    }

    // MongoDB query using Regex for pattern matching (case-insensitive 'i')
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

// Test route
app.get('/', (req, res) => {
  res.send('Hello from the Express server!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});