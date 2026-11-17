const PlaceComparison = require('../models/PlaceComparison');
const asyncHandler = require('../utils/asyncHandler');
const { compareProfile, CLIMATES, LOCATION_TYPES } = require('../services/riskEngine');

const LABELS = ['Place A', 'Place B', 'Place C'];

const createComparison = asyncHandler(async (req, res) => {
  const { locations } = req.body;

  if (!Array.isArray(locations) || locations.length < 2 || locations.length > 3) {
    return res.status(400).json({ message: 'Add two or three locations to compare.' });
  }

  for (let index = 0; index < locations.length; index += 1) {
    const place = locations[index] || {};
    if (!String(place.city || '').trim()) {
      return res.status(400).json({ message: `${LABELS[index]}: city is required.` });
    }
    if (!String(place.country || '').trim()) {
      return res.status(400).json({ message: `${LABELS[index]}: country is required.` });
    }
    if (!LOCATION_TYPES.includes(place.locationType)) {
      return res.status(400).json({ message: `${LABELS[index]}: select a valid location type.` });
    }
    if (!CLIMATES.includes(place.climate)) {
      return res.status(400).json({ message: `${LABELS[index]}: select a valid climate profile.` });
    }
  }

  const storedLocations = locations.map((place, index) => ({
    label: LABELS[index],
    city: String(place.city).trim(),
    state: String(place.state || '').trim(),
    country: String(place.country).trim(),
    locationType: place.locationType,
    climate: place.climate,
  }));

  const places = storedLocations.map((place) => compareProfile(place, place.label));

  const bestFor = {
    lowestHeat: places.reduce((a, b) => (a.heatRisk <= b.heatRisk ? a : b)).label,
    lowestFlood: places.reduce((a, b) => (a.floodRisk <= b.floodRisk ? a : b)).label,
    mostWater: places.reduce((a, b) => (a.waterAvailability >= b.waterAvailability ? a : b)).label,
    mostGreen: places.reduce((a, b) => (a.greenCoverage >= b.greenCoverage ? a : b)).label,
  };

  const comparisonData = {
    places,
    bestFor,
    guidance:
      'These figures are illustrative estimates generated from the location details you entered. They are not official safety ratings, forecasts or relocation advice. Confirm with local authorities, municipal records and recent climate reports before making decisions.',
  };

  const saved = await PlaceComparison.create({
    userId: req.user._id,
    locations: storedLocations,
    comparisonData,
  });

  res.status(201).json({ comparison: saved });
});

const listComparisons = asyncHandler(async (req, res) => {
  const comparisons = await PlaceComparison.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
  res.json({ comparisons });
});

const deleteComparison = asyncHandler(async (req, res) => {
  const comparison = await PlaceComparison.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!comparison) return res.status(404).json({ message: 'Comparison not found.' });
  res.json({ message: 'Comparison deleted.' });
});

module.exports = { createComparison, listComparisons, deleteComparison };
