const RiskAssessment = require('../models/RiskAssessment');
const asyncHandler = require('../utils/asyncHandler');
const { assessLocation } = require('../services/riskEngine');
const { fetchLiveConditions } = require('../services/climateNow');
const { fetchCurrentTemperature } = require('../services/weatherProvider');
const { CLIMATES, LOCATION_TYPES, HOUSING_TYPES, WATER_BODIES, DRAINAGE_OPTIONS } = require('../services/riskEngine');

const createRisk = asyncHandler(async (req, res) => {
  const {
    city,
    state = '',
    country,
    locationType,
    housingType,
    waterBody,
    drainage,
    climate,
    averageTemperature,
  } = req.body;

  if (!LOCATION_TYPES.includes(locationType)) {
    return res.status(400).json({ message: 'Select a valid location type.' });
  }
  if (!HOUSING_TYPES.includes(housingType)) {
    return res.status(400).json({ message: 'Select a valid housing type.' });
  }
  if (!WATER_BODIES.includes(waterBody)) {
    return res.status(400).json({ message: 'Select the nearest water body.' });
  }
  if (!DRAINAGE_OPTIONS.includes(drainage)) {
    return res.status(400).json({ message: 'Select the drainage condition.' });
  }
  if (!CLIMATES.includes(climate)) {
    return res.status(400).json({ message: 'Select the local climate.' });
  }

  let temperature = averageTemperature === '' || averageTemperature === null || averageTemperature === undefined
    ? null
    : Number(averageTemperature);

  if (temperature !== null && (Number.isNaN(temperature) || temperature < -30 || temperature > 60)) {
    return res.status(400).json({ message: 'Average temperature must be between -30 and 60 \u00b0C.' });
  }

  // Real-time data first: Open-Meteo needs no key, so live conditions are used
  // whenever the service is reachable. OpenWeatherMap stays as an optional fallback.
  const live = await fetchLiveConditions({ city, state, country });
  let weather = live;
  let dataSource = 'illustrative';
  let observations = live.ok ? live : null;

  if (live.ok && live.temperature !== null) {
    temperature = live.temperature;
    dataSource = 'illustrative+live-open-meteo';
  } else {
    const fallback = await fetchCurrentTemperature({ city, country });
    if (fallback.ok && fallback.temperature !== null) {
      temperature = fallback.temperature;
      dataSource = 'illustrative+live-weather';
      weather = fallback;
    }
  }

  const result = assessLocation({
    city,
    state,
    country,
    locationType,
    housingType,
    waterBody,
    drainage,
    climate,
    averageTemperature: temperature,
    observations,
  });

  const saved = await RiskAssessment.create({
    userId: req.user._id,
    location: result.location,
    riskScores: result.riskScores,
    riskLevel: result.riskLevel,
    factors: result.factors,
    recommendations: result.recommendations,
    dataSource,
  });

  return res.status(201).json({ assessment: saved, weather, live: observations });
});

const listRisks = asyncHandler(async (req, res) => {
  const risks = await RiskAssessment.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ assessments: risks });
});

const getRisk = asyncHandler(async (req, res) => {
  const risk = await RiskAssessment.findOne({ _id: req.params.id, userId: req.user._id });
  if (!risk) return res.status(404).json({ message: 'Assessment not found.' });
  res.json({ assessment: risk });
});

const deleteRisk = asyncHandler(async (req, res) => {
  const risk = await RiskAssessment.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!risk) return res.status(404).json({ message: 'Assessment not found.' });
  res.json({ message: 'Assessment deleted.' });
});

module.exports = { createRisk, listRisks, getRisk, deleteRisk };
