const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: 160,
    },
    completed: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dueDate: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const adaptationPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Plan title is required'],
      trim: true,
      maxlength: 120,
    },
    description: { type: String, trim: true, default: '', maxlength: 500 },
    tasks: { type: [taskSchema], default: [] },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, default: null },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

adaptationPlanSchema.virtual('progress').get(function progress() {
  if (!this.tasks.length) return 0;
  const done = this.tasks.filter((task) => task.completed).length;
  return Math.round((done / this.tasks.length) * 100);
});

adaptationPlanSchema.set('toJSON', { virtuals: true });
adaptationPlanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AdaptationPlan', adaptationPlanSchema);
