-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'SALES', 'FINANCE', 'ADMIN');

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('NEW', 'USED', 'CPO');

-- CreateEnum
CREATE TYPE "BodyStyle" AS ENUM ('SEDAN', 'SUV', 'CROSSOVER', 'TRUCK', 'COUPE', 'CONVERTIBLE', 'HATCHBACK', 'VAN', 'WAGON');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('GAS', 'DIESEL', 'HYBRID', 'PLUG_IN_HYBRID', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "Drivetrain" AS ENUM ('FWD', 'RWD', 'AWD', 'FOUR_WD');

-- CreateEnum
CREATE TYPE "TransmissionType" AS ENUM ('AUTOMATIC', 'MANUAL', 'CVT', 'DIRECT_DRIVE');

-- CreateEnum
CREATE TYPE "ChargePort" AS ENUM ('NACS', 'CCS');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'PENDING', 'SOLD');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('CSV', 'JSON', 'FEED', 'MANUAL', 'SEED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "FeedProvider" AS ENUM ('HOMENET', 'VAUTO', 'DEALERCOM', 'CDK', 'GENERIC_CSV', 'GENERIC_JSON');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('CHECK_AVAILABILITY', 'TEST_DRIVE', 'PRE_APPROVAL', 'TRADE_IN', 'TEXT_US', 'CONTACT', 'SERVICE');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT_SET', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address_1" TEXT NOT NULL,
    "address_2" TEXT,
    "city" TEXT NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "zip" VARCHAR(10) NOT NULL,
    "phone" TEXT NOT NULL,
    "sms_phone" TEXT,
    "email" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sales_hours" JSONB NOT NULL,
    "service_hours" JSONB NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "vin" VARCHAR(17) NOT NULL,
    "stock_number" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "condition" "VehicleCondition" NOT NULL,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "make_slug" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "model_slug" TEXT NOT NULL,
    "trim" TEXT NOT NULL DEFAULT '',
    "body_style" "BodyStyle" NOT NULL,
    "fuel_type" "FuelType" NOT NULL,
    "ev_range_miles" INTEGER,
    "ev_battery_kwh" DOUBLE PRECISION,
    "ev_dc_fast_charge_min" INTEGER,
    "ev_charge_port" "ChargePort",
    "mpg_city" INTEGER,
    "mpg_highway" INTEGER,
    "mpg_combined" INTEGER,
    "engine" TEXT NOT NULL DEFAULT '',
    "transmission" TEXT NOT NULL DEFAULT '',
    "transmission_type" "TransmissionType" NOT NULL DEFAULT 'AUTOMATIC',
    "drivetrain" "Drivetrain" NOT NULL,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "exterior_color" TEXT NOT NULL,
    "exterior_color_family" TEXT NOT NULL DEFAULT 'other',
    "interior_color" TEXT NOT NULL,
    "interior_color_family" TEXT NOT NULL DEFAULT 'other',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "safety_features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "base_price" DECIMAL(12,2) NOT NULL,
    "base_down_payment" DECIMAL(12,2) NOT NULL,
    "base_monthly_payment" DECIMAL(12,2) NOT NULL,
    "display_price" DECIMAL(12,2) NOT NULL,
    "display_down_payment" DECIMAL(12,2) NOT NULL,
    "display_monthly_payment" DECIMAL(12,2) NOT NULL,
    "pricing_multipliers" JSONB,
    "priced_at" TIMESTAMP(3),
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "spin_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video_url" TEXT,
    "carfax_url" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location_id" UUID NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "source" "ImportSource" NOT NULL DEFAULT 'MANUAL',
    "source_ref" TEXT,
    "search_text" TEXT NOT NULL DEFAULT '',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_vehicles" (
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_vehicles_pkey" PRIMARY KEY ("user_id","vehicle_id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" "AlertFrequency" NOT NULL DEFAULT 'DAILY',
    "last_notified_at" TIMESTAMP(3),
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "deal_alerts" BOOLEAN NOT NULL DEFAULT true,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "author" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "source" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "type" "LeadType" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferred_contact" TEXT,
    "message" TEXT,
    "sms_consent" BOOLEAN NOT NULL DEFAULT false,
    "sms_consent_text" TEXT,
    "details" JSONB,
    "vehicle_id" UUID,
    "location_id" UUID,
    "assigned_to_id" UUID,
    "source_path" TEXT,
    "utm" JSONB,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "emailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_notes" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "feed_sources" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "FeedProvider" NOT NULL,
    "url" TEXT NOT NULL,
    "auth_env_var" TEXT,
    "location_id" UUID,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mark_missing_as_sold" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_status" "ImportStatus",
    "last_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "source" "ImportSource" NOT NULL,
    "feed_source_id" UUID,
    "file_name" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'RUNNING',
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "marked_sold" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "triggered_by" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_slug_key" ON "vehicles"("slug");

-- CreateIndex
CREATE INDEX "vehicles_status_is_demo_idx" ON "vehicles"("status", "is_demo");

-- CreateIndex
CREATE INDEX "vehicles_condition_idx" ON "vehicles"("condition");

-- CreateIndex
CREATE INDEX "vehicles_fuel_type_idx" ON "vehicles"("fuel_type");

-- CreateIndex
CREATE INDEX "vehicles_body_style_idx" ON "vehicles"("body_style");

-- CreateIndex
CREATE INDEX "vehicles_make_slug_model_slug_idx" ON "vehicles"("make_slug", "model_slug");

-- CreateIndex
CREATE INDEX "vehicles_display_price_idx" ON "vehicles"("display_price");

-- CreateIndex
CREATE INDEX "vehicles_display_monthly_payment_idx" ON "vehicles"("display_monthly_payment");

-- CreateIndex
CREATE INDEX "vehicles_year_idx" ON "vehicles"("year");

-- CreateIndex
CREATE INDEX "vehicles_mileage_idx" ON "vehicles"("mileage");

-- CreateIndex
CREATE INDEX "vehicles_is_featured_created_at_idx" ON "vehicles"("is_featured", "created_at");

-- CreateIndex
CREATE INDEX "vehicles_location_id_idx" ON "vehicles"("location_id");

-- CreateIndex
CREATE INDEX "vehicles_source_ref_idx" ON "vehicles"("source_ref");

-- CreateIndex
CREATE UNIQUE INDEX "saved_searches_unsubscribe_token_key" ON "saved_searches"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "saved_searches_alerts_enabled_idx" ON "saved_searches"("alerts_enabled");

-- CreateIndex
CREATE INDEX "saved_searches_email_idx" ON "saved_searches"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribe_token_key" ON "newsletter_subscribers"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_type_idx" ON "leads"("type");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "lead_notes_lead_id_idx" ON "lead_notes"("lead_id");

-- CreateIndex
CREATE INDEX "import_jobs_started_at_idx" ON "import_jobs"("started_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_vehicles" ADD CONSTRAINT "saved_vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_vehicles" ADD CONSTRAINT "saved_vehicles_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_sources" ADD CONSTRAINT "feed_sources_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
