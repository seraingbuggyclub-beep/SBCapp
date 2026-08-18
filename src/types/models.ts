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
// PISTES SBC (TRACKS)
// ==========================================
export type TrackRow = Tables<'tracks'>;
export type TrackInsert = TablesInsert<'tracks'>;
export type TrackUpdate = TablesUpdate<'tracks'>;

export interface TrackItem {
  id: string;
  name: string;
  is_open: boolean;
  updated_at?: string | null;
}

// ==========================================
// TARIFICATION & COTISATIONS (TREASURY)
// ==========================================
export interface SpecialRateItem {
  id: string;
  label: string;
  amount: number;
  description?: string;
}

export type MembershipPricingRow = Tables<'sbc_membership_pricing'>;
export interface MembershipPricing {
  id: string;
  year: number;
  price_with_fba: number;
  price_without_fba: number;
  belgian_championship_fee: number;
  special_rates: SpecialRateItem[];
  discount_enabled: boolean;
  discount_amount: number;
  discount_label: string;
  discount_start_date: string | null;
  discount_end_date: string | null;
  updated_at?: string | null;
}

export type MembershipPaymentRow = Tables<'membership_payments'>;
export interface MembershipPaymentItem {
  id: string;
  user_id: string;
  year: number;
  formula: 'with_fba' | 'without_fba' | 'special';
  special_rate_id?: string | null;
  includes_fba: boolean;
  license_number?: string | null;
  includes_belgian_championship: boolean;
  applied_discount: number;
  amount: number;
  status: 'pending' | 'paid';
  payment_method?: 'virement' | 'cash' | 'autre' | string | null;
  validated_by?: string | null;
  validated_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sbc_members?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    license_number?: string | null;
  } | null;
}

export interface MembershipChoiceInput {
  user_id: string;
  year: number;
  formula: 'with_fba' | 'without_fba' | 'special';
  special_rate_id?: string | null;
  license_number?: string | null;
  includes_belgian_championship: boolean;
}

// ==========================================
// BUVETTE, POS TACTILE & GESTION DE STOCKS
// ==========================================
export type BarCategoryRow = Tables<'bar_categories'>;
export type BarItemRow = Tables<'bar_items'>;
export type BarSessionRow = Tables<'bar_sessions'>;
export type BarOrderRow = Tables<'bar_orders'>;
export type BarOrderItemRow = Tables<'bar_order_items'>;
export type BarStockMovementRow = Tables<'bar_stock_movements'>;

export interface BarCategory {
  id: string;
  name: string;
  display_order: number;
  items?: BarItem[];
}

export interface BarItem {
  id: string;
  category_id: string;
  name: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  alert_threshold: number;
  is_active: boolean;
  image_url?: string | null;
  category?: BarCategory | null;
}

export interface BarCartItem {
  item: BarItem;
  quantity: number;
}

export interface BarSession {
  id: string;
  opened_by: string;
  opened_at: string;
  opening_cash: number;
  closed_by?: string | null;
  closed_at?: string | null;
  closing_cash_counted?: number | null;
  closing_cash_expected?: number | null;
  cash_difference?: number | null;
  status: 'OPEN' | 'CLOSED';
  notes?: string | null;
  opened_by_member?: { first_name: string; last_name: string } | null;
}

export type BarPaymentMethod = 'CASH' | 'PAYCONIQ' | 'WALLET' | 'TAB';
export type BarPaymentStatus = 'PAID' | 'PENDING_TAB';
export type BarChannel = 'POS' | 'SELF_SERVICE';

export interface BarOrder {
  id: string;
  session_id?: string | null;
  buyer_id?: string | null;
  seller_id?: string | null;
  channel: BarChannel;
  total_amount: number;
  payment_method: BarPaymentMethod;
  payment_status: BarPaymentStatus;
  created_at: string;
  buyer?: { first_name: string; last_name: string; email: string } | null;
  items?: {
    id: string;
    item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    bar_items?: BarItem | null;
  }[];
}

export interface BarStockMovement {
  id: string;
  item_id: string;
  type: 'ENTRY' | 'SALE_POS' | 'SALE_SELF' | 'LOSS' | 'ADJUSTMENT';
  quantity: number;
  cost_price_at_time: number;
  reason?: string | null;
  admin_id?: string | null;
  created_at: string;
  bar_items?: { name: string } | null;
}

export interface ShoppingListItem {
  item: BarItem;
  currentStock: number;
  threshold: number;
  suggestedBuyQty: number;
  isChecked: boolean;
}

export interface MemberBalanceItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  wallet_balance: number;
  tab_balance: number;
}

// ==========================================
// COMPTABILITÉ & GRAND LIVRE ASBL (CAISSE & BANQUE)
// ==========================================
export type AccountingTransactionRow = Tables<'accounting_transactions'>;

export type AccountingType = 'RECETTE' | 'DEPENSE';
export type AccountingCategory =
  | 'COTISATION'
  | 'BUVETTE'
  | 'ACHAT_MATERIEL'
  | 'TRAVAUX_PISTE'
  | 'ASSURANCE_FBA'
  | 'FRAIS_DIVERS'
  | 'DEPOT_BANQUE'
  | 'RETRAIT_CAISSE';

export type AccountingPaymentMethod = 'ESPECES' | 'BANQUE' | 'PAYCONIQ';
export type AccountingSourceType = 'MANUAL' | 'MEMBERSHIP' | 'BAR_SESSION';

export interface AccountingTransaction {
  id: string;
  date: string;
  type: AccountingType;
  category: AccountingCategory;
  payment_method: AccountingPaymentMethod;
  amount: number;
  description: string;
  receipt_url?: string | null;
  source_type: AccountingSourceType;
  source_id?: string | null;
  author_id?: string | null;
  created_at: string;
  author?: { first_name: string; last_name: string } | null;
}

export interface AccountingMetrics {
  cashBalance: number;
  bankBalance: number;
  totalIncome: number;
  totalExpense: number;
  netResult: number;
  incomeByMethod: {
    cash: number;
    bank: number;
    payconiq: number;
  };
  expenseByMethod: {
    cash: number;
    bank: number;
    payconiq: number;
  };
  categoryTotals: { [category: string]: { income: number; expense: number } };
}

export interface AccountingFilters {
  year?: number;
  type?: 'ALL' | AccountingType;
  category?: 'ALL' | AccountingCategory;
  paymentMethod?: 'ALL' | AccountingPaymentMethod;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateTransactionInput {
  date: string;
  type: AccountingType;
  category: AccountingCategory;
  payment_method: AccountingPaymentMethod;
  amount: number;
  description: string;
  receipt_url?: string | null;
  source_type?: AccountingSourceType;
  source_id?: string | null;
}

// ==========================================
// REGISTRE DE PRÉSENCE FBA & FRÉQUENTATION
// ==========================================
export type FbaAttendanceRow = Tables<'fba_attendances'>;

export type AttendanceSource = 'SELF_DASHBOARD' | 'QR_SCAN' | 'ADMIN_MANUAL';

export interface FbaAttendanceItem {
  id: string;
  user_id?: string | null;
  visitor_name?: string | null;
  visitor_license?: string | null;
  track_id?: string | null;
  check_in_at: string;
  check_out_at?: string | null;
  source: AttendanceSource;
  created_at: string;
  duration_minutes?: number | null;
  sbc_members?: {
    first_name: string;
    last_name: string;
    email: string;
    license_number?: string | null;
    payment_status?: string | null;
  } | null;
  tracks?: {
    name: string;
  } | null;
}

export interface VisitorAttendanceInput {
  name: string;
  licenseNumber: string;
  trackId?: string | null;
}

export interface AttendanceStats {
  totalSessions: number;
  totalMembersCount: number;
  totalVisitorsCount: number;
  averageDurationMinutes: number;
  peakHour: string;
  busiestDay: string;
  dayOfWeekCounts: { [day: string]: number };
  hourlyDistribution: { [hour: string]: number };
  trackDistribution: { [trackName: string]: number };
}

// ==========================================
// RGPD & CONFORMITÉ APD (BELGIQUE)
// ==========================================
export interface ConsentUpdateInput {
  consent_email_club_news?: boolean;
  consent_email_events?: boolean;
  consent_image_rights?: boolean;
  consent_whatsapp_group?: boolean;
}

export type GdprProcessingActivityRow = Tables<'gdpr_processing_register'>;

export interface GdprProcessingActivity {
  id: string;
  activity_name: string;
  purpose: string;
  legal_basis: string;
  data_categories: string;
  retention_period: string;
  recipients: string;
  security_measures: string;
  updated_at: string;
}

export type EmailCategory = 'CLUB_NEWS' | 'EVENTS' | 'URGENT_INFO';

export interface EmailLogItem {
  id: string;
  sender_id?: string | null;
  subject: string;
  category: EmailCategory;
  recipients_count: number;
  sent_at: string;
  sender?: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface MemberConsentsStats {
  totalMembers: number;
  newsOptInCount: number;
  newsOptInPct: number;
  eventsOptInCount: number;
  eventsOptInPct: number;
  imageRightsOptInCount: number;
  imageRightsOptInPct: number;
  whatsappOptInCount: number;
  whatsappOptInPct: number;
}

export interface SecuredEmailAudience {
  count: number;
  excludedCount: number;
  category: EmailCategory;
}

// ==========================================
// LISTE NOIRE PRIVÉE (BLACKLIST)
// ==========================================
export interface BlacklistEntry {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  license_number?: string | null;
  internal_reason: string;
  rejection_message: string;
  blocked_by?: string | null;
  created_at: string;
  blocked_by_member?: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface CreateBlacklistInput {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  license_number?: string | null;
  internal_reason: string;
  rejection_message?: string;
}

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  message?: string;
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
