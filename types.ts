export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Member {
  id: string;
  name: string;
  avatarUrl?: string; // Added for avatar support
  totalPaid: number;
  balance: number; // + means receives, - means pays
}

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENT';

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  paidByMemberId: string;
  splitAmongMemberIds: string[]; // IDs of members involved (for all types)
  splitType?: SplitType; // Defaults to EQUAL if undefined for backward compatibility
  splitValues?: { [memberId: string]: number }; // Stores exact amounts or percentages based on type
  date: string; // ISO string
}

export interface Trip {
  id: string;
  name: string;
  totalExpense: number;
  members: Member[];
  expenses: Expense[];
  currency: string;
  createdBy: string;
  createdAt: number;
}

export interface Debt {
  from: string; // Member Name
  to: string; // Member Name
  amount: number;
}

export type ViewState = 'HOME' | 'TRIP_DASHBOARD' | 'TRIP_BALANCE' | 'ADD_EXPENSE' | 'ADD_MEMBER' | 'CREATE_TRIP';