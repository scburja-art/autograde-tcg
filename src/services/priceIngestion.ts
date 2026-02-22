import { v4 as uuidv4 } from "uuid";
import db from "../db";

interface Card {
  id: string;
  rarity: string | null;
}

interface PriceSnapshot {
  id: string;
  card_id: string;
  price_usd: number;
  source: string;
  snapshot_date: string;
  created_at: string;
}

const PRICE_RANGES: Record<string, [number, number]> = {
  common: [0.1, 2.0],
  uncommon: [0.25, 5.0],
  rare: [1.0, 20.0],
  "holo rare": [5.0, 100.0],
  "ultra rare": [20.0, 300.0],
  "secret rare": [50.0, 500.0],
};

function generatePrice(rarity: string | null): number {
  const range = PRICE_RANGES[rarity || "common"] || PRICE_RANGES.common;
  const [min, max] = range;
  const base = min + Math.random() * (max - min);
  const variance = base * (0.95 + Math.random() * 0.1); // +/- 5%
  return Math.round(variance * 100) / 100;
}

export function ingestPrices(): number {
  const today = new Date().toISOString().split("T")[0];
  const cards = db.prepare("SELECT id, rarity FROM cards_master").all() as Card[];

  const insert = db.prepare(
    "INSERT INTO price_snapshots (id, card_id, price_usd, source, snapshot_date) VALUES (?, ?, ?, ?, ?)"
  );

  const insertAll = db.transaction((cards: Card[]) => {
    let count = 0;
    for (const card of cards) {
      const price = generatePrice(card.rarity);
      insert.run(uuidv4(), card.id, price, "mock", today);
      count++;
    }
    return count;
  });

  return insertAll(cards);
}

export function getLatestPrice(cardId: string): PriceSnapshot | undefined {
  return db
    .prepare(
      "SELECT * FROM price_snapshots WHERE card_id = ? ORDER BY snapshot_date DESC, created_at DESC LIMIT 1"
    )
    .get(cardId) as PriceSnapshot | undefined;
}

export function getPriceHistory(cardId: string, range: string): PriceSnapshot[] {
  const now = new Date();
  let startDate: string;

  switch (range) {
    case "d":
      startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      break;
    case "w":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      break;
    case "m":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      break;
    case "3m":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      break;
    case "6m":
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      break;
    case "y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      break;
    case "all":
      return db
        .prepare(
          "SELECT * FROM price_snapshots WHERE card_id = ? ORDER BY snapshot_date ASC, created_at ASC"
        )
        .all(cardId) as PriceSnapshot[];
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  }

  return db
    .prepare(
      "SELECT * FROM price_snapshots WHERE card_id = ? AND snapshot_date >= ? ORDER BY snapshot_date ASC, created_at ASC"
    )
    .all(cardId, startDate) as PriceSnapshot[];
}