import { compareTwoStrings } from "string-similarity";
import db from "../db";

interface CardRow {
  id: string;
  name: string;
  number: string | null;
  set_name: string;
  set_code: string;
  rarity: string | null;
  image_url: string | null;
  created_at: string;
}

interface ScanCandidate {
  card: CardRow;
  confidence: number;
}

interface ScanResult {
  matched: boolean;
  confidence: number;
  card: CardRow | null;
  candidates: ScanCandidate[];
}

export function scanCard(
  _imagePath: string,
  hints: { cardName?: string; cardNumber?: string; setCode?: string }
): ScanResult {
  const hintString = [hints.cardName, hints.cardNumber, hints.setCode]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!hintString) {
    return { matched: false, confidence: 0, card: null, candidates: [] };
  }

  const cards = db.prepare("SELECT * FROM cards_master").all() as CardRow[];

  const scored: ScanCandidate[] = cards
    .map((card) => {
      const cardString = [card.name, card.number, card.set_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const confidence = compareTwoStrings(hintString, cardString);
      return { card, confidence };
    })
    .filter((c) => c.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  const top = scored[0];

  if (!top || top.confidence < 0.4) {
    return { matched: false, confidence: top?.confidence ?? 0, card: null, candidates: [] };
  }

  if (top.confidence > 0.7) {
    return { matched: true, confidence: top.confidence, card: top.card, candidates: [] };
  }

  // Medium confidence: return top 5 candidates for user confirmation
  return {
    matched: false,
    confidence: top.confidence,
    card: null,
    candidates: scored.slice(0, 5),
  };
}
