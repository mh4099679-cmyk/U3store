// Complete normalized relational SQL schema for U3 STORE

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  preferred_theme TEXT NOT NULL DEFAULT 'light', -- 'light' | 'dark' | 'system'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  internal_notes TEXT DEFAULT '',
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_paid_spending REAL NOT NULL DEFAULT 0,
  most_recent_order_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  governorate_id TEXT NOT NULL,
  city_id TEXT,
  area_id TEXT,
  street_address TEXT NOT NULL,
  building_number TEXT NOT NULL,
  floor_number TEXT DEFAULT '',
  apartment_number TEXT DEFAULT '',
  landmark TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_sessions (
  id TEXT PRIMARY KEY,
  session_token_hash TEXT UNIQUE NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  preferred_theme TEXT NOT NULL DEFAULT 'light',
  checkout_draft_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_customers (
  id TEXT PRIMARY KEY,
  guest_session_id TEXT REFERENCES guest_sessions(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  governorate_name_en TEXT DEFAULT '',
  governorate_name_ar TEXT DEFAULT '',
  internal_notes TEXT DEFAULT '',
  claimed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT DEFAULT '',
  description_ar TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  preferred_theme TEXT NOT NULL DEFAULT 'light',
  last_login_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  subject_type TEXT NOT NULL, -- 'CUSTOMER' | 'ADMIN'
  subject_id TEXT NOT NULL,
  device_label TEXT DEFAULT 'Web Browser',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category_translations (
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  lang TEXT NOT NULL, -- 'en' | 'ar'
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  PRIMARY KEY (category_id, lang)
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT DEFAULT '',
  description_ar TEXT DEFAULT '',
  banner_desktop_url TEXT DEFAULT '',
  banner_mobile_url TEXT DEFAULT '',
  product_type TEXT NOT NULL DEFAULT 'SHOES', -- 'SHOES' | 'CLOTHING'
  show_on_homepage INTEGER NOT NULL DEFAULT 1,
  homepage_sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'SHOES', -- 'SHOES' | 'CLOTHING'
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  brand TEXT DEFAULT 'U3',
  material_en TEXT DEFAULT '',
  material_ar TEXT DEFAULT '',
  regular_price REAL NOT NULL,
  sale_price REAL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_new_arrival INTEGER NOT NULL DEFAULT 0,
  is_best_seller INTEGER NOT NULL DEFAULT 0,
  related_product_ids_json TEXT DEFAULT '[]',
  size_guide_en TEXT DEFAULT '',
  size_guide_ar TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_translations (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lang TEXT NOT NULL, -- 'en' | 'ar'
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  PRIMARY KEY (product_id, lang)
);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_en TEXT DEFAULT '',
  alt_ar TEXT DEFAULT '',
  is_main INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  size TEXT NOT NULL,
  color_en TEXT NOT NULL,
  color_ar TEXT NOT NULL,
  color_hex TEXT DEFAULT '#111214',
  allow_backorder INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  variant_id TEXT PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  on_hand INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  returned INTEGER NOT NULL DEFAULT 0,
  damaged INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 3,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'RESTOCK' | 'RESERVE' | 'SALE' | 'COMMIT' | 'RELEASE' | 'ADJUSTMENT' | 'RETURN_RESTORE' | 'DAMAGED'
  previous_on_hand INTEGER NOT NULL,
  new_on_hand INTEGER NOT NULL,
  previous_reserved INTEGER NOT NULL,
  new_reserved INTEGER NOT NULL,
  reason TEXT NOT NULL,
  related_order_id TEXT,
  admin_user_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'COMMITTED' | 'RELEASED'
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  guest_session_id TEXT UNIQUE REFERENCES guest_sessions(id) ON DELETE CASCADE,
  coupon_code TEXT DEFAULT '',
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  guest_session_id TEXT UNIQUE REFERENCES guest_sessions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY,
  wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(wishlist_id, product_id)
);

CREATE TABLE IF NOT EXISTS governorates (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  shipping_rate REAL, -- NULL until configured by admin
  express_rate REAL,
  estimated_days_en TEXT DEFAULT '2-4 Business Days',
  estimated_days_ar TEXT DEFAULT '٢-٤ أيام عمل',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  governorate_id TEXT NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  shipping_rate REAL,
  estimated_days_en TEXT DEFAULT '',
  estimated_days_ar TEXT DEFAULT '',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  shipping_rate REAL,
  estimated_days_en TEXT DEFAULT '',
  estimated_days_ar TEXT DEFAULT '',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  standard_rate REAL NOT NULL,
  express_rate REAL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_rules (
  id TEXT PRIMARY KEY,
  free_shipping_threshold REAL,
  minimum_order_value REAL DEFAULT 0,
  default_shipping_rate REAL,
  express_delivery_enabled INTEGER NOT NULL DEFAULT 0,
  special_handling_fee REAL NOT NULL DEFAULT 0,
  reservation_expiry_minutes INTEGER NOT NULL DEFAULT 120,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'ORDER',
  scope_target_id TEXT DEFAULT '',
  min_spend REAL NOT NULL DEFAULT 0,
  starts_at TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL,
  min_spend REAL NOT NULL DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER NOT NULL DEFAULT 1,
  customer_eligibility TEXT NOT NULL DEFAULT 'ALL',
  starts_at TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  user_id TEXT,
  customer_phone TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_companies (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  phone TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  tracking_url_template TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_customer_id TEXT REFERENCES guest_customers(id) ON DELETE SET NULL,
  guest_session_id TEXT,
  guest_access_token_hash TEXT NOT NULL,
  guest_access_token_plain TEXT NOT NULL,
  customer_type TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  language_used TEXT NOT NULL DEFAULT 'en',
  governorate_id TEXT NOT NULL,
  governorate_name_en TEXT NOT NULL,
  governorate_name_ar TEXT NOT NULL,
  city_id TEXT DEFAULT '',
  city_name_en TEXT DEFAULT '',
  city_name_ar TEXT DEFAULT '',
  area_id TEXT DEFAULT '',
  area_name_en TEXT DEFAULT '',
  area_name_ar TEXT DEFAULT '',
  street_address TEXT NOT NULL,
  building_number TEXT NOT NULL,
  floor_number TEXT DEFAULT '',
  apartment_number TEXT DEFAULT '',
  landmark TEXT DEFAULT '',
  delivery_notes TEXT DEFAULT '',
  shipping_method TEXT NOT NULL DEFAULT 'STANDARD',
  delivery_estimate_en TEXT NOT NULL,
  delivery_estimate_ar TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0,
  coupon_code_snapshot TEXT DEFAULT '',
  shipping_fee REAL NOT NULL,
  additional_fees REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  balance_adjustment_due REAL NOT NULL DEFAULT 0, -- >0 additional due, <0 refund due after paid edit
  revision_number INTEGER NOT NULL DEFAULT 1,
  payment_method_code TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
  order_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  shipping_company_id TEXT REFERENCES shipping_companies(id) ON DELETE SET NULL,
  shipping_company_name TEXT DEFAULT '',
  tracking_number TEXT DEFAULT '',
  tracking_url TEXT DEFAULT '',
  whatsapp_transactional_consent INTEGER NOT NULL DEFAULT 0,
  whatsapp_marketing_consent INTEGER NOT NULL DEFAULT 0,
  internal_notes TEXT DEFAULT '',
  inventory_deducted INTEGER NOT NULL DEFAULT 0,
  cancellation_reason TEXT DEFAULT '',
  cancelled_at TEXT DEFAULT '',
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  product_type_snapshot TEXT DEFAULT 'SHOES',
  product_name_en_snapshot TEXT NOT NULL,
  product_name_ar_snapshot TEXT NOT NULL,
  product_image_snapshot TEXT DEFAULT '',
  size_snapshot TEXT NOT NULL,
  color_en_snapshot TEXT NOT NULL,
  color_ar_snapshot TEXT NOT NULL,
  unit_regular_price_snapshot REAL NOT NULL,
  unit_final_price_snapshot REAL NOT NULL,
  discount_per_unit_snapshot REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL,
  line_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status_type TEXT NOT NULL,
  previous_status TEXT DEFAULT '',
  new_status TEXT NOT NULL,
  note TEXT DEFAULT '',
  changed_by_admin_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_revisions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  previous_snapshot_json TEXT NOT NULL,
  new_snapshot_json TEXT NOT NULL,
  price_difference REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  edited_by_admin_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_edit_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  admin_id TEXT,
  field_name TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipping_company_id TEXT REFERENCES shipping_companies(id) ON DELETE SET NULL,
  tracking_number TEXT NOT NULL,
  tracking_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'SHIPPED',
  notes TEXT DEFAULT '',
  shipped_at TEXT NOT NULL,
  delivered_at TEXT
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 0,
  recipient_name TEXT DEFAULT '',
  receiving_account TEXT DEFAULT '',
  instructions_en TEXT DEFAULT '',
  instructions_ar TEXT DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_submissions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method_code TEXT NOT NULL,
  transaction_reference TEXT NOT NULL,
  sender_identifier TEXT NOT NULL,
  transfer_date TEXT NOT NULL,
  transfer_amount REAL NOT NULL,
  receipt_file_path TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
  admin_notes TEXT DEFAULT '',
  reviewed_by_admin_id TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  submission_id TEXT REFERENCES payment_submissions(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  amount REAL NOT NULL,
  method_code TEXT NOT NULL,
  reference TEXT NOT NULL,
  recorded_by_admin_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  order_id TEXT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  delivery_address_en TEXT NOT NULL,
  delivery_address_ar TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount_amount REAL NOT NULL,
  shipping_fee REAL NOT NULL,
  total_amount REAL NOT NULL,
  payment_method_code TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  issued_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name_en TEXT NOT NULL,
  product_name_ar TEXT NOT NULL,
  size TEXT NOT NULL,
  color_en TEXT NOT NULL,
  color_ar TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  discount_amount REAL NOT NULL,
  line_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_revisions (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by_admin_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS return_requests (
  id TEXT PRIMARY KEY,
  return_number TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_customer_id TEXT REFERENCES guest_customers(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL, -- 'RETURN' | 'EXCHANGE' | 'SIZE_EXCHANGE' | 'COLOR_EXCHANGE'
  replacement_variant_id TEXT,
  reason TEXT NOT NULL,
  customer_comments TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  inspection_result TEXT DEFAULT 'PENDING', -- 'PENDING' | 'APPROVED_FOR_RESTOCK' | 'DAMAGED'
  inspection_notes TEXT DEFAULT '',
  refund_amount REAL DEFAULT 0,
  refund_method TEXT DEFAULT '',
  stock_restored INTEGER NOT NULL DEFAULT 0,
  handled_by_admin_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY,
  return_request_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS return_inspections (
  id TEXT PRIMARY KEY,
  return_request_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  inspector_admin_id TEXT,
  physical_item_received INTEGER NOT NULL DEFAULT 1,
  condition_status TEXT NOT NULL, -- 'RESALABLE' | 'DAMAGED'
  restock_approved INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  inspected_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exchange_orders (
  id TEXT PRIMARY KEY,
  return_request_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  original_order_id TEXT NOT NULL,
  replacement_variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reservation_id TEXT,
  status TEXT NOT NULL DEFAULT 'RESERVED',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  return_request_id TEXT REFERENCES return_requests(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  refund_method TEXT NOT NULL,
  reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  processed_by_admin_id TEXT,
  created_at TEXT NOT NULL
);

-- WHATSAPP BUSINESS AUTOMATION TABLES
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  is_enabled INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'WHATSAPP_CLOUD_API',
  business_display_number TEXT DEFAULT '',
  waba_id TEXT DEFAULT '',
  phone_number_id TEXT DEFAULT '',
  webhook_verify_token TEXT DEFAULT 'u3store_verify_token',
  webhook_status TEXT DEFAULT 'NOT_CONNECTED',
  connection_status TEXT DEFAULT 'NOT_CONNECTED',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  guest_customer_id TEXT,
  phone TEXT NOT NULL,
  consent_type TEXT NOT NULL, -- 'TRANSACTIONAL' | 'MARKETING'
  consent_status TEXT NOT NULL DEFAULT 'OPTED_IN', -- 'OPTED_IN' | 'OPTED_OUT'
  consent_source TEXT NOT NULL, -- 'REGISTRATION' | 'CHECKOUT' | 'ACCOUNT'
  policy_version TEXT NOT NULL DEFAULT 'v1.0',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  event_type TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  body_en TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id TEXT PRIMARY KEY,
  recipient_phone TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  related_order_id TEXT,
  related_order_number TEXT DEFAULT '',
  event_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ar',
  template_name TEXT NOT NULL,
  rendered_body TEXT NOT NULL,
  send_status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED' | 'SENDING' | 'SENT_ACCEPTED' | 'DELIVERED' | 'READ' | 'FAILED' | 'NOT_CONNECTED'
  provider_message_id TEXT DEFAULT '',
  delivery_status TEXT NOT NULL DEFAULT 'PENDING',
  failure_reason TEXT DEFAULT '',
  button_label TEXT DEFAULT '',
  button_url TEXT DEFAULT '',
  retry_count INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  queued_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id TEXT PRIMARY KEY,
  customer_phone TEXT UNIQUE NOT NULL,
  customer_name TEXT DEFAULT '',
  related_order_number TEXT DEFAULT '',
  assigned_admin_id TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' | 'RESOLVED'
  internal_notes TEXT DEFAULT '',
  last_message_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'INBOUND' | 'OUTBOUND'
  sender_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  provider_message_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DELIVERED',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT DEFAULT '',
  device_label TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_push_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_url TEXT DEFAULT '',
  related_order_id TEXT,
  related_order_number TEXT,
  payload_json TEXT DEFAULT '{}',
  total_devices INTEGER NOT NULL DEFAULT 0,
  successful_devices INTEGER NOT NULL DEFAULT 0,
  failed_devices INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT REFERENCES admin_users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_url TEXT DEFAULT '',
  related_order_id TEXT,
  related_order_number TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'WHATSAPP',
  event_type TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'PROCESSED' | 'FAILED'
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL,
  recipient_user_id TEXT,
  order_id TEXT,
  event_type TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  external_delivery_status TEXT NOT NULL DEFAULT 'INTERNAL_ONLY',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY,
  event_type TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appearance_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_theme TEXT NOT NULL DEFAULT 'light', -- 'light' | 'dark' | 'system'
  allow_theme_switching INTEGER NOT NULL DEFAULT 1,
  color_preset TEXT NOT NULL DEFAULT 'U3_MONOCHROME', -- 'U3_MONOCHROME' | 'U3_SILVER_CONTRAST' | 'U3_CHARCOAL'
  heading_font_en TEXT NOT NULL DEFAULT 'Manrope',
  body_font_en TEXT NOT NULL DEFAULT 'Inter',
  heading_font_ar TEXT NOT NULL DEFAULT 'Alexandria',
  body_font_ar TEXT NOT NULL DEFAULT 'IBM Plex Sans Arabic',
  text_size_preset TEXT NOT NULL DEFAULT 'COMFORTABLE', -- 'COMPACT' | 'COMFORTABLE' | 'SPACIOUS'
  header_layout TEXT NOT NULL DEFAULT 'CLEAN_SHOPIFY',
  footer_layout TEXT NOT NULL DEFAULT 'MINIMAL_COLUMNS',
  container_width TEXT NOT NULL DEFAULT 'STANDARD',
  section_spacing TEXT NOT NULL DEFAULT 'BALANCED',
  product_grid_columns INTEGER NOT NULL DEFAULT 4,
  product_image_ratio TEXT NOT NULL DEFAULT 'SQUARE', -- 'SQUARE' | 'PORTRAIT'
  button_style TEXT NOT NULL DEFAULT 'SHARP_MODERN', -- 'SHARP_MODERN' | 'SUBTLE_ROUNDED'
  border_radius_preset TEXT NOT NULL DEFAULT 'SM', -- 'NONE' | 'SM' | 'MD'
  card_appearance TEXT NOT NULL DEFAULT 'CLEAN_BORDER',
  logo_url TEXT NOT NULL DEFAULT '/logo.jpg',
  logo_size_px INTEGER NOT NULL DEFAULT 44,
  announcement_enabled INTEGER NOT NULL DEFAULT 1,
  announcement_en TEXT NOT NULL DEFAULT 'U3 STORE — LIVE YOURS. | Shipping Across All 27 Egyptian Governorates',
  announcement_ar TEXT NOT NULL DEFAULT 'U3 STORE — LIVE YOURS. | شحن لجميع محافظات مصر الـ 27',
  draft_json TEXT DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS website_sections (
  id TEXT PRIMARY KEY,
  section_type TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  subtitle_en TEXT DEFAULT '',
  subtitle_ar TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  description_ar TEXT DEFAULT '',
  button_text_en TEXT DEFAULT '',
  button_text_ar TEXT DEFAULT '',
  button_link TEXT DEFAULT '/shop',
  desktop_image_url TEXT DEFAULT '',
  mobile_image_url TEXT DEFAULT '',
  text_alignment TEXT DEFAULT 'start',
  is_visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS website_pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  seo_title_en TEXT DEFAULT '',
  seo_title_ar TEXT DEFAULT '',
  seo_description_en TEXT DEFAULT '',
  seo_description_ar TEXT DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS navigation_links (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL DEFAULT 'HEADER',
  label_en TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS media_files (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  folder TEXT NOT NULL DEFAULT 'general',
  is_private INTEGER NOT NULL DEFAULT 0,
  uploaded_by_admin_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS translations (
  key TEXT PRIMARY KEY,
  en TEXT NOT NULL,
  ar TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT,
  admin_email TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  details_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name_en TEXT NOT NULL DEFAULT 'U3 STORE',
  store_name_ar TEXT NOT NULL DEFAULT 'U3 STORE',
  tagline_en TEXT NOT NULL DEFAULT 'LIVE YOURS.',
  tagline_ar TEXT NOT NULL DEFAULT 'LIVE YOURS. عش طريقتك.',
  contact_email TEXT NOT NULL DEFAULT 'support@u3store.com',
  contact_phone TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL DEFAULT '',
  address_en TEXT NOT NULL DEFAULT 'Cairo, Egypt',
  address_ar TEXT NOT NULL DEFAULT 'القاهرة، مصر',
  currency_code TEXT NOT NULL DEFAULT 'EGP',
  instagram_url TEXT DEFAULT '',
  tiktok_url TEXT DEFAULT '',
  facebook_url TEXT DEFAULT '',
  seo_title_en TEXT NOT NULL DEFAULT 'U3 STORE | LIVE YOURS. Premium Footwear & Apparel Egypt',
  seo_title_ar TEXT NOT NULL DEFAULT 'U3 STORE | LIVE YOURS. أحذية وملابس فاخرة في مصر',
  seo_description_en TEXT NOT NULL DEFAULT 'U3 STORE — Premium Streetwear, Modern Footwear & Apparel in Egypt. LIVE YOURS.',
  seo_description_ar TEXT NOT NULL DEFAULT 'U3 STORE — علامة الأحذية والملابس الفاخرة والعصرية في مصر. LIVE YOURS.',
  canonical_url TEXT DEFAULT '',
  visible_categories TEXT NOT NULL DEFAULT 'BOTH', -- 'SHOES_ONLY' | 'CLOTHING_ONLY' | 'BOTH'
  shop_by_category_enabled INTEGER NOT NULL DEFAULT 1,
  category_shoes_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80',
  category_clothing_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
  category_shoes_title_en TEXT DEFAULT 'SHOES',
  category_shoes_title_ar TEXT DEFAULT 'أحذية',
  category_clothing_title_en TEXT DEFAULT 'CLOTHING',
  category_clothing_title_ar TEXT DEFAULT 'ملابس',
  category_shoes_link TEXT DEFAULT '/shoes',
  category_clothing_link TEXT DEFAULT '/clothing',
  homepage_shoes_enabled INTEGER NOT NULL DEFAULT 1,
  homepage_clothing_enabled INTEGER NOT NULL DEFAULT 1,
  homepage_shoes_title_en TEXT DEFAULT 'SHOES COLLECTION',
  homepage_shoes_title_ar TEXT DEFAULT 'تشكيلة الأحذية',
  homepage_clothing_title_en TEXT DEFAULT 'CLOTHING COLLECTION',
  homepage_clothing_title_ar TEXT DEFAULT 'تشكيلة الملابس',
  homepage_shoes_desc_en TEXT DEFAULT 'Engineered for performance and streetwear culture.',
  homepage_shoes_desc_ar TEXT DEFAULT 'تصاميم استثنائية وثقافة ستريت وير أصلية.',
  homepage_clothing_desc_en TEXT DEFAULT 'Modern streetwear essentials crafted for comfort and style.',
  homepage_clothing_desc_ar TEXT DEFAULT 'أساسيات الستريت وير الحديثة لأناقة وراحة فائقة.',
  homepage_carousel_limit INTEGER NOT NULL DEFAULT 12,
  order_sequence INTEGER NOT NULL DEFAULT 0,
  invoice_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  notes TEXT DEFAULT '',
  created_by_admin_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS footer_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  brand_signature_en TEXT NOT NULL DEFAULT 'LIVE YOURS.',
  brand_signature_ar TEXT NOT NULL DEFAULT 'LIVE YOURS.',
  newsletter_enabled INTEGER NOT NULL DEFAULT 1,
  newsletter_heading_en TEXT NOT NULL DEFAULT 'Stay in the loop',
  newsletter_heading_ar TEXT NOT NULL DEFAULT 'ابقَ على اطلاع',
  newsletter_desc_en TEXT NOT NULL DEFAULT 'Subscribe for exclusive releases, restocks, and private drops.',
  newsletter_desc_ar TEXT NOT NULL DEFAULT 'اشترك للحصول على أحدث الإصدارات الحصرية، وإعادة توفر المقاسات، والدروبات الخاصة.',
  newsletter_placeholder_en TEXT NOT NULL DEFAULT 'Enter your email address',
  newsletter_placeholder_ar TEXT NOT NULL DEFAULT 'أدخل بريدك الإلكتروني',
  newsletter_success_en TEXT NOT NULL DEFAULT 'You are now subscribed to U3 STORE private drops.',
  newsletter_success_ar TEXT NOT NULL DEFAULT 'تم اشتراكك بنجاح في قائمة إصدارات U3 STORE الخاصة.',
  newsletter_privacy_notice_en TEXT NOT NULL DEFAULT 'By subscribing, you agree to our Privacy Policy.',
  newsletter_privacy_notice_ar TEXT NOT NULL DEFAULT 'بالاشتراك، أنت توافق على سياسة الخصوصية الخاصة بنا.',
  instagram_url TEXT NOT NULL DEFAULT 'https://www.instagram.com/u3store_/',
  tiktok_url TEXT NOT NULL DEFAULT 'https://www.tiktok.com/@ahmedyoosrry',
  facebook_url TEXT NOT NULL DEFAULT 'https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA',
  telegram_url TEXT NOT NULL DEFAULT 'https://t.me/u3store',
  phone_number TEXT NOT NULL DEFAULT '01115915388',
  phone_tel TEXT NOT NULL DEFAULT '+201115915388',
  maps_embed_url TEXT NOT NULL DEFAULT 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg',
  maps_external_url TEXT NOT NULL DEFAULT 'https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z',
  maps_visible_footer INTEGER NOT NULL DEFAULT 1,
  maps_visible_contact INTEGER NOT NULL DEFAULT 1,
  social_instagram_enabled INTEGER NOT NULL DEFAULT 1,
  social_tiktok_enabled INTEGER NOT NULL DEFAULT 1,
  social_facebook_enabled INTEGER NOT NULL DEFAULT 1,
  social_telegram_enabled INTEGER NOT NULL DEFAULT 1,
  contact_phone_enabled INTEGER NOT NULL DEFAULT 1,
  contact_telegram_enabled INTEGER NOT NULL DEFAULT 1,
  copyright_en TEXT NOT NULL DEFAULT 'All rights reserved.',
  copyright_ar TEXT NOT NULL DEFAULT 'جميع الحقوق محفوظة.',
  color_preset TEXT NOT NULL DEFAULT 'DEEP_BLACK', -- 'DEEP_BLACK' | 'CHARCOAL'
  show_payment_icons INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'SUBSCRIBED', -- 'SUBSCRIBED' | 'UNSUBSCRIBED'
  unsubscribe_token TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW', -- 'NEW' | 'REPLIED' | 'ARCHIVED'
  admin_notes TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marquee_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  segments_en_json TEXT NOT NULL DEFAULT '["U3 STORE","LIVE YOURS","NEW ARRIVALS","PREMIUM FOOTWEAR","DISCOVER THE COLLECTION"]',
  segments_ar_json TEXT NOT NULL DEFAULT '["U3 STORE","LIVE YOURS","وصل حديثاً","أحذية فاخرة","اكتشف المجموعة"]',
  separator_symbol TEXT NOT NULL DEFAULT '✦',
  speed_seconds INTEGER NOT NULL DEFAULT 28,
  direction TEXT NOT NULL DEFAULT 'AUTO', -- 'AUTO' | 'LEFT' | 'RIGHT'
  visual_preset TEXT NOT NULL DEFAULT 'OPTION_B_BLACK', -- 'OPTION_A_OFFWHITE' | 'OPTION_B_BLACK' | 'MIXED_BADGE'
  pause_on_hover INTEGER NOT NULL DEFAULT 1,
  desktop_font_size TEXT NOT NULL DEFAULT 'SM',
  mobile_font_size TEXT NOT NULL DEFAULT 'XS',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_campaigns (
  id TEXT PRIMARY KEY DEFAULT 'archive_sale',
  name_en TEXT NOT NULL DEFAULT 'ARCHIVE SALE',
  name_ar TEXT NOT NULL DEFAULT 'تخفيضات الأرشيف',
  message_en TEXT NOT NULL DEFAULT 'ARCHIVE SALE — LIVE NOW',
  message_ar TEXT NOT NULL DEFAULT 'تخفيضات الأرشيف — متاحة الآن',
  banner_subtitle_en TEXT NOT NULL DEFAULT 'LIMITED TIME ARCHIVE RELEASE',
  banner_subtitle_ar TEXT NOT NULL DEFAULT 'إصدارات محدودة لفترة مؤقتة',
  starts_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z',
  ends_at TEXT NOT NULL DEFAULT '2026-12-31T23:59:59Z',
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  is_active INTEGER NOT NULL DEFAULT 0,
  show_countdown INTEGER NOT NULL DEFAULT 1,
  show_in_marquee INTEGER NOT NULL DEFAULT 1,
  show_in_footer INTEGER NOT NULL DEFAULT 1,
  eligible_product_ids_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT DEFAULT '',
  comment TEXT NOT NULL,
  size_feedback TEXT DEFAULT 'TRUE_TO_SIZE',
  is_verified_purchase INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'APPROVED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS back_in_stock_requests (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_notified INTEGER NOT NULL DEFAULT 0,
  notified_at TEXT,
  created_at TEXT NOT NULL
);
`;
