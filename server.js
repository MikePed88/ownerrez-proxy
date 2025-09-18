const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const username = process.env.USERNAME;
const password = process.env.PASSWORD;

// 🔐 Comma-separated list of allowed tokens (e.g., "tok1,tok2")
const API_TOKENS = (process.env.API_TOKENS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!username || !password) {
  console.error('USERNAME and PASSWORD must be set as environment variables.');
  process.exit(1);
}
if (API_TOKENS.length === 0) {
  console.error('API_TOKENS must be set (comma-separated if multiple).');
  process.exit(1);
}

app.set('trust proxy', 1); // if behind Render/Cloudflare/etc.
app.use(express.json());

// 🔧 Lock CORS to known frontends (optional but recommended)
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  }
}));

// 🔐 Token middleware (supports Authorization: Bearer <token> or X-API-Key or ?access_token=)
function requireToken(req, res, next) {
  const auth = req.header('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  const token = bearer?.[1] || req.header('x-api-key') || req.query.access_token;

  if (!token || !API_TOKENS.includes(token)) {
    res.set('WWW-Authenticate', 'Bearer realm="cached-api", charset="UTF-8"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Don’t let proxies/CDNs cache auth’d responses
  res.set('Cache-Control', 'no-store');
  next();
}

// --- In-memory caches ---
let cachedProperties = null;
let lastFetchTime = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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

fetchAndCacheProperties();
setInterval(fetchAndCacheProperties, CACHE_DURATION_MS);

// ✅ health check (left open)
app.get('/healthz', (req, res) => res.json({ ok: true }));

// 🔒 Protected endpoints
app.get('/cached-properties', requireToken, (req, res) => {
  if (cachedProperties) {
    return res.json({
      cachedAt: new Date(lastFetchTime).toISOString(),
      data: cachedProperties
    });
  }
  res.status(503).json({ error: 'Data not available yet. Try again shortly.' });
});

let cachedBookings = null;
let lastBookingsFetchTime = null;

const fetchAndCacheBookings = async () => {
  try {
    const response = await axios.get('https://api.ownerrez.com/v2/bookings', {
      auth: { username, password },
      params: { property_ids: 415394 }
    });
    cachedBookings = response.data;
    lastBookingsFetchTime = Date.now();
    console.log('🔄 Bookings cache refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh bookings cache:', error.response?.data || error.message);
  }
};

fetchAndCacheBookings();
setInterval(fetchAndCacheBookings, CACHE_DURATION_MS);

app.get('/cached-bookings', requireToken, (req, res) => {
  if (!cachedBookings) {
    return res.status(503).json({ error: 'Bookings data not available yet. Try again shortly.' });
  }
  res.json({
    cachedAt: new Date(lastBookingsFetchTime).toISOString(),
    data: cachedBookings
  });
});

let cachedListings = null;
let lastListingsFetchTime = null;

const fetchAndCacheListings = async () => {
  try {
    const response = await axios.get('https://api.ownerrez.com/v2/listings', {
      auth: { username, password },
      params: {
        includeAmenities: true,
        includeRooms: true,
        includeBathrooms: true,
        includeImages: true,
        includeDescriptions: 'Text'
      }
    });
    cachedListings = response.data;
    lastListingsFetchTime = Date.now();
    console.log('🔄 Listings cache refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh Listings cache:', error.response?.data || error.message);
  }
};

fetchAndCacheListings();
setInterval(fetchAndCacheListings, CACHE_DURATION_MS);

app.get('/cached-listings', requireToken, (req, res) => {
  if (!cachedListings) {
    return res.status(503).json({ error: 'Listings data not available yet. Try again shortly.' });
  }
  res.json({
    cachedAt: new Date(lastListingsFetchTime).toISOString(),
    data: cachedListings
  });
});

let cachedGuests = null;
let lastGuestsFetchTime = null;

const fetchAndCacheGuests = async () => {
  try {
    const response = await axios.get('https://api.ownerrez.com/v2/guests', {
      auth: { username, password },
      params: { created_since_utc: '2022-01-01T00:00:00Z' }
    });
    cachedGuests = response.data;
    lastGuestsFetchTime = Date.now();
    console.log('🔄 Guests cache refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh guests cache:', error.response?.data || error.message);
  }
};

fetchAndCacheGuests();
setInterval(fetchAndCacheGuests, CACHE_DURATION_MS);

app.get('/cached-guests/:id?', requireToken, (req, res) => {
  if (!cachedGuests) {
    return res.status(503).json({ error: 'Guests data not available yet. Try again shortly.' });
  }
  const { id } = req.params;
  if (id) {
    const guest = Array.isArray(cachedGuests)
      ? cachedGuests.find(g => String(g.id) === id)
      : null;
    if (!guest) {
      return res.status(404).json({ error: `Guest with id ${id} not found.` });
    }
    return res.json({
      cachedAt: new Date(lastGuestsFetchTime).toISOString(),
      data: guest
    });
  }
  res.json({
    cachedAt: new Date(lastGuestsFetchTime).toISOString(),
    data: cachedGuests
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
