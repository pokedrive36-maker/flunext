
export interface Expense {
  id: string;
  description: string;
  value: number;
}

export interface Order {
  id: string;
  clientName: string;
  date: string; // ISO String
  status: string; // Changed from Enum to string for dynamic stages
  description: string;
  grossValue: number;
  expenses: Expense[];
}

export interface FixedExpense {
  id: string;
  description: string;
  value: number;
  month: string; // Format: YYYY-MM
}

export type TabView = 'orders' | 'production' | 'financial';
