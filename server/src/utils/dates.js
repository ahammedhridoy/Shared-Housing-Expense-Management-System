import AppError from "./AppError.js";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// "2026-11-05" -> Date at 2026-11-05T00:00:00.000Z
// Calendar days are stored as UTC midnight so a day never shifts with the
// server's or the browser's timezone.
export const parseDay = (value, label = "Date") => {
  const match = DATE_ONLY.exec(value ?? "");
  if (!match) {
    throw new AppError(`${label} must be in YYYY-MM-DD format`, 400);
  }
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new AppError(`${label} is not a valid calendar date`, 400);
  }
  return date;
};

export const formatDay = (date) => date.toISOString().slice(0, 10);

// [start, end) range covering a calendar month
export const monthRange = (year, month) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});

export const monthOf = (date) => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
});

export const currentMonth = () => monthOf(new Date());
