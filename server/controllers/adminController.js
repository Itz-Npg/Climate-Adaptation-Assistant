const User = require('../models/User');
const RiskAssessment = require('../models/RiskAssessment');
const AdaptationPlan = require('../models/AdaptationPlan');
const PlaceComparison = require('../models/PlaceComparison');
const asyncHandler = require('../utils/asyncHandler');

const ROLES = ['user', 'admin'];
const MAX_PAGE_SIZE = 50;

function maskEmail(email) {
  const [name, domain] = String(email || '').split('@');
  if (!domain) return 'unknown';
  return `${name.slice(0, 2)}***@${domain}`;
}

function audit(req, action, target) {
  console.log(`[admin] ${action} by ${maskEmail(req.user.email)} on ${maskEmail(target)}`);
}

/** Escape a search term so it cannot inject regex operators or cause ReDoS. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const getStats = asyncHandler(async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [users, admins, newUsers, assessments, plans, comparisons] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    RiskAssessment.countDocuments({}),
    AdaptationPlan.countDocuments({}),
    PlaceComparison.countDocuments({}),
  ]);

  res.json({
    stats: { users, admins, newUsers, assessments, plans, comparisons },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || 20));
  const search = String(req.query.search || '').trim().slice(0, 80);

  const filter = search
    ? {
        $or: [
          { name: { $regex: escapeRegex(search), $options: 'i' } },
          { email: { $regex: escapeRegex(search), $options: 'i' } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const ids = users.map((user) => user._id);
  const [riskCounts, planCounts, comparisonCounts] = await Promise.all([
    RiskAssessment.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
    AdaptationPlan.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
    PlaceComparison.aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
  ]);

  const asMap = (rows) =>
    Object.fromEntries(rows.map((row) => [String(row._id), row.count]));

  const riskMap = asMap(riskCounts);
  const planMap = asMap(planCounts);
  const comparisonMap = asMap(comparisonCounts);

  res.json({
    users: users.map((user) => ({
      ...user.toPublicJSON(),
      assessments: riskMap[String(user._id)] || 0,
      plans: planMap[String(user._id)] || 0,
      comparisons: comparisonMap[String(user._id)] || 0,
    })),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    search,
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const [assessments, plans, comparisons] = await Promise.all([
    RiskAssessment.countDocuments({ userId: user._id }),
    AdaptationPlan.countDocuments({ userId: user._id }),
    PlaceComparison.countDocuments({ userId: user._id }),
  ]);

  res.json({
    user: { ...user.toPublicJSON(), assessments, plans, comparisons },
  });
});

const updateRole = asyncHandler(async (req, res) => {
  const role = String(req.body.role || '');
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: 'Role must be user or admin.' });
  }

  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot change your own role.' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  if (user.role === 'admin' && role !== 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) {
      return res.status(400).json({ message: 'At least one admin account must remain.' });
    }
  }

  user.role = role;
  await user.save();
  audit(req, `role->${role}`, user.email);

  res.json({ user: user.toPublicJSON() });
});

/** Clear a user's MFA when they lose their authenticator and backup codes. */
const resetMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.mfaPendingSecret = null;
  user.mfaBackupCodes = [];
  await user.save();
  audit(req, 'mfa-reset', user.email);

  res.json({ message: `Two-factor authentication cleared for ${user.email}.` });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot delete your own account here.' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  if (user.role === 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) {
      return res.status(400).json({ message: 'At least one admin account must remain.' });
    }
  }

  await Promise.all([
    RiskAssessment.deleteMany({ userId: user._id }),
    AdaptationPlan.deleteMany({ userId: user._id }),
    PlaceComparison.deleteMany({ userId: user._id }),
  ]);
  await user.deleteOne();
  audit(req, 'delete-user', user.email);

  res.json({ message: 'User and their data were deleted.' });
});

module.exports = { getStats, listUsers, getUser, updateRole, resetMfa, deleteUser };
