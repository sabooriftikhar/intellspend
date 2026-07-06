export type AccountType = 'bank' | 'cash' | 'credit_card';
export type TransactionKind = 'income' | 'expense' | 'transfer';
export type CategoryKind = 'income' | 'expense';

export interface Book {
  id: number;
  name: string;
  description?: string | null;
  user_id: number;
}

export interface Account {
  id: number;
  user_id: number;
  book_ids: number[];
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  credit_limit?: number | null;
  statement_day?: number | null;
  due_day?: number | null;
}

export interface AccountBalance {
  balance: number;
  currency: string;
}

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
  icon?: string | null;
  color?: string | null;
  book_id?: number | null;
}

export interface Transaction {
  id: number;
  book_id: number;
  account_id: number;
  category_id?: number | null;
  kind: TransactionKind;
  amount: number;
  currency: string;
  description: string;
  occurred_on: string;
  transfer_to_account_id?: number | null;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

// ── Bills ──────────────────────────────────────────────────────
export type BillRecurrence = 'monthly' | 'once';
export type BillStatus = 'pending' | 'done';

export interface Bill {
  id: number;
  book_id: number;
  category_id?: number | null;
  name: string;
  due_day_of_month: number;
  due_date?: string | null;       // ISO date "YYYY-MM-DD"
  bill_month?: string | null;     // "YYYY-MM"
  estimated_amount: number;
  recurrence: BillRecurrence;
  status: BillStatus;
  linked_transaction_id?: number | null;
}

// ── Chat ───────────────────────────────────────────────────────
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  created_at: string;
}
