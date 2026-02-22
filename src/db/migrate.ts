import db, { initializeDatabase } from "./index";

// Run schema.sql (all CREATE TABLE IF NOT EXISTS)
initializeDatabase();

// Future migrations go here as idempotent ALTER TABLE statements.
// Each migration is wrapped in try/catch so it's safe to run multiple times.

const migrations: { name: string; sql: string }[] = [
  // Example for future use:
  // { name: "add_notes_to_collection_items", sql: "ALTER TABLE collection_items ADD COLUMN notes TEXT" },
];

let applied = 0;
let skipped = 0;

for (const m of migrations) {
  try {
    db.exec(m.sql);
    console.log(`  Applied: ${m.name}`);
    applied++;
  } catch (err: any) {
    if (err.message?.includes("duplicate column") || err.message?.includes("already exists")) {
      console.log(`  Skipped: ${m.name} (already applied)`);
      skipped++;
    } else {
      console.error(`  FAILED: ${m.name} — ${err.message}`);
    }
  }
}

console.log(`Migration complete: ${applied} applied, ${skipped} skipped`);
