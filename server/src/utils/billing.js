// Pure monthly calculation for a shared mess. No database access, so it can be
// unit tested directly.
//
// For every member of the month:
//   mealCost    = mealCount x mealRate,  where mealRate = bazar total / total meals
//   rent        = the member's own room rent
//   houseShare  = equal share of house bills (or the custom share set on a bill)
//   totalCharge = mealCost + rent + houseShare
//   totalPaid   = bazar/bills paid out of pocket + deposits for the month
//   balance     = totalPaid - totalCharge   (negative = owes, positive = gets back)

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * @param {object} input
 * @param {{userId:string, name?:string, email?:string, rentAmount:number}[]} input.members
 * @param {{userId:string, count:number}[]} input.meals
 * @param {{kind:"MEAL"|"HOUSE", amount:number, paidById?:string|null,
 *          shares?:{userId:string, amount:number}[]}[]} input.expenses
 * @param {{userId:string, amount:number}[]} input.deposits
 */
export const calculateMonth = ({ members, meals = [], expenses = [], deposits = [] }) => {
  const rows = new Map();
  const warnings = [];

  const rowFor = (userId) => {
    if (!rows.has(userId)) {
      // Someone who has data this month but is no longer a member
      rows.set(userId, {
        userId,
        name: null,
        email: null,
        rentAmount: 0,
        mealCount: 0,
        mealCost: 0,
        rent: 0,
        houseShare: 0,
        expenseCredit: 0,
        deposit: 0,
      });
    }
    return rows.get(userId);
  };

  for (const m of members) {
    const row = rowFor(m.userId);
    row.name = m.name ?? null;
    row.email = m.email ?? null;
    row.rent = m.rentAmount || 0;
  }

  const memberIds = members.map((m) => m.userId);

  // Meals
  let totalMeals = 0;
  for (const meal of meals) {
    rowFor(meal.userId).mealCount += meal.count;
    totalMeals += meal.count;
  }

  // Expenses
  let mealExpense = 0;
  let houseExpense = 0;
  let fundSpent = 0;

  for (const e of expenses) {
    if (e.paidById) {
      rowFor(e.paidById).expenseCredit += e.amount;
    } else {
      fundSpent += e.amount;
    }

    if (e.kind === "MEAL") {
      mealExpense += e.amount;
      continue;
    }

    houseExpense += e.amount;

    if (e.shares && e.shares.length > 0) {
      for (const s of e.shares) rowFor(s.userId).houseShare += s.amount;
    } else if (memberIds.length > 0) {
      const each = e.amount / memberIds.length;
      for (const id of memberIds) rowFor(id).houseShare += each;
    } else {
      warnings.push("A house bill could not be split because the mess has no members.");
    }
  }

  const mealRate = totalMeals > 0 ? mealExpense / totalMeals : 0;
  if (mealExpense > 0 && totalMeals === 0) {
    warnings.push("Bazar was recorded but no meals were entered, so the meal rate is 0.");
  }

  // Deposits
  let totalDeposits = 0;
  for (const d of deposits) {
    rowFor(d.userId).deposit += d.amount;
    totalDeposits += d.amount;
  }

  let totalRent = 0;
  const result = [...rows.values()].map((row) => {
    const mealCost = row.mealCount * mealRate;
    const totalCharge = mealCost + row.rent + row.houseShare;
    const totalPaid = row.expenseCredit + row.deposit;
    totalRent += row.rent;

    return {
      userId: row.userId,
      name: row.name,
      email: row.email,
      isMember: memberIds.includes(row.userId),
      mealCount: round2(row.mealCount),
      mealCost: round2(mealCost),
      rent: round2(row.rent),
      houseShare: round2(row.houseShare),
      totalCharge: round2(totalCharge),
      expenseCredit: round2(row.expenseCredit),
      deposit: round2(row.deposit),
      totalPaid: round2(totalPaid),
      balance: round2(totalPaid - totalCharge),
    };
  });

  return {
    totals: {
      totalMeals: round2(totalMeals),
      mealExpense: round2(mealExpense),
      mealRate: round2(mealRate),
      houseExpense: round2(houseExpense),
      totalRent: round2(totalRent),
      totalCharge: round2(mealExpense + houseExpense + totalRent),
      totalDeposits: round2(totalDeposits),
      fundSpent: round2(fundSpent),
      // Cash the manager should be holding (includes rent still to be paid to the landlord)
      cashInHand: round2(totalDeposits - fundSpent),
    },
    members: result,
    warnings,
  };
};
