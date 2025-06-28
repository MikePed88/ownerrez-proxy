const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const username = process.env.USERNAME;
const password = process.env.PASSWORD;

if (!username || !password) {
  console.error('USERNAME and PASSWORD must be set as environment variables.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// In-memory cache
let cachedProperties = null;
let lastFetchTime = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Background fetch function
const fetchAndCacheProperties = async () => {
  try {
    const response = await axios.get('https://api.ownerrez.com/v2/properties', {
      auth: { username, password }
    });
    cachedProperties = response.data;
    lastFetchTime = Date.now();
    console.log('🔄 Properties cache refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh properties cache:', error.response?.data || error.message);
  }
};

// Fetch once at startup
fetchAndCacheProperties();
// Refresh every 5 minutes
setInterval(fetchAndCacheProperties, CACHE_DURATION_MS);

// Public, bot-friendly endpoint
app.get('/cached-properties', (req, res) => {
  if (cachedProperties) {
    res.json({
      cachedAt: new Date(lastFetchTime).toISOString(),
      data: cachedProperties
    });
  } else {
    res.status(503).json({ error: 'Data not available yet. Try again shortly.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
