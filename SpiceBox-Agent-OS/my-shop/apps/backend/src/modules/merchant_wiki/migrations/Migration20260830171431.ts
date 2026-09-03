import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260830171431 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "merchant_schema_mapping" ("id" text not null, "merchant_id" text not null default 'default_merchant', "domain" text check ("domain" in ('catalog', 'reviews', 'promotions', 'inventory', 'orders')) not null, "source_table" text not null, "field_mappings" jsonb not null, "is_active" boolean not null default true, "sample_preview" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "merchant_schema_mapping_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merchant_schema_mapping_deleted_at" ON "merchant_schema_mapping" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "merchant_schema_mapping" cascade;`);
  }

}
