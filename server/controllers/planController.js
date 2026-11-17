const AdaptationPlan = require('../models/AdaptationPlan');
const asyncHandler = require('../utils/asyncHandler');

const PRIORITIES = ['low', 'medium', 'high'];

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normaliseTasks(tasks) {
  if (!Array.isArray(tasks)) return null;
  return tasks.map((task, index) => {
    const title = String(task.title || '').trim();
    if (!title) {
      const error = new Error(`Task ${index + 1} needs a title.`);
      error.status = 400;
      throw error;
    }
    return {
      _id: task._id,
      title: title.slice(0, 160),
      completed: Boolean(task.completed),
      priority: PRIORITIES.includes(task.priority) ? task.priority : 'medium',
      dueDate: parseDate(task.dueDate),
      createdAt: task.createdAt || new Date(),
    };
  });
}

const createPlan = asyncHandler(async (req, res) => {
  const { title, description = '', priority = 'medium', dueDate = null, tasks = [] } = req.body;

  const plan = await AdaptationPlan.create({
    userId: req.user._id,
    title: String(title).trim().slice(0, 120),
    description: String(description).trim().slice(0, 500),
    priority: PRIORITIES.includes(priority) ? priority : 'medium',
    dueDate: parseDate(dueDate),
    tasks: normaliseTasks(tasks) || [],
  });

  res.status(201).json({ plan });
});

const listPlans = asyncHandler(async (req, res) => {
  const plans = await AdaptationPlan.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ plans });
});

const getPlan = asyncHandler(async (req, res) => {
  const plan = await AdaptationPlan.findOne({ _id: req.params.id, userId: req.user._id });
  if (!plan) return res.status(404).json({ message: 'Plan not found.' });
  res.json({ plan });
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await AdaptationPlan.findOne({ _id: req.params.id, userId: req.user._id });
  if (!plan) return res.status(404).json({ message: 'Plan not found.' });

  const { title, description, priority, dueDate, completed, tasks } = req.body;

  if (title !== undefined) plan.title = String(title).trim().slice(0, 120);
  if (description !== undefined) plan.description = String(description).trim().slice(0, 500);
  if (priority !== undefined) plan.priority = PRIORITIES.includes(priority) ? priority : plan.priority;
  if (dueDate !== undefined) plan.dueDate = parseDate(dueDate);
  if (completed !== undefined) plan.completed = Boolean(completed);
  if (tasks !== undefined) {
    const normalised = normaliseTasks(tasks);
    if (!normalised) return res.status(400).json({ message: 'Tasks must be a list.' });
    plan.tasks = normalised;
  }

  if (tasks !== undefined && plan.tasks.length && plan.tasks.every((task) => task.completed)) {
    plan.completed = true;
  }

  await plan.save();
  res.json({ plan });
});

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await AdaptationPlan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!plan) return res.status(404).json({ message: 'Plan not found.' });
  res.json({ message: 'Plan deleted.' });
});

module.exports = { createPlan, listPlans, getPlan, updatePlan, deletePlan };
