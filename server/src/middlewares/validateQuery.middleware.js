import AppError from "../utils/AppError.js";

const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    return next(new AppError(message, 400));
  }

  req.query = result.data;
  next();
};

export default validateQuery;
