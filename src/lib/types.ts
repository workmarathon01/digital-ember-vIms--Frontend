export interface User {
  id: number;
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  mobile?: string | null;
  active: boolean;
  user_type: string | null;
  role_id: number | null;
  company_id?: number | null;
  unit_id?: number | null;
  current_site_id?: number | null;
  full_name: string;
  role_key?: string | null;
  role_label?: string | null;
  locked_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export type VisitorStatus = "Checked-in" | "Expected" | "Checked-out" | "Pending";

export interface Visitor {
  id: number;
  name: string;
  contact_no: string | null;
  purpose: string | null;
  pass_code: string | null;
  pass_number: string | null;
  visit_type: string | null;
  visitor_in_out: string | null;
  status: boolean | null;
  verified: boolean | null;
  coming_from: string | null;
  vehicle_number: string | null;
  site_id: number | null;
  vhost_id: number | null;
  expected_date: string | null;
  expected_time: string | null;
  start_pass: string;
  end_pass: string;
  parking_slot: string | null;
  checked_in: boolean;
  pass_active: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface Staff {
  id: number;
  staff_id: string;
  firstname: string;
  lastname: string;
  email: string | null;
  mobile_no: string | null;
  work_type: string | null;
  status_type: string;
  status: boolean | null;
  staff_in_out: string | null;
  site_id: number | null;
  unit_id: number | null;
  vendor_id: number | null;
  valid_from: string | null;
  valid_till: string | null;
  joining_date: string | null;
  full_name: string;
  created_by_name: string | null;
  created_at: string;
  url: string;
}

export interface Role {
  id: number;
  name: string;
  key: string;
  description: string | null;
  active: boolean;
  is_system: boolean;
  power_level: number;
  system: boolean;
  permissions: { resource: string; action: string }[];
}

export interface AuditLog {
  id: number;
  action: string;
  actor_type: string;
  actor_id: number;
  resource_type: string | null;
  resource_id: number | null;
  ip_address: string | null;
  actor_name: string;
  created_at: string;
}

export interface DashboardMetrics {
  users_count: number;
  visitors_count: number;
  checked_in_visitors_count: number;
  staffs_count: number;
  pending_staffs_count: number;
  attendance_open: number;
  recent_activity: AuditLog[];
}

export interface PaginationMeta {
  count: number;
  page: number;
  limit: number;
  pages: number;
  from: number | null;
  to: number | null;
  prev: number | null;
  next: number | null;
}

export interface VisitorListResponse {
  visitors: Visitor[];
  meta: PaginationMeta;
}

export interface StaffListResponse {
  data: Staff[];
  meta: PaginationMeta;
}

export interface UserListResponse {
  data: User[];
  meta: PaginationMeta;
}

export interface RoleListResponse {
  data: Role[];
}