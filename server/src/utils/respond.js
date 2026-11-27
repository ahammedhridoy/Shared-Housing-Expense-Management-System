// Wraps an async controller so thrown errors reach the error middleware.
export const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

export const send = (res, status, message, data = null) =>
  res.status(status).json({ success: true, message, data });
