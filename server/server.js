const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const riskRoutes = require('./routes/riskRoutes');
const planRoutes = require('./routes/planRoutes');
const comparisonRoutes = require('./routes/comparisonRoutes');
const geoRoutes = require('./routes/geoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { blockInjection, csrfProtection, rateLimit, getAllowedOrigins } = require('./middleware/security');
const { assertJwtSecret } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const allowedOrigins = getAllowedOrigins();
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- Security headers (helmet): CSP, HSTS in production, no sniffing, no framing.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://server.arcgisonline.com',
          'https://*.basemaps.cartocdn.com',
          'https://*.tile.opentopomap.org',
        ],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : { upgradeInsecureRequests: null }),
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// --- Strict CORS: only the configured client origins, cookies allowed.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());

// Injection guard, CSRF origin validation and a global API rate limit.
app.use('/api', blockInjection);
app.use('/api', csrfProtection);
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 600, keyPrefix: 'api' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/admin', adminRoutes);

// In production the built React app is served from the same origin.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(
  express.static(clientDist, {
    index: false,
    maxAge: isProduction ? '1y' : 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store');
    },
  })
);

app.get(/^\/(?!api).*/, (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    assertJwtSecret();
  } catch (error) {
    console.error(`[server] ${error.message}`);
    process.exit(1);
  }

  try {
    const info = await connectDB();
    app.listen(PORT, () => {
      console.log(`[server] Climate Adaptation Assistant API listening on http://localhost:${PORT}`);
      console.log(`[server] Database: ${info}`);
      console.log(`[server] Allowed origins: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('[server] Failed to start:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
