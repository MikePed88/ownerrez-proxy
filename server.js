const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Use environment variables for credentials
const username = process.env.USERNAME;
const password = process.env.PASSWORD;

if (!username || !password) {
  console.error('USERNAME and PASSWORD must be set as environment variables.');
  process.exit(1);
}

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
