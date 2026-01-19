
import { AvailabilityRule } from './types';

export const DEFAULT_RULES: AvailabilityRule[] = [
  { dayOfWeek: 1, slots: ["16:00-17:00", "17:00-18:00"] }, // Mon
  { dayOfWeek: 2, slots: ["16:00-17:00", "17:00-18:00"] }, // Tue
  { dayOfWeek: 4, slots: ["16:00-17:00", "17:00-18:00"] }, // Thu
  { dayOfWeek: 5, slots: ["17:00-18:00"] },               // Fri
];

export const TIME_OPTIONS = [
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00"
];

export const DAYS_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"];
