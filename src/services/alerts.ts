import { v4 as uuidv4 } from "uuid";
import db from "../db";

interface PriceSnapshotPair {
  card_id: string;
  card_name: string;
  latest_price: number;
  previous_price: number;
}

export function detectPriceSpikes(thresholdPercent: number = 10): number {
  // For each card, compare the two most recent price snapshots
  const cards = db.prepare("SELECT DISTINCT card_id FROM price_snapshots").all() as { card_id: string }[];
  let alertCount = 0;

  for (const { card_id } of cards) {
    const snapshots = db.prepare(
      "SELECT price_usd, snapshot_date FROM price_snapshots WHERE card_id = ? ORDER BY snapshot_date DESC LIMIT 2"
    ).all(card_id) as { price_usd: number; snapshot_date: string }[];

    if (snapshots.length < 2) continue;

    const latest = snapshots[0].price_usd;
    const previous = snapshots[1].price_usd;
    const changePercent = ((latest - previous) / previous) * 100;

    if (Math.abs(changePercent) < thresholdPercent) continue;

    const card = db.prepare("SELECT name, set_code FROM cards_master WHERE id = ?").get(card_id) as { name: string; set_code: string };
    const direction = changePercent > 0 ? "up" : "down";
    const title = `Price ${direction === "up" ? "spike" : "drop"}: ${card.name}`;
    const message = `${card.name} (${card.set_code}) price moved ${direction} ${Math.abs(Math.round(changePercent))}% from $${previous.toFixed(2)} to $${latest.toFixed(2)}`;

    // Find all users who have this card in their collection
    const users = db.prepare(`
      SELECT DISTINCT c.user_id
      FROM collections c
      JOIN collection_items ci ON ci.collection_id = c.id
      WHERE ci.card_id = ?
    `).all(card_id) as { user_id: string }[];

    for (const { user_id } of users) {
      db.prepare(
        "INSERT INTO alerts (id, user_id, alert_type, title, message, card_id) VALUES (?, ?, 'price_spike', ?, ?, ?)"
      ).run(uuidv4(), user_id, title, message, card_id);
      alertCount++;
    }
  }

  return alertCount;
}

export function detectPortfolioChanges(thresholdPercent: number = 5): number {
  const users = db.prepare("SELECT DISTINCT user_id FROM collections").all() as { user_id: string }[];
  let alertCount = 0;

  for (const { user_id } of users) {
    // Get current portfolio value using latest prices
    const currentValue = db.prepare(`
      SELECT COALESCE(SUM(ps.price_usd * ci.quantity), 0) as total
      FROM collection_items ci
      JOIN collections c ON c.id = ci.collection_id
      JOIN (
        SELECT card_id, price_usd FROM price_snapshots ps1
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM price_snapshots ps2 WHERE ps2.card_id = ps1.card_id)
      ) ps ON ps.card_id = ci.card_id
      WHERE c.user_id = ?
    `).get(user_id) as { total: number };

    // Get previous portfolio value using second-latest prices
    const previousValue = db.prepare(`
      SELECT COALESCE(SUM(ps.price_usd * ci.quantity), 0) as total
      FROM collection_items ci
      JOIN collections c ON c.id = ci.collection_id
      JOIN (
        SELECT card_id, price_usd FROM price_snapshots ps1
        WHERE snapshot_date = (
          SELECT MAX(snapshot_date) FROM price_snapshots ps2
          WHERE ps2.card_id = ps1.card_id
          AND ps2.snapshot_date < (SELECT MAX(snapshot_date) FROM price_snapshots ps3 WHERE ps3.card_id = ps1.card_id)
        )
      ) ps ON ps.card_id = ci.card_id
      WHERE c.user_id = ?
    `).get(user_id) as { total: number };

    if (previousValue.total === 0) continue;

    const changePercent = ((currentValue.total - previousValue.total) / previousValue.total) * 100;

    if (Math.abs(changePercent) < thresholdPercent) continue;

    const direction = changePercent > 0 ? "increased" : "decreased";
    const title = `Portfolio ${direction}`;
    const message = `Your portfolio value ${direction} by ${Math.abs(Math.round(changePercent))}% from $${previousValue.total.toFixed(2)} to $${currentValue.total.toFixed(2)}`;

    db.prepare(
      "INSERT INTO alerts (id, user_id, alert_type, title, message) VALUES (?, ?, 'portfolio_change', ?, ?)"
    ).run(uuidv4(), user_id, title, message);
    alertCount++;
  }

  return alertCount;
}

export function detectROIOpportunities(minROI: number = 50): number {
  // Find high-ROI cards without a recent alert (within last 24 hours)
  const signals = db.prepare(`
    SELECT rs.card_id, rs.roi_percentage, rs.raw_price, rs.expected_value,
           cm.name, cm.set_code
    FROM roi_signals rs
    JOIN cards_master cm ON cm.id = rs.card_id
    WHERE rs.roi_percentage >= ?
    AND rs.id IN (
      SELECT id FROM roi_signals rs2
      WHERE rs2.card_id = rs.card_id
      ORDER BY rs2.created_at DESC
      LIMIT 1
    )
    AND rs.card_id NOT IN (
      SELECT DISTINCT card_id FROM alerts
      WHERE alert_type = 'roi_opportunity'
      AND card_id IS NOT NULL
      AND created_at > datetime('now', '-1 day')
    )
  `).all(minROI) as { card_id: string; roi_percentage: number; raw_price: number; expected_value: number; name: string; set_code: string }[];

  // Get paid users
  const paidUsers = db.prepare(
    "SELECT DISTINCT user_id FROM subscriptions WHERE plan IN ('starter', 'pro', 'premium') AND status = 'active'"
  ).all() as { user_id: string }[];

  let alertCount = 0;

  for (const signal of signals) {
    const title = `ROI opportunity: ${signal.name}`;
    const message = `${signal.name} (${signal.set_code}) has ${Math.round(signal.roi_percentage)}% ROI potential. Raw: $${signal.raw_price.toFixed(2)}, Expected graded value: $${signal.expected_value.toFixed(2)}`;

    for (const { user_id } of paidUsers) {
      db.prepare(
        "INSERT INTO alerts (id, user_id, alert_type, title, message, card_id) VALUES (?, ?, 'roi_opportunity', ?, ?, ?)"
      ).run(uuidv4(), user_id, title, message, signal.card_id);
      alertCount++;
    }
  }

  return alertCount;
}

export function getUserAlerts(userId: string, unreadOnly: boolean = false) {
  const where = unreadOnly
    ? "WHERE user_id = ? AND is_read = 0"
    : "WHERE user_id = ?";
  return db.prepare(`
    SELECT a.*, cm.name as card_name, cm.set_code
    FROM alerts a
    LEFT JOIN cards_master cm ON cm.id = a.card_id
    ${where}
    ORDER BY a.created_at DESC
  `).all(userId);
}

export function markAlertRead(alertId: string, userId: string): boolean {
  const result = db.prepare(
    "UPDATE alerts SET is_read = 1 WHERE id = ? AND user_id = ?"
  ).run(alertId, userId);
  return result.changes > 0;
}
