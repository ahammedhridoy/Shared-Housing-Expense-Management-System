// One-time migration from the old data model to the new one.
// Run BEFORE `npm run push` (the new unique meal index needs merged data):
//
//   npm run migrate:v2
//   npm run push
//
// Safe to run more than once: every step checks whether it is still needed.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const run = (cmd) => prisma.$runCommandRaw(cmd);
const count = async (collection, query = {}) => (await run({ count: collection, query })).n;
const day = (field) => ({ $dateTrunc: { date: field, unit: "day", timezone: "UTC" } });

const step = async (name, fn) => {
  process.stdout.write(`- ${name} ... `);
  console.log(await fn());
};

try {
  await step("Members: add rent, active flag, join date", async () => {
    const r = await run({
      update: "MessMember",
      updates: [
        {
          q: { isActive: { $exists: false } },
          u: [{ $set: { rentAmount: 0, isActive: true, joinedAt: "$createdAt", leftAt: null } }],
          multi: true,
        },
      ],
    });
    return `${r.nModified} updated`;
  });

  await step("Meals: merge breakfast/lunch/dinner rows into one row per member per day", async () => {
    if ((await count("Meal", { type: { $exists: true } })) === 0) return "already done";
    await run({
      aggregate: "Meal",
      pipeline: [
        {
          $group: {
            _id: { messId: "$messId", userId: "$userId", date: day("$date") },
            count: { $sum: { $ifNull: ["$quantity", 1] } },
            createdAt: { $min: "$createdAt" },
          },
        },
        {
          $project: {
            _id: 0,
            messId: "$_id.messId",
            userId: "$_id.userId",
            date: "$_id.date",
            count: 1,
            createdAt: 1,
            updatedAt: "$$NOW",
          },
        },
        { $out: "Meal" },
      ],
      cursor: {},
    });
    return `${await count("Meal")} daily rows`;
  });

  await step("Expenses: split into bazar (MEAL) and house bills (HOUSE)", async () => {
    if ((await count("Expense", { kind: { $exists: false } })) === 0) return "already done";
    const rentCount = await count("Expense", { category: "RENT" });
    const r = await run({
      update: "Expense",
      updates: [
        {
          q: { kind: { $exists: false } },
          u: [
            {
              $set: {
                kind: { $cond: [{ $eq: ["$category", "FOOD"] }, "MEAL", "HOUSE"] },
                category: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$category", "FOOD"] }, then: "BAZAR" },
                      { case: { $eq: ["$category", "MAID_COST"] }, then: "MAID" },
                      { case: { $eq: ["$category", "MAINTENANCE"] }, then: "SERVICE" },
                      { case: { $eq: ["$category", "RENT"] }, then: "OTHER" },
                    ],
                    default: "$category",
                  },
                },
                date: day("$date"),
                paidById: null,
                shares: [],
              },
            },
          ],
          multi: true,
        },
      ],
    });
    const note = rentCount
      ? ` (WARNING: ${rentCount} old RENT expense(s) became house bills - rent now comes from each member's room rent, so review/delete them)`
      : "";
    return `${r.nModified} converted${note}`;
  });

  await step("Payments -> Deposits", async () => {
    if ((await count("Payment")) === 0) return "nothing to move";
    if ((await count("Deposit")) > 0) return "already done";
    await run({
      aggregate: "Payment",
      pipeline: [
        {
          $project: {
            _id: 1,
            messId: 1,
            userId: 1,
            recordedBy: { $ifNull: ["$recordedBy", "$userId"] },
            amount: 1,
            method: "CASH",
            note: { $ifNull: ["$note", null] },
            date: day("$date"),
            month: { $month: "$date" },
            year: { $year: "$date" },
            createdAt: 1,
            updatedAt: "$$NOW",
          },
        },
        { $merge: { into: "Deposit", whenMatched: "keepExisting" } },
      ],
      cursor: {},
    });
    return `${await count("Deposit")} deposits (old Payment collection left untouched)`;
  });

  await step("Old monthly bills: remove (they used the wrong formula; months are recalculated live)", async () => {
    const old = await run({
      find: "MonthlyBill",
      filter: { totalExpense: { $exists: true } },
      projection: { _id: 1 },
      batchSize: 10000,
    });
    const ids = old.cursor.firstBatch.map((b) => b._id);
    if (ids.length === 0) return "none";
    await run({ delete: "Settlement", deletes: [{ q: { billId: { $in: ids } }, limit: 0 }] });
    await run({ delete: "MonthlyBill", deletes: [{ q: { _id: { $in: ids } }, limit: 0 }] });
    return `${ids.length} removed - close those months again from the app`;
  });

  console.log("\nDone. Now run: npm run push");
} catch (error) {
  console.error("\nMigration failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
