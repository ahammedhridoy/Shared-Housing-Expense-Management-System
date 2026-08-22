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

export interface AuthResponse {
  user: User
}

// Mess specific
export interface CreateMessInput {
  name: string
  description?: string
}

export interface InviteMemberInput {
  email: string
}

// Meal specific — matches backend Prisma select
export interface Meal {
  id: string
  userId: string
  messId: string
  date: string
  type: "BREAKFAST" | "LUNCH" | "DINNER"
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface LogMealInput {
  userId: string
  date: string
  type: "BREAKFAST" | "LUNCH" | "DINNER"
  quantity: number
}

// Expense specific — matches backend Prisma select
export interface Expense {
  id: string
  messId: string
  recordedBy: string
  title: string
  description: string | null
  amount: number
  category: string
  date: string
  createdAt: string
  updatedAt: string
}

export interface CreateExpenseInput {
  title: string
  description?: string
  amount: number
  category: string
  date: string
}

// Payment specific — matches backend Prisma select
export interface Payment {
  id: string
  messId: string
  userId: string
  recordedBy: string
  amount: number
  date: string
  method: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentInput {
  payerId: string
  amount: number
  date: string
  method: string
  note?: string
}

// MonthlyBill specific — matches backend Prisma select
export interface MonthlyBill {
  id: string
  messId: string
  month: number
  year: number
  totalMeals: number
  totalExpense: number
  mealRate: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface GenerateBillInput {
  month: number
  year: number
}

// Settlement specific — matches backend Prisma select
export interface Settlement {
  id: string
  billId: string
  userId: string
  mealCount: number
  mealCost: number
  expenseShare: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface CreateSettlementInput {
  amount: number
  method?: string
}

// Invitation specific — matches backend response
export interface Invitation {
  id: string
  email: string
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED"
  expiresAt: string
  createdAt: string
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
