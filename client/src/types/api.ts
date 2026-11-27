export interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

// From GET /mess/my — flattened MessMember with mess fields
export interface MessListItem {
  id: string
  name: string
  description: string | null
  address: string | null
  createdAt: string
  updatedAt: string
  role: "MANAGER" | "MEMBER"
  membershipId: string
  memberCount: number
}

// From GET /mess/:messId
export interface MessDetail {
  id: string
  name: string
  description: string | null
  address: string | null
  createdAt: string
  updatedAt: string
  membership: {
    id: string
    role: "MANAGER" | "MEMBER"
    rentAmount: number
  }
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

// Auth specific
export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  token: string
  password: string
}

export interface AuthResponse {
  user: User
}

// Mess specific
export interface CreateMessInput {
  name: string
  description?: string
  address?: string
  rentAmount?: number
}

export interface MessMember {
  id: string
  role: "MANAGER" | "MEMBER"
  rentAmount: number
  isActive: boolean
  joinedAt: string
  leftAt: string | null
  user: { id: string; name: string; email: string }
}

export interface InviteMemberInput {
  email: string
}

// Meals — one row per member per day
export interface MealEntry {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  count: number
}

export interface MealEntryInput {
  userId: string
  date: string
  count: number
}

// Expenses
export type ExpenseKind = "MEAL" | "HOUSE"
export type ExpenseCategory =
  | "BAZAR"
  | "ELECTRICITY"
  | "GAS"
  | "WATER"
  | "INTERNET"
  | "MAID"
  | "SERVICE"
  | "OTHER"

export interface ExpenseShare {
  userId: string
  amount: number
}

export interface Expense {
  id: string
  messId: string
  kind: ExpenseKind
  category: ExpenseCategory
  title: string
  description: string | null
  amount: number
  date: string
  shares: ExpenseShare[]
  paidById: string | null
  paidBy: { id: string; name: string } | null
  recorder: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

export interface ExpenseInput {
  kind: ExpenseKind
  category: ExpenseCategory
  title: string
  description?: string | null
  amount: number
  date: string
  paidById: string | null
  shares?: ExpenseShare[]
}

// Deposits
export type PaymentMethod = "CASH" | "BKASH" | "NAGAD" | "ROCKET" | "BANK" | "OTHER"

export interface Deposit {
  id: string
  messId: string
  userId: string
  amount: number
  method: PaymentMethod
  note: string | null
  date: string
  month: number
  year: number
  createdAt: string
  user: { id: string; name: string }
  recorder: { id: string; name: string }
}

export interface DepositInput {
  userId: string
  amount: number
  date: string
  method: PaymentMethod
  note?: string | null
  month?: number
  year?: number
}

// Month summary
export interface MemberAccount {
  userId: string
  name: string | null
  email: string | null
  isMember: boolean
  mealCount: number
  mealCost: number
  rent: number
  houseShare: number
  totalCharge: number
  expenseCredit: number
  deposit: number
  totalPaid: number
  balance: number // negative = owes, positive = gets money back
}

export interface MonthSummary {
  year: number
  month: number
  status: "OPEN" | "CLOSED"
  closedAt: string | null
  totals: {
    totalMeals: number
    mealExpense: number
    mealRate: number
    houseExpense: number
    totalRent: number
    totalCharge: number
    totalDeposits: number
    fundSpent?: number
    cashInHand?: number
  }
  members: MemberAccount[]
  warnings: string[]
}

export interface ClosedMonth {
  year: number
  month: number
  closedAt: string
  totalMeals: number
  mealRate: number
  totalCharge: number
  myCharge: number
  myBalance: number
}

// Invitation specific — matches backend response
export interface Invitation {
  id: string
  email: string
  status: InvitationStatus
  expiresAt: string
  createdAt: string
  // Only on the manager's list / right after sending
  inviteUrl?: string
  emailSent?: boolean
  mess: {
    id: string
    name: string
    description: string | null
    address: string | null
  }
  inviter: {
    id: string
    name: string
    email: string
  }
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED"

// Public preview behind an invite link
export interface InvitationPreview {
  id: string
  email: string
  status: InvitationStatus
  expiresAt: string
  mess: { id: string; name: string; address: string | null }
  inviter: { name: string }
}
