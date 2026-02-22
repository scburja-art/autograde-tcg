import { v4 as uuidv4 } from "uuid";
import db, { initializeDatabase } from "./index";

initializeDatabase();

// Create test user
db.prepare(`
  INSERT OR IGNORE INTO users (id, email, username, password_hash)
  VALUES (?, ?, ?, ?)
`).run("test-user-1", "test@example.com", "testuser", "placeholder_hash");

// Create default collection
const collectionId = "test-collection-1";
db.prepare(`
  INSERT OR IGNORE INTO collections (id, user_id, name)
  VALUES (?, ?, ?)
`).run(collectionId, "test-user-1", "My Collection");

// Pick cards not already in the collection
interface CardRow {
  id: string;
  name: string;
  rarity: string;
}

const existingCount = (db.prepare(
  "SELECT COUNT(*) as count FROM collection_items WHERE collection_id = ?"
).get(collectionId) as { count: number }).count;

if (existingCount > 0) {
  console.log(`Test user seed complete: 0 new items added (${existingCount} total in collection)`);
  process.exit(0);
}

const cards = db.prepare(`
  SELECT id, name, rarity FROM cards_master
  ORDER BY RANDOM()
  LIMIT 8
`).all() as CardRow[];

const PURCHASE_PRICES: Record<string, [number, number]> = {
  common: [0.05, 1.5],
  uncommon: [0.2, 3.0],
  rare: [0.8, 15.0],
  "holo rare": [3.0, 80.0],
  "ultra rare": [15.0, 250.0],
  "secret rare": [40.0, 400.0],
};

const insertItem = db.prepare(`
  INSERT OR IGNORE INTO collection_items (id, collection_id, card_id, quantity, date_acquired, purchase_price)
  VALUES (?, ?, ?, ?, ?, ?)
`);

let added = 0;
for (const card of cards) {
  const range = PURCHASE_PRICES[card.rarity] || PURCHASE_PRICES.common;
  const price = Math.round((range[0] + Math.random() * (range[1] - range[0])) * 100) / 100;
  const qty = Math.floor(Math.random() * 3) + 1;
  const result = insertItem.run(
    uuidv4(),
    collectionId,
    card.id,
    qty,
    "2026-01-15",
    price
  );
  if (result.changes > 0) added++;
}

const totalItems = (db.prepare(
  "SELECT COUNT(*) as count FROM collection_items WHERE collection_id = ?"
).get(collectionId) as { count: number }).count;

console.log(`Test user seed complete: ${added} new items added (${totalItems} total in collection)`);