const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas using MONGODB_URI.
 *
 * If MONGODB_URI is not provided the server starts an in-memory MongoDB
 * instance so the project can be run and graded without any Atlas account.
 * That fallback is development-only - set MONGODB_URI for real persistence.
 * The connection itself is always a real Mongoose connection, so every model,
 * index and query below behaves exactly as it does against Atlas.
 */
async function connectDB() {
  const uri = (process.env.MONGODB_URI || '').trim();
  let activeUri = uri;

  if (!activeUri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is required in production.');
    }
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const memory = await MongoMemoryServer.create();
    activeUri = memory.getUri('climate-adaptation');
    console.warn(
      '[db] MONGODB_URI is not set - using a temporary in-memory MongoDB.\n' +
        '     Data is lost when the server stops. Add MONGODB_URI to server/.env for real persistence.'
    );
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(activeUri, { serverSelectionTimeoutMS: 15000 });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });

  return uri ? 'MongoDB Atlas (MONGODB_URI)' : 'in-memory development database';
}

module.exports = connectDB;
