import { v4 as uuidv4 } from "uuid";
import db from "../db";

export const GRADING_COSTS = {
  psa: { economy: 20, regular: 50, express: 150 },
  bgs: { economy: 25, regular: 50, express: 150 },
};

// Grade multipliers over raw price
const GRADE_DISTRIBUTION = [
  { grade: 10, multiplierMin: 10, multiplierMax: 20, probability: 0.05 },
  { grade: 9, multiplierMin: 4, multiplierMax: 8, probability: 0.25 },
  { grade: 8, multiplierMin: 2, multiplierMax: 3, probability: 0.40 },
  { grade: 7, multiplierMin: 1.2, multiplierMax: 1.8, probability: 0.30 },
];

interface PriceRow {
  price_usd: number;
}

interface ROISignalRow {
  id: string;
  card_id: string;
  raw_price: number;
  estimated_grading_cost: number;
  estimated_graded_value: number;
  expected_value: number;
  roi_percentage: number;
  created_at: string;
}

interface ROIResult {
  cardId: string;
  rawPrice: number;
  gradingCost: number;
  expectedValue: number;
  roi: number;
  worthGrading: boolean;
  breakdown: { grade: number; probability: number; estimatedValue: number }[];
}

export function computeROI(cardId: string): ROIResult | null {
  const priceRow = db.prepare(
    "SELECT price_usd FROM price_snapshots WHERE card_id = ? ORDER BY snapshot_date DESC LIMIT 1"
  ).get(cardId) as PriceRow | undefined;

  if (!priceRow) {
    return null;
  }

  const rawPrice = priceRow.price_usd;
  const gradingCost = GRADING_COSTS.psa.economy; // Default to PSA economy

  const breakdown = GRADE_DISTRIBUTION.map((tier) => {
    const avgMultiplier = (tier.multiplierMin + tier.multiplierMax) / 2;
    const estimatedValue = rawPrice * avgMultiplier;
    return {
      grade: tier.grade,
      probability: tier.probability,
      estimatedValue: Math.round(estimatedValue * 100) / 100,
    };
  });

  const expectedValue = breakdown.reduce(
    (sum, b) => sum + b.probability * b.estimatedValue,
    0
  );
  const roundedEV = Math.round(expectedValue * 100) / 100;

  const roi = ((roundedEV - rawPrice - gradingCost) / (rawPrice + gradingCost)) * 100;
  const roundedROI = Math.round(roi * 100) / 100;

  // Store in roi_signals
  db.prepare(`
    INSERT INTO roi_signals (id, card_id, raw_price, estimated_grading_cost, estimated_graded_value, expected_value, roi_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), cardId, rawPrice, gradingCost, roundedEV, roundedEV, roundedROI);

  return {
    cardId,
    rawPrice,
    gradingCost,
    expectedValue: roundedEV,
    roi: roundedROI,
    worthGrading: roundedROI > 20,
    breakdown,
  };
}

export function computeAllROI(): { processed: number; skipped: number } {
  const cards = db.prepare("SELECT id FROM cards_master").all() as { id: string }[];
  let processed = 0;
  let skipped = 0;

  for (const card of cards) {
    const result = computeROI(card.id);
    if (result) {
      processed++;
    } else {
      skipped++;
    }
  }

  return { processed, skipped };
}

export function getTopROICards(limit: number) {
  return db.prepare(`
    SELECT rs.*, cm.name, cm.set_code, cm.rarity
    FROM roi_signals rs
    JOIN cards_master cm ON cm.id = rs.card_id
    WHERE rs.id IN (
      SELECT id FROM roi_signals rs2
      WHERE rs2.card_id = rs.card_id
      ORDER BY rs2.created_at DESC
      LIMIT 1
    )
    ORDER BY rs.roi_percentage DESC
    LIMIT ?
  `).all(limit);
}

export function getCardROI(cardId: string) {
  return db.prepare(`
    SELECT rs.*, cm.name, cm.set_code, cm.rarity
    FROM roi_signals rs
    JOIN cards_master cm ON cm.id = rs.card_id
    WHERE rs.card_id = ?
    ORDER BY rs.created_at DESC
    LIMIT 1
  `).get(cardId);
}
