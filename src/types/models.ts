import { Database, Tables, TablesInsert, TablesUpdate } from './database.types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ==========================================
// RÔLES ET STATUTS
// ==========================================
export type UserRole = 'visitor' | 'member' | 'daily_member' | 'admin';
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'exempt';
export type CheckInType = 'manual' | 'auto';
export type EventType = 'sbc_race' | 'belgian_championship' | 'holiday' | 'club_meeting';
export type EventStatus = 'open' | 'closed' | 'ongoing' | 'completed' | 'cancelled' | 'draft';

// ==========================================
// PERMISSIONS ASBL
// ==========================================
export type ModulePermissionAction = 'view' | 'edit' | 'delete' | 'manage';
export type ModulePermissionsMap = Record<string, string[] | Record<string, boolean>>;

// ==========================================
// PROFILS MEMBRES
// ==========================================
export type MemberRow = Tables<'sbc_members'>;
export type MemberInsert = TablesInsert<'sbc_members'>;
export type MemberUpdate = TablesUpdate<'sbc_members'>;

export interface MemberProfile extends MemberRow {
  role?: UserRole;
  permissions?: ModulePermissionsMap | null;
}

export interface MemberProfileUpdateInput {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  license_number?: string | null;
  street_number?: string | null;
  zip_code?: string | null;
  city?: string | null;
  birth_date?: string | null;
  membership_choice?: string | null;
  transponder_number?: string | null;
  roi_accepted?: boolean;
  insurance_ack?: boolean;
}

export interface MemberProfileCreateInput {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  license_number?: string | null;
  street_number?: string | null;
  zip_code?: string | null;
  city?: string | null;
  birth_date?: string | null;
  membership_choice?: string | null;
  transponder_number?: string | null;
  roi_accepted?: boolean;
  insurance_ack?: boolean;
}

// ==========================================
// PRÉSENCE & GÉOFENCING
// ==========================================
export type PresenceSession = Tables<'sbc_presence'>;
export type PresenceSessionInsert = TablesInsert<'sbc_presence'>;
export type PresenceSessionUpdate = TablesUpdate<'sbc_presence'>;

export interface PublicPresenceItem {
  id: string;
  check_in_time: string;
  check_in_type: string;
  sbc_members: {
    first_name: string;
    last_name: string;
    license_number: string | null;
  } | null;
}

export interface PresenceZoneState {
  isInZone: boolean;
  isCheckedIn: boolean;
  distance: number | null;
  coords: { lat: number; lng: number } | null;
  activePresence: PresenceSession | null;
  loadingLocation: boolean;
  loadingPresence: boolean;
  refreshPresence: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  setIsInZone: (val: boolean) => void;
  setIsCheckedIn: (val: boolean) => void;
}

// ==========================================
// ÉVÉNEMENTS, CATÉGORIES & RESTAURATION
// ==========================================
export interface RaceCategoryItem {
  name: string;
  fee: number;
  type?: string;
}

export interface MealOptionItem {
  name: string;
  price: number;
  desc?: string;
}

export interface SelectedCategoryItem {
  name: string;
  fee: number;
  type?: string;
}

export interface SelectedMealItem {
  name: string;
  quantity: number;
  unit_price: number;
  unitPrice?: number;
  totalPrice?: number;
}

export type ClubEvent = Tables<'sbc_events'>;
export type ClubEventInsert = TablesInsert<'sbc_events'>;
export type ClubEventUpdate = TablesUpdate<'sbc_events'>;

export interface EventFormData {
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  category?: string;
  registration_fee?: number;
  status?: EventStatus | 'open' | 'closed' | 'draft';
  event_type: EventType;
  has_registration: boolean;
  external_link?: string;
  categories?: RaceCategoryItem[];
  meal_options?: MealOptionItem[];
  max_participants?: number;
}

// ==========================================
// INSCRIPTIONS AUX ÉVÉNEMENTS
// ==========================================
export type EventRegistration = Tables<'sbc_event_registrations'>;
export type EventRegistrationInsert = TablesInsert<'sbc_event_registrations'>;
export type EventRegistrationUpdate = TablesUpdate<'sbc_event_registrations'>;

export interface EventRegistrationWithDetails extends EventRegistration {
  sbc_events?: ClubEvent | null;
  sbc_members?: MemberProfile | null;
}

export interface EventRegistrationInput {
  eventId: string;
  memberId: string;
  raceCategory: string;
  selectedCategories?: SelectedCategoryItem[];
  selectedMeals?: SelectedMealItem[];
  foodOptions?: string[];
  transponderId?: string;
  totalPaid: number;
}

// ==========================================
// CONFIGURATION DU CLUB
// ==========================================
export type ClubConfig = Tables<'sbc_club_config'>;
export type ClubConfigInsert = TablesInsert<'sbc_club_config'>;
export type ClubConfigUpdate = TablesUpdate<'sbc_club_config'>;

// ==========================================
// BABILLARD PIT-LANE & COMMUNICATIONS DU COMITÉ
// ==========================================
export type AnnouncementCategory = 'info_piste' | 'travaux' | 'briefing_course' | 'vie_du_club';

export interface ClubAnnouncement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  is_pinned: boolean;
  author_name: string;
  created_at: string;
  updated_at?: string;
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  category: AnnouncementCategory;
  is_pinned: boolean;
  author_name?: string;
}

// ==========================================
// CALENDRIER MERGÉ (ÉVÉNEMENTS + FÉRIÉS)
// ==========================================
export interface MergedCalendarItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string | null;
  source: 'supabase_event' | 'belgian_holiday';
  event_type?: EventType;
  has_registration?: boolean;
  external_link?: string | null;
  location?: string;
  start_time?: string;
  end_time?: string;
  registration_fee?: number;
}

// ==========================================
// HELPERS D'ERREUR TYPESAFE
// ==========================================
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'Une erreur inattendue est survenue.';
}
