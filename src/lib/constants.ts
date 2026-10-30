export const TICKET_TYPES = ['Complaint', 'Requirement', 'Suggestion'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const FLOORS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'] as const;

export const AREAS = [
  'Washroom (Gents)',
  'Washroom (Ladies)',
  'Pantry',
  'Workstations',
  'Cabin',
  'Conference Room',
  'Corridor / Passage',
  'Reception / Lobby',
  'Lift Area',
  'Staircase',
  'Store Room',
  'Entire Floor / General',
  'Other',
] as const;

export const CATEGORIES = [
  { name: 'Washrooms & Hygiene', icon: '🚻', hint: 'Unclean toilets, odour, soap, tissues' },
  { name: 'Housekeeping', icon: '🧹', hint: 'Dirty floors, desks, dustbins' },
  { name: 'Electrical', icon: '💡', hint: 'Lights, fans, switches, sockets' },
  { name: 'Plumbing & Water', icon: '🚰', hint: 'Leakage, blocked drain, water supply' },
  { name: 'Pantry & Refreshments', icon: '☕', hint: 'Coffee/tea machine, drinking water' },
  { name: 'General Maintenance', icon: '🛠️', hint: 'Doors, furniture, fixtures, repairs' },
  { name: 'Other Requirements / Suggestions', icon: '💬', hint: 'New facilities, ideas, other requests' },
] as const;
export const CATEGORY_NAMES: readonly string[] = CATEGORIES.map((c) => c.name);

export const STATUSES = ['Open', 'In Progress', 'Pending', 'Closed'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  Open: 'Open',
  'In Progress': 'Assigned / In Progress',
  Pending: 'Pending',
  Closed: 'Closed',
};

export const TIMEZONE = 'Asia/Kolkata';
export const TZ_OFFSET = '+05:30';
