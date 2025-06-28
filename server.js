const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // If you're calling external APIs

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

app.get('/properties', async (req, res) => {
  try {
    // Example: Replace this with your real OwnerRez API logic
    const response = await fetch('https://api.ownerrez.com/v1/properties', {
      headers: {
        'Authorization': `Bearer ${process.env.OWNERREZ_API_KEY}`
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
