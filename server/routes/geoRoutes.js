const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { searchPlaces, pointProfile } = require('../services/geoService');

const router = express.Router();

/**
 * Lightweight in-memory rate limit so the public map endpoints cannot be used
 * to hammer the upstream free services.
 */
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 80;
const hits = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ message: 'Too many map requests. Please wait a minute and try again.' });
  }
  return next();
}

router.use(rateLimit);

// GET /api/geo/search?q=Kochi
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const data = await searchPlaces(req.query.q, req.query.count);
    res.json(data);
  })
);

// GET /api/geo/profile?lat=31.22&lon=75.77
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const data = await pointProfile(req.query.lat, req.query.lon);
    res.json(data);
  })
);

module.exports = router;
