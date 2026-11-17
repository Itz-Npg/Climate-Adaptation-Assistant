/**
 * Seeds the demo account with realistic sample data through the public API,
 * so it works against the in-memory dev database and MongoDB Atlas alike.
 *
 *   node scripts/seed-demo.mjs               # create demo data if missing
 *   node scripts/seed-demo.mjs --reset       # replace the demo data
 *   node scripts/seed-demo.mjs --base=http://localhost:5000
 *
 * Demo credentials: demo@example.com / Demo1234
 */
const args = process.argv.slice(2);
const BASE =
  args.find((arg) => arg.startsWith('--base='))?.split('=')[1] ||
  process.env.API_URL ||
  'http://localhost:5000';
const RESET = args.includes('--reset');
const ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';

const DEMO = { name: 'Demo User', email: 'demo@example.com', password: 'Demo1234' };

let cookie = '';

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookie = response.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((item) => item.split(';')[0]).join('; ');

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

const assessments = [
  {
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    locationType: 'coastal',
    housingType: 'independent-house',
    waterBody: 'coast',
    drainage: 'moderate',
    climate: 'monsoon',
    averageTemperature: 29,
  },
  {
    city: 'Phagwara',
    state: 'Punjab',
    country: 'India',
    locationType: 'urban',
    housingType: 'independent-house',
    waterBody: 'groundwater',
    drainage: 'poor',
    climate: 'hot-dry',
    averageTemperature: 34,
  },
  {
    city: 'Shimla',
    state: 'Himachal Pradesh',
    country: 'India',
    locationType: 'suburban',
    housingType: 'apartment',
    waterBody: 'river',
    drainage: 'good',
    climate: 'cold',
    averageTemperature: 14,
  },
];

const plan = {
  title: 'Monsoon and heat readiness for the household',
  description:
    'A practical six-week plan covering water storage, documents, drainage and a family contact routine.',
  priority: 'high',
  dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
  tasks: [
    { title: 'Store 7 days of drinking water in covered containers', priority: 'high', completed: true },
    { title: 'Pack documents and medicines in a waterproof bag', priority: 'high', completed: true },
    { title: 'Clear roof gutters and check the drain outside the gate', priority: 'medium', completed: false },
    { title: 'Agree on a family meeting point and out-of-area contact', priority: 'high', completed: false },
    { title: 'Install shade cloth over the west-facing window', priority: 'low', completed: false },
  ],
};

const comparison = {
  locations: [
    {
      city: 'Kochi',
      state: 'Kerala',
      country: 'India',
      locationType: 'coastal',
      climate: 'monsoon',
    },
    {
      city: 'Shimla',
      state: 'Himachal Pradesh',
      country: 'India',
      locationType: 'suburban',
      climate: 'cold',
    },
  ],
};

async function authenticate() {
  let result = await api('/api/auth/register', { method: 'POST', body: DEMO });

  if (result.status === 409) {
    result = await api('/api/auth/login', {
      method: 'POST',
      body: { email: DEMO.email, password: DEMO.password },
    });
  }

  if (result.status === 401 && result.data?.mfaRequired) {
    console.error('This demo account has two-factor authentication enabled. Turn it off first.');
    process.exit(1);
  }

  if (result.status >= 400) {
    console.error(`Could not sign in as the demo user (status ${result.status}).`);
    console.error(result.data?.message || '');
    process.exit(1);
  }

  return result.data.user;
}

async function clearExisting() {
  const [risks, plans, comparisons] = await Promise.all([
    api('/api/risks'),
    api('/api/plans'),
    api('/api/comparisons'),
  ]);

  const ids = [
    ...(risks.data?.assessments || []).map((item) => ['/api/risks/', item._id]),
    ...(plans.data?.plans || []).map((item) => ['/api/plans/', item._id]),
    ...(comparisons.data?.comparisons || []).map((item) => ['/api/comparisons/', item._id]),
  ];

  for (const [path, id] of ids) {
    await api(`${path}${id}`, { method: 'DELETE' });
  }
  return ids.length;
}

async function main() {
  console.log(`Seeding demo data via ${BASE}`);

  const user = await authenticate();
  console.log(`Signed in as ${user.email} (${user.role || 'user'})`);

  const existing = await Promise.all([api('/api/risks'), api('/api/plans'), api('/api/comparisons')]);
  const hasData =
    (existing[0].data?.assessments?.length || 0) +
      (existing[1].data?.plans?.length || 0) +
      (existing[2].data?.comparisons?.length || 0) >
    0;

  if (hasData && !RESET) {
    console.log('Demo account already has data — pass --reset to replace it.');
    return;
  }
  if (hasData) {
    const removed = await clearExisting();
    console.log(`Removed ${removed} existing demo records.`);
  }

  for (const assessment of assessments) {
    const result = await api('/api/risks', { method: 'POST', body: assessment });
    const source = result.data?.assessment?.dataSource || 'unknown';
    console.log(
      `${result.status === 201 ? 'created' : 'failed '} assessment for ${assessment.city} (${source})`
    );
  }

  const createdPlan = await api('/api/plans', { method: 'POST', body: plan });
  console.log(`${createdPlan.status === 201 ? 'created' : 'failed '} plan "${plan.title}"`);

  const createdComparison = await api('/api/comparisons', { method: 'POST', body: comparison });
  console.log(
    `${createdComparison.status === 201 ? 'created' : 'failed '} comparison Kochi vs Shimla`
  );

  console.log('\nDemo login: demo@example.com / Demo1234');
  if (user.role === 'admin') {
    console.log('This account can open the admin panel at /admin.');
  } else {
    console.log('Tip: add demo@example.com to ADMIN_EMAILS in server/.env to demo the admin panel.');
  }
}

main().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
