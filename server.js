const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Use environment variables for credentials
const username = process.env.USERNAME;
const password = process.env.PASSWORD;


if (!username || !password) {
  console.error('USERNAME and PASSWORD must be set as environment variables.');
  process.exit(1);
}

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// 🔐 Allow all origins by default (you can customize later)
app.use(cors());

// Optional: Enable JSON parsing if you expect to handle POST bodies
app.use(express.json());

app.get('/properties', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.ownerrez.com/v2/properties',
      {
        headers: { 'Content-Type': 'application/json' },
        auth: { username, password },
      },
    );
    res.json(response.data);
  } catch (error) {
    console.error('OwnerRez API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});