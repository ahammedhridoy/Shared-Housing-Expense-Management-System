import { getMonthSummary, closeMonth, reopenMonth, listClosedMonths } from "../services/month.service.js";
import { handle, send } from "../utils/respond.js";

export const getMonthSummaryController = handle(async (req, res) => {
  const summary = await getMonthSummary({ userId: req.user.userId, ...req.params });
  send(res, 200, "Month summary fetched successfully", { summary });
});

export const closeMonthController = handle(async (req, res) => {
  const summary = await closeMonth({ userId: req.user.userId, ...req.params });
  send(res, 200, "Month closed successfully", { summary });
});

export const reopenMonthController = handle(async (req, res) => {
  const summary = await reopenMonth({ userId: req.user.userId, ...req.params });
  send(res, 200, "Month reopened successfully", { summary });
});

export const listClosedMonthsController = handle(async (req, res) => {
  const months = await listClosedMonths({ userId: req.user.userId, messId: req.params.messId });
  send(res, 200, "Closed months fetched successfully", { months });
});
