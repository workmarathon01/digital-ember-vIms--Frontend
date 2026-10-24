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
  building_id?: number | null;
  floor_id?: number | null;
  current_site_id?: number | null;
  site_name?: string | null;
  building_name?: string | null;
  floor_name?: string | null;
  unit_name?: string | null;
  residence_label?: string | null;
  feature_keys?: string[];
  effective_features?: Pick<Feature, "id" | "key" | "name" | "category">[];
  full_name: string;
  role_key?: string | null;
  role_label?: string | null;
  locked_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: number;
  name: string;
  code: string;
  region: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  timezone: string | null;
  latitude: string | null;
  longitude: string | null;
  active: boolean;
  description: string | null;
  display_name: string;
  full_address: string;
  buildings_count: number;
  floors_count: number;
  units_count: number;
  residents_count: number;
  features_count: number;
  created_at: string;
  updated_at: string;
}

export type FeatureCategory =
  | "general"
  | "operations"
  | "security"
  | "resident"
  | "reporting"
  | "platform";

export interface Feature {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: FeatureCategory;
  icon: string | null;
  default_enabled: boolean;
  active: boolean;
  sort_order: number;
  sites_count: number;
  created_at: string;
  updated_at: string;
}

export type FeatureOverrideState = "inherit" | "granted" | "revoked";

export interface SiteFeatureAccess {
  site: Site;
  features: (Feature & { enabled: boolean })[];
  enabled_feature_ids: number[];
  enabled_count: number;
  available_count: number;
}

export interface UserFeatureAccess {
  user: User;
  site?: Site;
  features: (Feature & { effective: boolean; override: FeatureOverrideState })[];
  effective_feature_ids: number[];
  effective_feature_keys: string[];
}

export interface Building {
  id: number;
  site_id: number;
  name: string;
  code: string | null;
  description: string | null;
  site_name: string | null;
  location_label: string;
  floors_count: number;
  units_count: number;
  residents_count: number;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: number;
  site_id: number;
  building_id: number;
  name: string;
  level: number | null;
  description: string | null;
  site_name: string | null;
  building_name: string | null;
  location_label: string;
  units_count: number;
  residents_count: number;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: number;
  site_id: number;
  building_id: number;
  floor_id: number;
  name: string;
  unit_type: string | null;
  carpet_area: string | null;
  status: string;
  description: string | null;
  site_name: string | null;
  building_name: string | null;
  floor_name: string | null;
  location_label: string;
  full_address: string;
  residents_count: number;
  occupied: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSite {
  id: number;
  user_id: number;
  site_id: number;
  building_id: number | null;
  floor_id: number | null;
  unit_id: number | null;
  ownership: string;
  is_primary: boolean;
  lives_here: boolean;
  is_approved: boolean;
  primary: boolean;
  move_in_date: string | null;
  move_out_date: string | null;
  user_name: string | null;
  site_name: string | null;
  building_name: string | null;
  floor_name: string | null;
  unit_name: string | null;
  location_label: string;
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
  sites_count: number;
  units_count: number;
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

export interface SiteListResponse {
  data: Site[];
  meta: PaginationMeta;
}

export interface BuildingListResponse {
  data: Building[];
  meta: PaginationMeta;
}

export interface FloorListResponse {
  data: Floor[];
  meta: PaginationMeta;
}

export interface UnitListResponse {
  data: Unit[];
  meta: PaginationMeta;
}

export interface UserSiteListResponse {
  data: UserSite[];
  meta: PaginationMeta;
}

export interface FeatureListResponse {
  data: Feature[];
  meta: PaginationMeta;
}