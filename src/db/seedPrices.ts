import { initializeDatabase } from "./index";
import { ingestPrices } from "../services/priceIngestion";

initializeDatabase();

console.log("Seeding price history (3 rounds)...");

for (let i = 1; i <= 3; i++) {
  const inserted = ingestPrices();
  console.log(`  Round ${i}: ${inserted} prices inserted`);
}

console.log("Price seeding complete");
