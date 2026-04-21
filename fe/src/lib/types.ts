// Shared types used by the API client.
// These were extracted from firestore.ts to be used standalone.

export type TargetType = 'genre_generation' | 'number' | 'individual';
export type PaymentMethod = 'bank' | 'paypay' | 'cash';
export type PaymentStatus = 'unpaid' | 'reported' | 'confirmed';

export interface CashCollector {
  memberId: string;
  name: string;
  genre?: string;
  generation?: number;
}

export interface TimetableRow {
  time: string;
  description: string;
}

export interface FEUser {
  memberId: string;
  name: string;
  role: 'admin' | 'member';
  genre: string;
  generation: number;
}

export interface PracticeSession {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  type: 'regular' | 'event' | 'team';
  targetType: TargetType;
  targetGenres: string[];
  targetGenerations: number[];
  targetNumberId: string;
  targetMemberIds: string[];
  additionalMemberIds: string[];
  createdAt: any;
}

export interface PracticeRSVP {
  memberId: string;
  name: string;
  genre: string;
  generation: number;
  status: 'GO' | 'NO' | 'LATE' | 'EARLY';
  note: string;
  updatedAt: any;
}

export interface NumberRoster {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: any;
}

export interface BoiledEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  meetingTime: string;
  meetingLocation: string;
  timetable: TimetableRow[];
  timetableImageUrl?: string;
  note: string;
  imageUrls: string[];
  createdAt: any;
}

export interface Settlement {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  note: string;
  createdBy: string;
  createdByName: string;
  targetType: TargetType;
  targetGenres: string[];
  targetGenerations: number[];
  targetNumberId: string;
  targetMemberIds: string[];
  resolvedMemberIds: string[];
  paymentMethods: PaymentMethod[];
  bankInfo: string;
  paypayInfo: string;
  cashCollectors: CashCollector[];
  requiresConfirmation: boolean;
  createdAt: any;
}

export interface PaymentRecord {
  memberId: string;
  name: string;
  status: PaymentStatus;
  reportedMethod?: PaymentMethod;
  cashCollectorId?: string;
  cashCollectorName?: string;
  reportedAt?: any;
  confirmedAt: any;
}
