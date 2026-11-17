/**
 * Illustrative climate risk engine.
 *
 * This is a transparent, rule-based model for an educational project. It is
 * NOT a forecast, a climate projection or an official risk rating. Every score
 * is derived from the answers the user gives plus a few broad climate-region
 * assumptions, so it is fully explainable (see `factors`).
 */

const LOCATION_TYPES = ['urban', 'suburban', 'rural', 'coastal'];
const HOUSING_TYPES = ['apartment', 'independent-house', 'informal', 'farmhouse'];
const WATER_BODIES = ['none', 'river', 'lake', 'coast', 'canal', 'groundwater'];
const DRAINAGE_OPTIONS = ['good', 'moderate', 'poor', 'unknown'];
const CLIMATES = ['hot-dry', 'hot-humid', 'temperate', 'cold', 'monsoon'];

const CLIMATE_LABELS = {
  'hot-dry': 'Hot and dry',
  'hot-humid': 'Hot and humid',
  temperate: 'Temperate',
  cold: 'Cold / high altitude',
  monsoon: 'Strong monsoon',
};

const LOCATION_LABELS = {
  urban: 'Urban core',
  suburban: 'Suburban',
  rural: 'Rural',
  coastal: 'Coastal town',
};

const HOUSING_LABELS = {
  apartment: 'Apartment',
  'independent-house': 'Independent house',
  informal: 'Informal / temporary housing',
  farmhouse: 'Farmhouse',
};

const WATER_BODY_LABELS = {
  none: 'No water body nearby',
  river: 'River nearby',
  lake: 'Lake or pond nearby',
  coast: 'Sea / coastline nearby',
  canal: 'Canal or irrigation channel nearby',
  groundwater: 'Borewell / groundwater dependent',
};

const DRAINAGE_LABELS = {
  good: 'Good drainage',
  moderate: 'Moderate drainage',
  poor: 'Poor drainage',
  unknown: 'Drainage conditions unknown',
};

const HEAT_BASE = { 'hot-dry': 66, 'hot-humid': 60, temperate: 36, cold: 20, monsoon: 48 };
const FLOOD_BASE = { 'hot-dry': 16, 'hot-humid': 55, temperate: 36, cold: 26, monsoon: 62 };
const DROUGHT_BASE = { 'hot-dry': 70, 'hot-humid': 30, temperate: 38, cold: 26, monsoon: 28 };

const clamp = (value, min = 5, max = 95) => Math.min(max, Math.max(min, Math.round(value)));

/** Normalise live weather observations coming from the Open-Meteo service. */
function normaliseObservations(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const pick = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
  const observations = {
    temperature: pick(raw.temperature),
    humidity: pick(raw.humidity),
    rain7d: pick(raw.rain7d),
    rain30d: pick(raw.rain30d),
    maxTemp30d: pick(raw.maxTemp30d),
  };
  const hasAny = Object.values(observations).some((value) => value !== null);
  return hasAny ? observations : null;
}

function normalise(value, allowed, fallback) {
  const clean = String(value || '').trim().toLowerCase();
  return allowed.includes(clean) ? clean : fallback;
}

function levelFor(score) {
  if (score >= 80) return 'severe';
  if (score >= 60) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

function overallLevel(scores) {
  const values = [scores.heat, scores.flood, scores.drought, scores.waterScarcity];
  const worst = Math.max(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const bracket = (worst + average) / 2;
  return levelFor(bracket);
}

/** Small deterministic variation so two names never look identical. */
function nameSeed(text) {
  let seed = 7;
  for (const char of String(text || '')) seed = (seed * 31 + char.charCodeAt(0)) % 97;
  return seed;
}

function buildLocation(input = {}) {
  return {
    city: String(input.city || '').trim(),
    state: String(input.state || '').trim(),
    country: String(input.country || '').trim(),
    locationType: normalise(input.locationType, LOCATION_TYPES, 'urban'),
    housingType: normalise(input.housingType, HOUSING_TYPES, 'independent-house'),
    waterBody: normalise(input.waterBody, WATER_BODIES, 'none'),
    drainage: normalise(input.drainage, DRAINAGE_OPTIONS, 'unknown'),
    climate: normalise(input.climate, CLIMATES, 'temperate'),
    averageTemperature: Number.isFinite(Number(input.averageTemperature))
      ? Number(input.averageTemperature)
      : null,
  };
}

/**
 * Score a location. Returns scores, level, contributing factors and
 * safety recommendations for each hazard.
 */
function assessLocation(rawInput) {
  const location = buildLocation(rawInput);
  const factors = [];

  let heat = HEAT_BASE[location.climate];
  let flood = FLOOD_BASE[location.climate];
  let drought = DROUGHT_BASE[location.climate];
  let scarcity = 30 + DROUGHT_BASE[location.climate] * 0.45;

  factors.push({
    label: 'Climate profile',
    detail: `Monthly climate assumed as "${CLIMATE_LABELS[location.climate]}", which sets the starting point for every hazard score.`,
  });

  if (location.averageTemperature !== null) {
    const delta = (location.averageTemperature - 25) * 1.6;
    heat += delta;
    drought += delta * 0.6;
    factors.push({
      label: 'Reported temperature',
      detail: `Your average temperature of ${location.averageTemperature}\u00b0C is ${delta >= 0 ? 'above' : 'below'} the 25\u00b0C baseline used by the model.`,
    });
  }

  // Live observations (Open-Meteo). They shift the score but never replace the
  // household answers, and every contribution is reported as a factor.
  const observations = normaliseObservations(rawInput.observations);
  if (observations) {
    if (observations.temperature !== null) {
      const delta = Math.max(-14, Math.min(14, (observations.temperature - 25) * 1.6));
      heat += delta;
      drought += Math.max(-10, Math.min(10, (observations.temperature - 25) * 0.8));
      factors.push({
        label: 'Live temperature',
        detail: `Open-Meteo reports ${observations.temperature}\u00b0C right now, ${delta >= 0 ? 'above' : 'below'} the 25\u00b0C baseline used by the model.`,
      });
    }

    if (observations.humidity !== null) {
      if (observations.humidity >= 75) heat += 7;
      else if (observations.humidity <= 30) drought += 6;
      else heat += 2;
      factors.push({
        label: 'Live humidity',
        detail: `${observations.humidity}% relative humidity. ${observations.humidity >= 75 ? 'Humid air reduces the body\u2019s ability to cool down.' : observations.humidity <= 30 ? 'Dry air raises evaporation and water demand.' : 'Moderate humidity has a small effect on heat stress.'}`,
      });
    }

    if (observations.rain7d !== null) {
      flood += Math.min(16, observations.rain7d * 0.8);
      drought -= Math.min(10, observations.rain7d * 0.7);
      factors.push({
        label: 'Rain in the last 7 days',
        detail: `${observations.rain7d} mm recorded. ${observations.rain7d >= 40 ? 'Saturated ground raises flood risk.' : observations.rain7d < 2 ? 'Almost no recent rain, so surfaces and drains are dry.' : 'Moderate recent rainfall.'}`,
      });
    }

    if (observations.rain30d !== null) {
      drought -= Math.min(18, observations.rain30d * 0.35);
      scarcity -= Math.min(12, observations.rain30d * 0.25);
      factors.push({
        label: 'Rain in the last 30 days',
        detail: `${observations.rain30d} mm recorded over the past month, which adjusts drought and water scarcity downwards when rainfall is healthy.`,
      });
    }

    if (observations.maxTemp30d !== null && observations.maxTemp30d > 33) {
      heat += Math.min(12, (observations.maxTemp30d - 33) * 1.2);
      factors.push({
        label: 'Hottest day this month',
        detail: `The hottest day in the last 30 days reached ${observations.maxTemp30d}\u00b0C, which raises heat exposure.`,
      });
    }
  }

  const typeEffects = {
    urban: { heat: 9, flood: 4, drought: 2, scarcity: 6, note: 'Dense surfaces trap heat and drain less water into the ground.' },
    suburban: { heat: 4, flood: 1, drought: 1, scarcity: 3, note: 'Mixed surfaces give moderate heat and drainage pressure.' },
    rural: { heat: 0, flood: -4, drought: 4, scarcity: 4, note: 'Open land cools faster but often depends on a single local water source.' },
    coastal: { heat: -4, flood: 13, drought: -2, scarcity: -1, note: 'Sea breezes soften heat while raising storm-surge and flooding exposure.' },
  }[location.locationType];

  heat += typeEffects.heat;
  flood += typeEffects.flood;
  drought += typeEffects.drought;
  scarcity += typeEffects.scarcity;
  factors.push({ label: 'Location type', detail: `${LOCATION_LABELS[location.locationType]}: ${typeEffects.note}` });

  const housingEffects = {
    apartment: { heat: 6, flood: 2, note: 'Upper floors can overheat; shared pumps may stop during a power cut.' },
    'independent-house': { heat: 2, flood: 4, note: 'Roof and plinth level strongly affect heat and water entry.' },
    informal: { heat: 11, flood: 14, note: 'Light roofing and poor drainage connections raise both heat and flood exposure.' },
    farmhouse: { heat: 3, flood: 3, note: 'Exposed structures and long access routes slow down emergency response.' },
  }[location.housingType];

  heat += housingEffects.heat;
  flood += housingEffects.flood;
  factors.push({ label: 'Housing type', detail: `${HOUSING_LABELS[location.housingType]}: ${housingEffects.note}` });

  const waterEffects = {
    none: { flood: -6, scarcity: 18, note: 'No surface water nearby, so household supply is more fragile.' },
    river: { flood: 20, scarcity: -12, note: 'Rivers raise flood exposure but usually support supply.' },
    lake: { flood: 9, scarcity: -8, note: 'Lakes moderate local supply while raising waterlogging risk.' },
    coast: { flood: 16, scarcity: 2, note: 'Coastal water is not drinkable without treatment but raises flood risk.' },
    canal: { flood: 12, scarcity: -6, note: 'Channels help supply but can overflow during heavy rain.' },
    groundwater: { flood: -2, scarcity: 12, note: 'Dependence on borewells makes supply sensitive to recharge and power.' },
  }[location.waterBody];

  flood += waterEffects.flood;
  scarcity += waterEffects.scarcity;
  factors.push({ label: 'Nearby water body', detail: `${WATER_BODY_LABELS[location.waterBody]}: ${waterEffects.note}` });

  const drainageEffects = {
    good: { flood: -12, note: 'Functional drains and soak pits reduce standing water.' },
    moderate: { flood: 6, note: 'Drains work partly, so heavy spells can still pool.' },
    poor: { flood: 24, note: 'Blocked or missing drains are the strongest flooding factor in this model.' },
    unknown: { flood: 10, note: 'Unknown drainage is treated as a mild risk by the model.' },
  }[location.drainage];

  flood += drainageEffects.flood;
  factors.push({ label: 'Drainage condition', detail: `${DRAINAGE_LABELS[location.drainage]}: ${drainageEffects.note}` });

  scarcity += drought > 60 ? 10 : 2;
  const scores = {
    heat: clamp(heat),
    flood: clamp(flood),
    drought: clamp(drought),
    waterScarcity: clamp(scarcity),
  };

  const riskLevel = overallLevel(scores);
  const topHazard = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  factors.push({
    label: 'Dominant hazard',
    detail: `${HAZARD_NAMES[topHazard]} is the highest scoring concern for this profile at ${scores[topHazard]}/100.`,
  });

  return {
    location,
    riskScores: scores,
    riskLevel,
    factors,
    recommendations: recommendationsFor(scores, location),
    dataSource: 'illustrative',
  };
}

const HAZARD_NAMES = {
  heat: 'Extreme heat',
  flood: 'Flooding',
  drought: 'Drought',
  waterScarcity: 'Water scarcity',
};

const RECOMMENDATIONS = {
  heat: {
    high: [
      'Keep drinking water within reach and drink before you feel thirsty.',
      'Shift outdoor work to early morning or after sunset.',
      'Use curtains, white roof paint or shade cloth to lower indoor heat.',
      'Check daily on older relatives, infants and anyone with a chronic illness.',
    ],
    low: [
      'Note the hottest weeks of the year and plan indoor tasks for those days.',
      'Keep one room shaded and ventilated as a summer cool room.',
    ],
  },
  flood: {
    high: [
      'Store documents, medicine and a phone charger in a sealed waterproof bag.',
      'Never walk or drive through moving water - 15 cm can knock you down.',
      'Raise appliances and stored grain above the expected water level.',
      'Agree on a family meeting point and a contact outside the flooded area.',
    ],
    low: [
      'Clear roof gutters and nearby drains before the rainy season.',
      'Keep sandbags or a low barrier ready for the main door.',
    ],
  },
  drought: {
    high: [
      'Mulch garden beds and switch to drip or pitcher watering.',
      'Harvest roof rainwater into covered storage for non-drinking use.',
      'Reuse rinse water for plants and cleaning instead of pouring it away.',
      'Track local reservoir or borewell levels every month.',
    ],
    low: [
      'Fix leaking taps and pipes - a steady drip wastes hundreds of litres a month.',
      'Choose native, low-water plants for balconies and gardens.',
    ],
  },
  waterScarcity: {
    high: [
      'Keep at least seven days of drinking water per person in covered containers.',
      'Set a household daily water budget and assign someone to monitor it.',
      'Coordinate with neighbours on a shared emergency tanker or borewell contact.',
      'Store water safely and treat it (boil or filter) before drinking.',
    ],
    low: [
      'Store three days of drinking water as a normal household reserve.',
      'Label stored water with the date it was filled and rotate it monthly.',
    ],
  },
};

function recommendationsFor(scores, location) {
  const list = [];
  const order = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  for (const [hazard, score] of order.slice(0, 3)) {
    const bucket = score >= 55 ? 'high' : 'low';
    list.push(...RECOMMENDATIONS[hazard][bucket]);
  }

  if (location.housingType === 'informal') {
    list.push('Work with your local ward office on a safe shelter option for severe weather days.');
  }
  if (location.drainage === 'poor') {
    list.push('Photograph blocked drains and report them to the municipal helpline before the monsoon.');
  }
  if (location.averageTemperature !== null && location.averageTemperature >= 38) {
    list.push('Plan an indoor cooling space and identify the nearest public shaded or cooled area.');
  }

  return [...new Set(list)];
}

/** Compact per-place summary used by the comparison tool. */
function compareProfile(rawInput, label) {
  const result = assessLocation(rawInput);
  const seed = nameSeed(`${result.location.city}${result.location.state}`);
  const coverageBase = { urban: 24, suburban: 41, rural: 56, coastal: 34 }[result.location.locationType];
  const greenCoverage = clamp(coverageBase + (seed % 11) - 5, 8, 85);

  return {
    label,
    city: result.location.city,
    state: result.location.state,
    country: result.location.country,
    locationType: result.location.locationType,
    climate: result.location.climate,
    climateLabel: CLIMATE_LABELS[result.location.climate],
    locationTypeLabel: LOCATION_LABELS[result.location.locationType],
    heatRisk: result.riskScores.heat,
    floodRisk: result.riskScores.flood,
    droughtRisk: result.riskScores.drought,
    waterAvailability: 100 - result.riskScores.waterScarcity,
    greenCoverage,
    riskLevel: result.riskLevel,
    recommendations: result.recommendations.slice(0, 4),
    dataSource: 'illustrative',
  };
}

module.exports = {
  assessLocation,
  compareProfile,
  levelFor,
  CLIMATES,
  LOCATION_TYPES,
  HOUSING_TYPES,
  WATER_BODIES,
  DRAINAGE_OPTIONS,
  CLIMATE_LABELS,
};
