/**
 * End-to-end security smoke test against a running API.
 * Usage: node scripts/security-check.mjs [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:5000';
// Each run uses its own client IP (the API trusts the proxy header) so repeated
// runs do not inherit the previous run's rate-limit budget.
const TEST_IP = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
const ORIGIN = 'http://localhost:5173';
const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function cookiesFrom(response) {
  const raw = response.headers.getSetCookie?.() || [];
  return raw.map((item) => item.split(';')[0]).join('; ');
}

async function json(path, { method = 'GET', body, cookie, origin = ORIGIN, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      'X-Forwarded-For': TEST_IP,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, cookie: cookiesFrom(res), headers: res.headers };
}

const stamp = Date.now();
const email = `sec${stamp}@example.com`;
const password = 'Demo1234';

// 1. Registration issues a session
const register = await json('/api/auth/register', {
  method: 'POST',
  body: { name: 'Security Tester', email, password },
});
record('register', register.status === 201, `status ${register.status}`);
const sessionCookie = register.cookie;

// 2. NoSQL operator injection is rejected
const injection = await json('/api/auth/login', {
  method: 'POST',
  body: { email: { $gt: '' }, password: 'x' },
});
record('blocks NoSQL operator injection', injection.status === 400, `status ${injection.status}`);

// 3. Cookie-authenticated write without an Origin is refused (CSRF)
const csrf = await json('/api/risks', {
  method: 'POST',
  origin: null,
  cookie: sessionCookie,
  body: {
    city: 'Kochi',
    country: 'India',
    locationType: 'urban',
    housingType: 'independent-house',
    waterBody: 'coast',
    drainage: 'poor',
    climate: 'monsoon',
  },
});
record('blocks cookie write with no origin', csrf.status === 403, `status ${csrf.status}`);

// 4. Disallowed origin is refused
const evil = await json('/api/risks', {
  method: 'POST',
  origin: 'https://evil.example',
  cookie: sessionCookie,
  body: {
    city: 'Kochi',
    country: 'India',
    locationType: 'urban',
    housingType: 'independent-house',
    waterBody: 'coast',
    drainage: 'poor',
    climate: 'monsoon',
  },
});
record('blocks cross-origin write', evil.status === 403, `status ${evil.status}`);

// 5. Valid assessment uses live data
const assessment = await json('/api/risks', {
  method: 'POST',
  cookie: sessionCookie,
  body: {
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    locationType: 'coastal',
    housingType: 'independent-house',
    waterBody: 'coast',
    drainage: 'poor',
    climate: 'monsoon',
  },
});
record('creates assessment', assessment.status === 201, `status ${assessment.status}`);
record(
  'uses live Open-Meteo conditions',
  String(assessment.data?.assessment?.dataSource || '').includes('live'),
  assessment.data?.assessment?.dataSource || 'none'
);
record(
  'reports live factor',
  (assessment.data?.assessment?.factors || []).some((factor) => /Live temperature|Live humidity|Rain in the last/i.test(factor.label)),
  ''
);

// 6. Object-level authorisation: another user cannot read this record
const other = await json('/api/auth/register', {
  method: 'POST',
  body: { name: 'Other User', email: `other${stamp}@example.com`, password },
});
const otherId = assessment.data?.assessment?._id;
const steal = await json(`/api/risks/${otherId}`, { cookie: other.cookie });
record('blocks cross-user record access', steal.status === 404, `status ${steal.status}`);

// 7. Security headers present
const health = await json('/api/health');
record(
  'CSP header present',
  Boolean(health.headers.get('content-security-policy')),
  health.headers.get('content-security-policy')?.slice(0, 40) || 'none'
);
record('X-Powered-By removed', !health.headers.get('x-powered-by'));
record('nosniff header', health.headers.get('x-content-type-options') === 'nosniff');

// 8. MFA enrolment + login challenge
const setup = await json('/api/auth/mfa/setup', { method: 'POST', cookie: sessionCookie });
record('starts MFA setup', setup.status === 200 && Boolean(setup.data?.secret), `status ${setup.status}`);

const { generateTotp } = await import('../server/services/totp.js');
const code = setup.data?.secret ? generateTotp(setup.data.secret) : '';
const enable = await json('/api/auth/mfa/enable', {
  method: 'POST',
  cookie: sessionCookie,
  body: { code },
});
record(
  'enables MFA with a valid TOTP',
  enable.status === 200 && Array.isArray(enable.data?.backupCodes),
  `status ${enable.status}`
);

const loginWithMfa = await json('/api/auth/login', {
  method: 'POST',
  body: { email, password },
});
record(
  'requires a second factor at login',
  loginWithMfa.status === 200 && loginWithMfa.data?.mfaRequired === true,
  `status ${loginWithMfa.status}`
);

const verify = await json('/api/auth/mfa/verify', {
  method: 'POST',
  body: { challenge: loginWithMfa.data?.challenge, code: generateTotp(setup.data?.secret) },
});
record('verifies MFA and issues a session', verify.status === 200 && Boolean(verify.data?.user), `status ${verify.status}`);

const badCode = await json('/api/auth/mfa/verify', {
  method: 'POST',
  body: { challenge: loginWithMfa.data?.challenge, code: '000000' },
});
record('rejects an invalid MFA code', badCode.status === 401, `status ${badCode.status}`);

// 10. Live geo API still works
const geo = await json('/api/geo/search?q=Shimla&count=1');
record('geo search works', geo.status === 200 && geo.data?.results?.length > 0, `status ${geo.status}`);

// 11. Admin panel authorisation (requires the seeded demo admin)
const adminLogin = await json('/api/auth/login', {
  method: 'POST',
  body: { email: 'demo@example.com', password: 'Demo1234' },
});
const isAdmin = adminLogin.status === 200 && adminLogin.data?.user?.role === 'admin';
record('demo admin can sign in', isAdmin, `status ${adminLogin.status}`);

if (isAdmin) {
  const adminUsers = await json('/api/admin/users', { cookie: adminLogin.cookie });
  record(
    'admin can list users',
    adminUsers.status === 200 && Array.isArray(adminUsers.data?.users),
    `status ${adminUsers.status}`
  );
  record(
    'admin payload exposes no secrets',
    !/passwordHash|mfaSecret|mfaBackupCodes|resetToken/.test(JSON.stringify(adminUsers.data || {})),
    ''
  );

  const forbidden = await json('/api/admin/users', { cookie: sessionCookie });
  record('blocks non-admin access', forbidden.status === 403, `status ${forbidden.status}`);

  const adminId = adminLogin.data.user.id;
  const selfRole = await json(`/api/admin/users/${adminId}/role`, {
    method: 'PATCH',
    cookie: adminLogin.cookie,
    body: { role: 'user' },
  });
  record('blocks self role change', selfRole.status === 400, `status ${selfRole.status}`);

  const selfDelete = await json(`/api/admin/users/${adminId}`, {
    method: 'DELETE',
    cookie: adminLogin.cookie,
  });
  record('blocks self deletion', selfDelete.status === 400, `status ${selfDelete.status}`);

  const badId = await json('/api/admin/users/not-a-real-id', { cookie: adminLogin.cookie });
  record('validates user ids', badId.status === 400, `status ${badId.status}`);

  const badRole = await json(`/api/admin/users/${adminId}/role`, {
    method: 'PATCH',
    cookie: adminLogin.cookie,
    body: { role: 'superuser' },
  });
  record('rejects unknown roles', badRole.status === 400, `status ${badRole.status}`);
}

// 12. Rate limiting on login (runs last: it consumes the failed-attempt budget)
let limited = 0;
for (let index = 0; index < 26; index += 1) {
  const attempt = await json('/api/auth/login', {
    method: 'POST',
    body: { email: `none${index}@example.com`, password: 'WrongPass1' },
  });
  if (attempt.status === 429) {
    limited = index;
    break;
  }
}
record('rate limits login attempts', limited > 0, limited ? `429 after ${limited} attempts` : 'never limited');

const failed = results.filter((item) => !item.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
