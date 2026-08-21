import AppError from "../utils/AppError.js";

const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);

  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    return next(new AppError(message, 400));
  }

  req.params = result.data;
  next();
};

export default validateParams;
