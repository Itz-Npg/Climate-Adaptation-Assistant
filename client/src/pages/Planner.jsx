import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ClipboardList,
  Droplets,
  Flame,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Waves,
  X,
} from 'lucide-react';
import { getErrorMessage, planApi } from '../api/client';
import { Alert, EmptyState, LoadingBlock, PageHeader } from '../components/ui';
import Breadcrumbs from '../components/Breadcrumbs';
import RelatedTools from '../components/RelatedTools';
import { useSeo } from '../lib/seo';

const PRIORITY_STYLES = {
  low: 'bg-forest-50 text-forest-700 border-forest-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
};

const SUGGESTIONS = [
  {
    hazard: 'Heatwaves',
    icon: Flame,
    items: [
      'Store at least 4 litres of drinking water per person per day',
      'Identify the coolest room and keep it shaded during the day',
      'Check on older neighbours during a heat alert',
      'Keep oral rehydration salts in the emergency kit',
    ],
  },
  {
    hazard: 'Floods',
    icon: Waves,
    items: [
      'Pack documents and medicines in a waterproof bag',
      'Clear roof gutters and nearby drains before the monsoon',
      'Agree on a family meeting point and an out-of-area contact',
      'Raise electrical sockets and stored grain above floor level',
    ],
  },
  {
    hazard: 'Drought',
    icon: CalendarDays,
    items: [
      'Mulch plants and water only in the early morning',
      'Set up roof rainwater harvesting for non-drinking use',
      'Fix leaking taps and check the meter monthly',
      'Track the local reservoir or borewell level every month',
    ],
  },
  {
    hazard: 'Water conservation',
    icon: Droplets,
    items: [
      'Reuse rinse water for plants and cleaning',
      'Install a low-flow shower head or tap aerator',
      'Store three days of drinking water and rotate it monthly',
      'Set a household daily water budget and monitor it',
    ],
  },
];

const emptyPlanForm = { title: '', description: '', priority: 'medium', dueDate: '' };
const emptyTaskForm = { title: '', priority: 'medium', dueDate: '' };

function formatDate(value) {
  if (!value) return 'No deadline';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function toInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function completion(plan) {
  const tasks = plan?.tasks || [];
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}

export default function Planner() {
  useSeo({
    title: 'Adaptation Planner',
    description:
      'Build a household climate adaptation plan with tasks, priorities and deadlines, then track your progress over time.',
    path: '/planner',
    noIndex: true,
    breadcrumbs: [{ label: 'Planner' }],
  });
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [editingTask, setEditingTask] = useState(null);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editPlanForm, setEditPlanForm] = useState(emptyPlanForm);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await planApi.list();
      const list = data.plans || [];
      setPlans(list);
      setSelectedId((current) => current || list[0]?._id || '');
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load your plans.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const selected = useMemo(
    () => plans.find((plan) => plan._id === selectedId) || null,
    [plans, selectedId]
  );

  function replacePlan(updated) {
    setPlans((current) => current.map((plan) => (plan._id === updated._id ? updated : plan)));
  }

  async function handleCreatePlan(event) {
    event.preventDefault();
    if (planForm.title.trim().length < 3) {
      setError('Give the plan a title of at least 3 characters.');
      return;
    }
    setBusy('create-plan');
    setError('');
    setNotice('');
    try {
      const { data } = await planApi.create({
        title: planForm.title.trim(),
        description: planForm.description.trim(),
        priority: planForm.priority,
        dueDate: planForm.dueDate || null,
      });
      setPlans((current) => [data.plan, ...current]);
      setSelectedId(data.plan._id);
      setPlanForm(emptyPlanForm);
      setNotice('Plan created. Add your first task below.');
    } catch (createError) {
      setError(getErrorMessage(createError, 'Could not create the plan.'));
    } finally {
      setBusy('');
    }
  }

  async function handleAddTask(event) {
    event.preventDefault();
    if (!selected) return;
    if (!taskForm.title.trim()) {
      setError('Enter a task title.');
      return;
    }
    setBusy('add-task');
    setError('');
    setNotice('');
    try {
      const tasks = [
        ...selected.tasks,
        {
          title: taskForm.title.trim(),
          priority: taskForm.priority,
          dueDate: taskForm.dueDate || null,
          completed: false,
        },
      ];
      const { data } = await planApi.update(selected._id, { tasks, completed: false });
      replacePlan(data.plan);
      setTaskForm(emptyTaskForm);
      setNotice('Task added.');
    } catch (addError) {
      setError(getErrorMessage(addError, 'Could not add the task.'));
    } finally {
      setBusy('');
    }
  }

  async function saveTasks(tasks, successMessage) {
    if (!selected) return;
    setBusy('tasks');
    setError('');
    setNotice('');
    try {
      const { data } = await planApi.update(selected._id, { tasks });
      replacePlan(data.plan);
      if (successMessage) setNotice(successMessage);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setBusy('');
    }
  }

  async function toggleTask(task) {
    const tasks = selected.tasks.map((item) =>
      item._id === task._id ? { ...item, completed: !item.completed } : item
    );
    await saveTasks(tasks);
  }

  async function deleteTask(task) {
    const tasks = selected.tasks.filter((item) => item._id !== task._id);
    await saveTasks(tasks, 'Task removed.');
  }

  async function saveTaskEdit(event) {
    event.preventDefault();
    if (!editingTask.title.trim()) {
      setError('Task title cannot be empty.');
      return;
    }
    const tasks = selected.tasks.map((item) =>
      item._id === editingTask._id
        ? {
            ...item,
            title: editingTask.title.trim(),
            priority: editingTask.priority,
            dueDate: editingTask.dueDate || null,
          }
        : item
    );
    await saveTasks(tasks, 'Task updated.');
    setEditingTask(null);
  }

  async function addSuggestedTask(title) {
    if (!selected) {
      setError('Create or select a plan first, then add suggested actions to it.');
      return;
    }
    if (selected.tasks.some((task) => task.title === title)) {
      setNotice('That action is already in this plan.');
      return;
    }
    const tasks = [...selected.tasks, { title, priority: 'medium', completed: false }];
    await saveTasks(tasks, 'Suggested action added to your plan.');
  }

  function openEditPlan() {
    if (!selected) return;
    setEditPlanForm({
      title: selected.title,
      description: selected.description || '',
      priority: selected.priority,
      dueDate: toInputDate(selected.dueDate),
    });
    setEditPlanOpen(true);
  }

  async function handleUpdatePlan(event) {
    event.preventDefault();
    if (!selected) return;
    if (editPlanForm.title.trim().length < 3) {
      setError('Plan title needs at least 3 characters.');
      return;
    }
    setBusy('update-plan');
    setError('');
    setNotice('');
    try {
      const { data } = await planApi.update(selected._id, {
        title: editPlanForm.title.trim(),
        description: editPlanForm.description.trim(),
        priority: editPlanForm.priority,
        dueDate: editPlanForm.dueDate || null,
      });
      replacePlan(data.plan);
      setEditPlanOpen(false);
      setNotice('Plan updated.');
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'Could not update the plan.'));
    } finally {
      setBusy('');
    }
  }

  async function handleDeletePlan() {
    if (!selected) return;
    if (!window.confirm(`Delete the plan "${selected.title}" and all of its tasks?`)) return;
    setBusy('delete-plan');
    setError('');
    setNotice('');
    try {
      await planApi.remove(selected._id);
      setPlans((current) => {
        const next = current.filter((plan) => plan._id !== selected._id);
        setSelectedId(next[0]?._id || '');
        return next;
      });
      setNotice('Plan deleted.');
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Tool 02"
        title="Family Adaptation Planner"
        description="Create a household plan, add tasks with priorities and deadlines, and track how much you have completed. Every task is saved to your account."
      />

      {error ? <Alert type="error" className="mt-5">{error}</Alert> : null}
      {notice ? <Alert type="success" className="mt-5">{notice}</Alert> : null}

      {loading ? (
        <div className="mt-6">
          <LoadingBlock label="Loading your plans..." />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          {/* Plans column */}
          <div className="space-y-6">
            <form onSubmit={handleCreatePlan} className="card">
              <h2 className="text-lg font-bold">Create a plan</h2>
              <p className="mt-1 text-sm text-muted">For example: &ldquo;Monsoon readiness 2026&rdquo;.</p>

              <div className="mt-4">
                <label htmlFor="plan-title" className="label">
                  Plan title
                </label>
                <input
                  id="plan-title"
                  className="input"
                  value={planForm.title}
                  onChange={(event) => setPlanForm({ ...planForm, title: event.target.value })}
                  placeholder="Household heat and water plan"
                />
              </div>

              <div className="mt-4">
                <label htmlFor="plan-description" className="label">
                  Description (optional)
                </label>
                <textarea
                  id="plan-description"
                  rows={3}
                  className="input resize-none"
                  value={planForm.description}
                  onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })}
                  placeholder="What is this plan for?"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="plan-priority" className="label">
                    Priority
                  </label>
                  <select
                    id="plan-priority"
                    className="select"
                    value={planForm.priority}
                    onChange={(event) => setPlanForm({ ...planForm, priority: event.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="plan-due" className="label">
                    Target date
                  </label>
                  <input
                    id="plan-due"
                    type="date"
                    className="input"
                    value={planForm.dueDate}
                    onChange={(event) => setPlanForm({ ...planForm, dueDate: event.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary mt-5 w-full" disabled={busy === 'create-plan'}>
                {busy === 'create-plan' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Create plan
                  </>
                )}
              </button>
            </form>

            <div className="card">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Your plans</h2>
                <span className="text-xs text-muted">{plans.length} total</span>
              </div>
              {plans.length ? (
                <ul className="mt-3 space-y-2">
                  {plans.map((plan) => {
                    const progress = completion(plan);
                    return (
                      <li key={plan._id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(plan._id);
                            setEditingTask(null);
                            setNotice('');
                          }}
                          className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                            plan._id === selectedId
                              ? 'border-forest-300 bg-forest-50/70'
                              : 'border-line hover:border-forest-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-sm font-semibold">{plan.title}</span>
                            <span className="text-xs font-semibold text-forest-700">{progress}%</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                            <div className="h-full rounded-full bg-forest-500" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted">
                            {plan.tasks.length} tasks &bull; {formatDate(plan.dueDate)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl bg-canvas px-3 py-4 text-sm text-muted">
                  No plans yet. Create your first plan above.
                </p>
              )}
            </div>
          </div>

          {/* Selected plan */}
          <div className="space-y-6">
            {selected ? (
              <>
                <div className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="eyebrow">Selected plan</span>
                      <h2 className="mt-2 text-xl font-bold">{selected.title}</h2>
                      {selected.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted">{selected.description}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={openEditPlan} className="btn-outline btn-sm">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleDeletePlan}
                        className="btn-danger btn-sm"
                        disabled={busy === 'delete-plan'}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full border px-2.5 py-1 font-semibold capitalize ${
                        PRIORITY_STYLES[selected.priority]
                      }`}
                    >
                      {selected.priority} priority
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-muted">
                      Target: {formatDate(selected.dueDate)}
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-muted">
                      {selected.tasks.filter((task) => task.completed).length}/{selected.tasks.length} done
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">Completion</span>
                      <span className="font-semibold text-forest-700">{completion(selected)}%</span>
                    </div>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-forest-500 transition-all"
                        style={{ width: `${completion(selected)}%` }}
                        role="progressbar"
                        aria-valuenow={completion(selected)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Plan completion"
                      />
                    </div>
                  </div>

                  {editPlanOpen ? (
                    <form onSubmit={handleUpdatePlan} className="mt-5 rounded-xl border border-line bg-canvas p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="edit-title" className="label">
                            Title
                          </label>
                          <input
                            id="edit-title"
                            className="input"
                            value={editPlanForm.title}
                            onChange={(event) => setEditPlanForm({ ...editPlanForm, title: event.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="edit-description" className="label">
                            Description
                          </label>
                          <textarea
                            id="edit-description"
                            rows={2}
                            className="input resize-none"
                            value={editPlanForm.description}
                            onChange={(event) =>
                              setEditPlanForm({ ...editPlanForm, description: event.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-priority" className="label">
                            Priority
                          </label>
                          <select
                            id="edit-priority"
                            className="select"
                            value={editPlanForm.priority}
                            onChange={(event) => setEditPlanForm({ ...editPlanForm, priority: event.target.value })}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="edit-due" className="label">
                            Target date
                          </label>
                          <input
                            id="edit-due"
                            type="date"
                            className="input"
                            value={editPlanForm.dueDate}
                            onChange={(event) => setEditPlanForm({ ...editPlanForm, dueDate: event.target.value })}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button type="submit" className="btn-primary btn-sm" disabled={busy === 'update-plan'}>
                          {busy === 'update-plan' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Save changes
                        </button>
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setEditPlanOpen(false)}>
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>

                <div className="card">
                  <h3 className="text-base font-bold">Tasks</h3>

                  <form onSubmit={handleAddTask} className="mt-3 rounded-xl border border-line bg-canvas p-3.5">
                    <label htmlFor="task-title" className="label">
                      New task
                    </label>
                    <input
                      id="task-title"
                      className="input"
                      value={taskForm.title}
                      onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                      placeholder="e.g. Store 7 days of drinking water"
                    />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        className="select"
                        value={taskForm.priority}
                        onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}
                        aria-label="Task priority"
                      >
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                      </select>
                      <input
                        type="date"
                        className="input"
                        value={taskForm.dueDate}
                        onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })}
                        aria-label="Task deadline"
                      />
                    </div>
                    <button type="submit" className="btn-primary btn-sm mt-2.5 w-full" disabled={busy === 'add-task'}>
                      {busy === 'add-task' ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Add task
                        </>
                      )}
                    </button>
                  </form>

                  {selected.tasks.length ? (
                    <ul className="mt-4 space-y-2">
                      {selected.tasks.map((task) =>
                        editingTask && editingTask._id === task._id ? (
                          <li key={task._id}>
                            <form
                              onSubmit={saveTaskEdit}
                              className="rounded-xl border border-forest-200 bg-forest-50/50 p-3"
                            >
                              <input
                                className="input"
                                value={editingTask.title}
                                onChange={(event) =>
                                  setEditingTask({ ...editingTask, title: event.target.value })
                                }
                                aria-label="Task title"
                              />
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <select
                                  className="select"
                                  value={editingTask.priority}
                                  onChange={(event) =>
                                    setEditingTask({ ...editingTask, priority: event.target.value })
                                  }
                                  aria-label="Task priority"
                                >
                                  <option value="low">Low priority</option>
                                  <option value="medium">Medium priority</option>
                                  <option value="high">High priority</option>
                                </select>
                                <input
                                  type="date"
                                  className="input"
                                  value={editingTask.dueDate || ''}
                                  onChange={(event) =>
                                    setEditingTask({ ...editingTask, dueDate: event.target.value })
                                  }
                                  aria-label="Task deadline"
                                />
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button type="submit" className="btn-primary btn-sm" disabled={busy === 'tasks'}>
                                  <Check className="h-3.5 w-3.5" /> Save
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost btn-sm"
                                  onClick={() => setEditingTask(null)}
                                >
                                  <X className="h-3.5 w-3.5" /> Cancel
                                </button>
                              </div>
                            </form>
                          </li>
                        ) : (
                          <li
                            key={task._id}
                            className="flex items-start gap-3 rounded-xl border border-line px-3.5 py-3"
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-line text-forest-600 focus:ring-forest-300"
                              checked={task.completed}
                              onChange={() => toggleTask(task)}
                              disabled={busy === 'tasks'}
                              aria-label={`Mark "${task.title}" complete`}
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm ${
                                  task.completed ? 'text-muted line-through' : 'font-medium text-ink'
                                }`}
                              >
                                {task.title}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                                <span
                                  className={`rounded-full border px-2 py-0.5 font-semibold capitalize ${
                                    PRIORITY_STYLES[task.priority]
                                  }`}
                                >
                                  {task.priority}
                                </span>
                                <span className="text-muted">Due {formatDate(task.dueDate)}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-forest-700"
                                onClick={() =>
                                  setEditingTask({
                                    _id: task._id,
                                    title: task.title,
                                    priority: task.priority,
                                    dueDate: toInputDate(task.dueDate),
                                  })
                                }
                                aria-label={`Edit "${task.title}"`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                                onClick={() => deleteTask(task)}
                                aria-label={`Delete "${task.title}"`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="mt-4 rounded-xl bg-canvas px-3 py-4 text-sm text-muted">
                      No tasks yet. Add one above or borrow a suggested action below.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="card">
                <EmptyState
                  icon={ClipboardList}
                  title="Create your first plan"
                  description="Plans hold tasks, priorities and deadlines. Create one on the left to start tracking your household preparation."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested actions */}
      <section className="mt-10">
        <h2 className="text-xl font-bold">Suggested actions</h2>
        <p className="mt-1 text-sm text-muted">
          Practical starting points for each hazard. Add one to {selected ? `"${selected.title}"` : 'a plan'} with a single click.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SUGGESTIONS.map((group) => (
            <div key={group.hazard} className="card">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf text-forest-700">
                  <group.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-bold">{group.hazard}</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start justify-between gap-2">
                    <span className="text-xs leading-relaxed text-muted">{item}</span>
                    <button
                      type="button"
                      onClick={() => addSuggestedTask(item)}
                      className="mt-0.5 shrink-0 rounded-lg p-1 text-forest-700 hover:bg-forest-50"
                      aria-label={`Add "${item}" to the selected plan`}
                      title="Add to selected plan"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <RelatedTools current="planner" />
    </div>
  );
}
