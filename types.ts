
export type UserRole = 'STUDENT' | 'ADVISOR';

export interface Booking {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  timeSlot: string; // e.g., "16:00-17:00"
  bandName: string;
  createdAt: number;
}

export interface AvailabilityRule {
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  slots: string[]; // ["16:00-17:00", "17:00-18:00"]
}

export interface SpecialSchedule {
  date: string; // YYYY-MM-DD
  slots: string[]; // Override slots for a specific day
  isDisabled: boolean;
}

export interface AppState {
  bookings: Booking[];
  rules: AvailabilityRule[];
  specialSchedules: SpecialSchedule[];
  currentUserRole: UserRole;
}
