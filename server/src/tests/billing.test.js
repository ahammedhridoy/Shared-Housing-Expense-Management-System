import { describe, it, expect } from "vitest";
import { calculateMonth } from "../utils/billing.js";

const five = [
  { userId: "rahim", name: "Rahim", rentAmount: 4000 },
  { userId: "karim", name: "Karim", rentAmount: 3000 },
  { userId: "sakib", name: "Sakib", rentAmount: 3000 },
  { userId: "tamim", name: "Tamim", rentAmount: 2500 },
  { userId: "mushfiq", name: "Mushfiq", rentAmount: 2500 },
];

const byId = (result) => Object.fromEntries(result.members.map((m) => [m.userId, m]));

describe("calculateMonth", () => {
  it("keeps bazar (meal rate) separate from rent and house bills", () => {
    const result = calculateMonth({
      members: five,
      meals: [
        { userId: "rahim", count: 20 },
        { userId: "karim", count: 25 },
        { userId: "sakib", count: 15 },
        { userId: "tamim", count: 30 },
        { userId: "mushfiq", count: 10 },
      ],
      expenses: [
        { kind: "MEAL", amount: 1500, paidById: "rahim" },
        { kind: "MEAL", amount: 2500, paidById: "karim" },
        { kind: "HOUSE", amount: 1000 }, // wifi
        { kind: "HOUSE", amount: 1500 }, // electricity
        { kind: "HOUSE", amount: 1000 }, // gas
        { kind: "HOUSE", amount: 500 }, // water
        { kind: "HOUSE", amount: 2000 }, // maid
      ],
      deposits: [{ userId: "rahim", amount: 3000 }],
    });

    expect(result.totals.totalMeals).toBe(100);
    expect(result.totals.mealExpense).toBe(4000);
    expect(result.totals.mealRate).toBe(40);
    expect(result.totals.houseExpense).toBe(6000);
    expect(result.totals.totalRent).toBe(15000);

    const rahim = byId(result).rahim;
    expect(rahim.mealCost).toBe(800);
    expect(rahim.rent).toBe(4000);
    expect(rahim.houseShare).toBe(1200);
    expect(rahim.totalCharge).toBe(6000);
    expect(rahim.expenseCredit).toBe(1500);
    expect(rahim.deposit).toBe(3000);
    expect(rahim.balance).toBe(-1500);

    // Every taka spent is charged exactly once
    const charged = result.members.reduce((s, m) => s + m.totalCharge, 0);
    expect(charged).toBeCloseTo(4000 + 6000 + 15000, 2);
  });

  it("charges rent and house bills to a member who ate no meals", () => {
    const result = calculateMonth({
      members: five.slice(0, 2),
      meals: [{ userId: "rahim", count: 10 }],
      expenses: [
        { kind: "MEAL", amount: 500 },
        { kind: "HOUSE", amount: 1000 },
      ],
    });
    const karim = byId(result).karim;
    expect(karim.mealCost).toBe(0);
    expect(karim.rent).toBe(3000);
    expect(karim.houseShare).toBe(500);
    expect(karim.totalCharge).toBe(3500);
  });

  it("uses custom shares on a house bill instead of an equal split", () => {
    const result = calculateMonth({
      members: five.slice(0, 3),
      expenses: [
        {
          kind: "HOUSE",
          amount: 900,
          shares: [
            { userId: "rahim", amount: 600 },
            { userId: "karim", amount: 300 },
          ],
        },
      ],
    });
    const rows = byId(result);
    expect(rows.rahim.houseShare).toBe(600);
    expect(rows.karim.houseShare).toBe(300);
    expect(rows.sakib.houseShare).toBe(0);
  });

  it("credits out-of-pocket payments and tracks the mess fund", () => {
    const result = calculateMonth({
      members: five.slice(0, 2),
      meals: [
        { userId: "rahim", count: 5 },
        { userId: "karim", count: 5 },
      ],
      expenses: [
        { kind: "MEAL", amount: 1000, paidById: "karim" },
        { kind: "HOUSE", amount: 400, paidById: null },
      ],
      deposits: [
        { userId: "rahim", amount: 2000 },
        { userId: "karim", amount: 1000 },
      ],
    });
    expect(result.totals.totalDeposits).toBe(3000);
    expect(result.totals.fundSpent).toBe(400);
    expect(result.totals.cashInHand).toBe(2600);
    expect(byId(result).karim.totalPaid).toBe(2000);
  });

  it("supports half meals and returns a zero meal rate with a warning when no meals exist", () => {
    const half = calculateMonth({
      members: five.slice(0, 1),
      meals: [{ userId: "rahim", count: 2.5 }],
      expenses: [{ kind: "MEAL", amount: 100 }],
    });
    expect(half.totals.mealRate).toBe(40);
    expect(half.members[0].mealCost).toBe(100);

    const none = calculateMonth({
      members: five.slice(0, 1),
      expenses: [{ kind: "MEAL", amount: 100 }],
    });
    expect(none.totals.mealRate).toBe(0);
    expect(none.warnings.length).toBe(1);
  });

  it("includes a former member who still has data in the month", () => {
    const result = calculateMonth({
      members: five.slice(0, 1),
      meals: [
        { userId: "rahim", count: 5 },
        { userId: "left-user", count: 5 },
      ],
      expenses: [{ kind: "MEAL", amount: 400 }],
    });
    const gone = byId(result)["left-user"];
    expect(gone.isMember).toBe(false);
    expect(gone.mealCost).toBe(200);
    expect(gone.houseShare).toBe(0);
  });
});
