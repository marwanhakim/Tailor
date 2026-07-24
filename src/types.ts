export type TabType = 'customers' | 'accounts' | 'orders' | 'history' | 'settings';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  createdAt: number;
  measurements?: {
    shoulder?: string;
    bust?: string;
    waist?: string;
    hips?: string;
    sleeve?: string;
    yokeLength?: string;
    skirtLength?: string;
    dressLength?: string;
    pantsLength?: string;
  };
}

export interface Account {
  id: string;
  customerId: string;
  customerName?: string;
  type: 'payable' | 'receivable'; // payable (لهم) or receivable (عليهم)
  amount: number;
  description: string;
  date: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  description: string;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'completed' | 'cancelled';
  price: number;
  date: number;
  deliveryDate?: number;
  photo?: string;
  measurements?: {
    shoulder?: string;
    bust?: string;
    waist?: string;
    hips?: string;
    sleeve?: string;
    yokeLength?: string;
    skirtLength?: string;
    dressLength?: string;
    pantsLength?: string;
  };
}

export interface LogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: number;
}
