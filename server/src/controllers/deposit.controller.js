import { addDeposit, getDeposits, updateDeposit, deleteDeposit } from "../services/deposit.service.js";
import { handle, send } from "../utils/respond.js";

export const addDepositController = handle(async (req, res) => {
  const { userId: payerId, ...rest } = req.body;
  const deposit = await addDeposit({ userId: req.user.userId, messId: req.params.messId, payerId, ...rest });
  send(res, 201, "Deposit recorded successfully", { deposit });
});

export const getDepositsController = handle(async (req, res) => {
  const deposits = await getDeposits({ userId: req.user.userId, messId: req.params.messId, ...req.query });
  send(res, 200, "Deposits fetched successfully", { count: deposits.length, deposits });
});

export const updateDepositController = handle(async (req, res) => {
  const { userId: payerId, ...rest } = req.body;
  const deposit = await updateDeposit({ userId: req.user.userId, ...req.params, payerId, ...rest });
  send(res, 200, "Deposit updated successfully", { deposit });
});

export const deleteDepositController = handle(async (req, res) => {
  await deleteDeposit({ userId: req.user.userId, ...req.params });
  send(res, 200, "Deposit deleted successfully");
});
