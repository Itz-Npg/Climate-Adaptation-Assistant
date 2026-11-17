function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((item) => item.message);
    return res.status(400).json({ message: errors[0] || 'Invalid data.', errors });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier.' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Something went wrong on the server.' : err.message,
  });
}

module.exports = { notFound, errorHandler };
