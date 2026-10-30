/** Hand-written row types matching supabase/migrations/0001_schema.sql */

export type ParticipantCategory = "internal" | "external";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type PaymentStatus = "not_required" | "pending" | "verified";

export interface EventSettings {
  id: 1;
  event_name: string;
  tagline: string;
  about: string;
  event_date: string; // ISO timestamp
  venue: string;
  duration_text: string;
  registration_open: boolean;
  registration_deadline: string | null;
  external_fee_per_member: number;
  payment_upi_id: string;
  payment_instructions: string;
  payment_qr_path: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  instagram_url: string;
  updated_at: string;
}

export interface Objective {
  id: string;
  body: string;
  sort_order: number;
}
export interface Theme {
  id: string;
  title: string;
  description: string;
  sort_order: number;
}
export interface ScheduleItem {
  id: string;
  time_label: string;
  title: string;
  description: string;
  sort_order: number;
}
export interface Rule {
  id: string;
  body: string;
  sort_order: number;
}

export interface Registration {
  id: string;
  registration_code: string;
  category: ParticipantCategory;
  team_name: string;
  leader_name: string;
  college_name: string;
  department: string;
  year_of_study: number;
  project_title: string;
  leader_reg_no: string | null;
  leader_id_card_path: string | null;
  member_count: number;
  fee_per_member: number;
  total_fee: number;
  transaction_id: string | null;
  payment_date: string | null; // YYYY-MM-DD
  payment_time: string | null; // HH:MM:SS
  payment_screenshot_path: string | null;
  payment_status: PaymentStatus;
  status: RegistrationStatus;
  rejection_reason: string | null;
  status_token_hash: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  registration_id: string;
  position: number;
  full_name: string;
  email: string;
  phone: string;
  is_leader: boolean;
}

export interface StatusHistoryRow {
  id: string;
  registration_id: string;
  old_status: RegistrationStatus | null;
  new_status: RegistrationStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}
