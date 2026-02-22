import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db, { initializeDatabase } from "./index";

initializeDatabase();

const passwordHash = bcrypt.hashSync("password123", 10);

// Create test users
const users = [
  { id: "trade-user-2", email: "trader2@test.com", username: "trader2" },
  { id: "trade-user-3", email: "trader3@test.com", username: "trader3" },
];

for (const u of users) {
  db.prepare(
    "INSERT OR IGNORE INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)"
  ).run(u.id, u.email, u.username, passwordHash);

  db.prepare(
    "INSERT OR IGNORE INTO subscriptions (id, user_id, plan, billing_cycle, status) VALUES (?, ?, 'free', 'monthly', 'active')"
  ).run(uuidv4(), u.id);
}

// Get test-user-1's ID
const testUser1 = db.prepare("SELECT id FROM users WHERE email = 'test@test.com'").get() as { id: string } | undefined;
if (!testUser1) {
  console.error("test@test.com not found. Run npm run seed:testuser first.");
  process.exit(1);
}

// Get some cards for trade intents
const charizard = db.prepare("SELECT id FROM cards_master WHERE name = 'Charizard' AND set_code = 'BS'").get() as { id: string } | undefined;
const pikachu = db.prepare("SELECT id FROM cards_master WHERE name = 'Pikachu' AND set_code = 'BS'").get() as { id: string } | undefined;
const blastoise = db.prepare("SELECT id FROM cards_master WHERE name = 'Blastoise' AND set_code = 'BS'").get() as { id: string } | undefined;
const venusaur = db.prepare("SELECT id FROM cards_master WHERE name = 'Venusaur' AND set_code = 'BS'").get() as { id: string } | undefined;

if (!charizard || !pikachu || !blastoise || !venusaur) {
  console.error("Required cards not found. Run npm run seed first.");
  process.exit(1);
}

// Trade intents setup:
// test-user-1: looking_for Charizard, available_for_trade Pikachu
// trader2: available_for_trade Charizard, looking_for Blastoise
// trader3: looking_for Pikachu, available_for_trade Venusaur

const intents = [
  { userId: testUser1.id, cardId: charizard.id, type: "looking_for" },
  { userId: testUser1.id, cardId: pikachu.id, type: "available_for_trade" },
  { userId: "trade-user-2", cardId: charizard.id, type: "available_for_trade" },
  { userId: "trade-user-2", cardId: blastoise.id, type: "looking_for" },
  { userId: "trade-user-3", cardId: pikachu.id, type: "looking_for" },
  { userId: "trade-user-3", cardId: venusaur.id, type: "available_for_trade" },
];

for (const intent of intents) {
  const existing = db.prepare(
    "SELECT id FROM trade_intents WHERE user_id = ? AND card_id = ? AND intent_type = ?"
  ).get(intent.userId, intent.cardId, intent.type);

  if (!existing) {
    db.prepare(
      "INSERT INTO trade_intents (id, user_id, card_id, intent_type, status) VALUES (?, ?, ?, ?, 'active')"
    ).run(uuidv4(), intent.userId, intent.cardId, intent.type);
  }
}

console.log("Trade users and intents seeded successfully.");
console.log("Matches expected:");
console.log("  - test-user-1 looking_for Charizard <-> trader2 available_for_trade Charizard");
console.log("  - test-user-1 available_for_trade Pikachu <-> trader3 looking_for Pikachu");
