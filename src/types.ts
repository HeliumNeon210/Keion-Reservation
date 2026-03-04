export interface Reservation {
  id: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  bandName: string;
  memberCount: number;
}

export interface AvailableSlot {
  id: number | string;
  dayOfWeek: number;
  startTime: string;
}

export interface SlotResponse {
  recurring: AvailableSlot[];
  extra: { id: string | number; date: string; startTime: string }[];
  blocked: { id: string | number; date: string; startTime: string }[];
}
