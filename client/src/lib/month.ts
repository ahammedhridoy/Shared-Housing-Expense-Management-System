import { create } from "zustand"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export const monthLabel = (year: number, month: number) => `${MONTHS[month - 1]} ${year}`
export const shortMonthLabel = (year: number, month: number) => `${MONTHS[month - 1].slice(0, 3)} ${year}`

const pad = (n: number) => String(n).padStart(2, "0")

// Local calendar date as YYYY-MM-DD (what the user means by "today")
export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayDay = () => toDay(new Date())
export const dayOf = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`
export const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()

// "2026-11-05" -> "5 Nov"
export const formatDay = (day: string) => {
  const [, m, d] = day.split("-").map(Number)
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`
}

export const weekdayOf = (day: string) => {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" })
}

// A sensible default date inside the selected month: today if it's this month, else the 1st
export const defaultDayFor = (year: number, month: number) => {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() + 1 === month ? toDay(now) : dayOf(year, month, 1)
}

export const isCurrentMonth = (year: number, month: number) => {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() + 1 === month
}

interface MonthState {
  year: number
  month: number
  setMonth: (year: number, month: number) => void
  shift: (delta: number) => void
}

// The month selected on mess pages; shared so it stays the same when switching tabs
export const useMonthStore = create<MonthState>((set) => {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    setMonth: (year, month) => set({ year, month }),
    shift: (delta) =>
      set((s) => {
        const d = new Date(s.year, s.month - 1 + delta, 1)
        return { year: d.getFullYear(), month: d.getMonth() + 1 }
      }),
  }
})
