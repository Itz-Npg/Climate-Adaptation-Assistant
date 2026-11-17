const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true, default: '' },
    country: { type: String, required: true, trim: true },
    locationType: { type: String, required: true },
    climate: { type: String, required: true },
  },
  { _id: false }
);

const placeComparisonSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    locations: { type: [locationSchema], required: true, validate: (v) => v.length >= 2 && v.length <= 3 },
    comparisonData: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('PlaceComparison', placeComparisonSchema);
