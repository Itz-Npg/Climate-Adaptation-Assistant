const mongoose = require('mongoose');

const factorSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    detail: { type: String, required: true },
  },
  { _id: false }
);

const riskAssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    location: {
      city: { type: String, required: true, trim: true },
      state: { type: String, trim: true, default: '' },
      country: { type: String, required: true, trim: true },
      locationType: { type: String, required: true },
      housingType: { type: String, required: true },
      waterBody: { type: String, required: true },
      drainage: { type: String, required: true },
      climate: { type: String, required: true },
      averageTemperature: { type: Number, default: null },
    },
    riskScores: {
      heat: { type: Number, required: true },
      flood: { type: Number, required: true },
      drought: { type: Number, required: true },
      waterScarcity: { type: Number, required: true },
    },
    riskLevel: { type: String, required: true },
    factors: { type: [factorSchema], default: [] },
    recommendations: { type: [String], default: [] },
    dataSource: { type: String, default: 'illustrative' },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('RiskAssessment', riskAssessmentSchema);
