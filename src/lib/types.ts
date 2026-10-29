import type { Status, TicketType } from './constants';

// Shapes returned by the API (dates arrive as ISO strings on the client).
export interface Ticket {
  id: number;
  type: TicketType;
  floor: string;
  area: string;
  location_detail: string | null;
  category: string;
  description: string;
  photo_url: string | null;
  employee_name: string;
  employee_email: string;
  status: Status;
  assigned_to: string | null;
  pending_reason: string | null;
  attended_by: string | null;
  action_taken: string | null;
  closed_by: string | null;
  closed_at: string | null;
  reopen_count: number;
  reopen_token: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  id: number;
  ticket_id: number;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  done_by: string | null;
  created_at: string;
}

export interface Staff {
  id: number;
  name: string;
  active: number;
}

export interface Notification {
  id: number;
  ticket_id: number | null;
  message: string;
  is_read: number;
  created_at: string;
}

export type Role = 'supervisor' | 'admin';
