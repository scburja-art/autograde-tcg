import { v4 as uuidv4 } from "uuid";
import db from "../db";

interface Measurements {
  centering_lr: number;
  centering_tb: number;
  edge_score: number;
  corner_score: number;
  whitening_score: number;
}

interface GradeResult {
  estimatedPSA: number;
  psaRange: { low: number; high: number };
  estimatedBGS: number;
  bgsRange: { low: number; high: number };
  confidence: number;
  measurements: Measurements;
  disclaimer: string;
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function simulateMeasurements(): Measurements {
  return {
    centering_lr: randomBetween(48, 52),
    centering_tb: randomBetween(48, 52),
    edge_score: randomBetween(0.60, 0.99),
    corner_score: randomBetween(0.60, 0.99),
    whitening_score: randomBetween(0.70, 0.99),
  };
}

function centeringDeviation(value: number): number {
  // How far from perfect 50/50. E.g., 48 means 48/52, deviation = 2
  return Math.abs(value - 50);
}

function calculatePSA(m: Measurements): { grade: number; low: number; high: number } {
  const lrDev = centeringDeviation(m.centering_lr);
  const tbDev = centeringDeviation(m.centering_tb);
  const maxDev = Math.max(lrDev, tbDev);
  const minScore = Math.min(m.edge_score, m.corner_score, m.whitening_score);

  let grade: number;

  if (maxDev <= 2.5 && minScore > 0.95) {
    // 50/50 to 55/45 range, all scores > 0.95
    grade = 10;
  } else if (maxDev <= 5 && minScore > 0.88) {
    // 55/45 to 60/40 range, all scores > 0.88
    grade = 9;
  } else if (maxDev <= 7.5 && minScore > 0.78) {
    // 60/40 to 65/35 range, all scores > 0.78
    grade = 8;
  } else if (maxDev <= 10 && minScore > 0.68) {
    // 65/35 to 70/30 range, all scores > 0.68
    grade = 7;
  } else {
    grade = 6;
  }

  // Range is +/- 1 clamped to 1-10
  const low = Math.max(1, grade - 1);
  const high = Math.min(10, grade + 1);

  return { grade, low, high };
}

function scoreToBGSSub(score: number): number {
  // Map 0.0-1.0 score to BGS 1-10 sub-grade
  return Math.round(Math.min(10, Math.max(1, score * 10)) * 10) / 10;
}

function centeringToBGSSub(value: number): number {
  // Map centering deviation to BGS sub-grade
  // 0 deviation = 10, 10 deviation = 1
  const dev = centeringDeviation(value);
  return Math.round(Math.min(10, Math.max(1, 10 - dev)) * 10) / 10;
}

function calculateBGS(m: Measurements): { grade: number; low: number; high: number } {
  const centeringSub = Math.min(centeringToBGSSub(m.centering_lr), centeringToBGSSub(m.centering_tb));
  const edgeSub = scoreToBGSSub(m.edge_score);
  const cornerSub = scoreToBGSSub(m.corner_score);
  const surfaceSub = scoreToBGSSub(m.whitening_score);

  // BGS weighted: centering 10%, edges 30%, corners 30%, surface 30%
  const weighted = centeringSub * 0.1 + edgeSub * 0.3 + cornerSub * 0.3 + surfaceSub * 0.3;
  const grade = Math.round(weighted * 10) / 10;

  const low = Math.round(Math.max(1, grade - 0.5) * 10) / 10;
  const high = Math.round(Math.min(10, grade + 0.5) * 10) / 10;

  return { grade, low, high };
}

function calculateConfidence(m: Measurements): number {
  // Higher confidence when measurements are consistent (less spread)
  const scores = [m.edge_score, m.corner_score, m.whitening_score];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / scores.length;
  // Low variance = high confidence. Scale: 0 variance -> 0.95, 0.05 variance -> 0.70
  const confidence = Math.max(0.50, Math.min(0.95, 0.95 - variance * 5));
  return Math.round(confidence * 100) / 100;
}

export function preGradeCard(collectionItemId: string, _imagePath: string): GradeResult {
  const measurements = simulateMeasurements();

  // Store measurements
  const measurementId = uuidv4();
  const gradeResultId = uuidv4();

  const psa = calculatePSA(measurements);
  const bgs = calculateBGS(measurements);
  const confidence = calculateConfidence(measurements);

  // Store grade result
  db.prepare(`
    INSERT INTO grade_results (id, collection_item_id, estimated_psa_grade, estimated_psa_range_low, estimated_psa_range_high, estimated_bgs_grade, estimated_bgs_range_low, estimated_bgs_range_high, confidence_score, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(gradeResultId, collectionItemId, psa.grade, psa.low, psa.high, bgs.grade, bgs.low, bgs.high, confidence);

  // Store measurements linked to grade result
  db.prepare(`
    INSERT INTO grade_measurements (id, grade_result_id, centering_lr, centering_tb, edge_score, corner_score, whitening_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(measurementId, gradeResultId, measurements.centering_lr, measurements.centering_tb, measurements.edge_score, measurements.corner_score, measurements.whitening_score);

  return {
    estimatedPSA: psa.grade,
    psaRange: { low: psa.low, high: psa.high },
    estimatedBGS: bgs.grade,
    bgsRange: { low: bgs.low, high: bgs.high },
    confidence,
    measurements,
    disclaimer: "Visual pre-grade estimate only",
  };
}

export function getGradeHistory(collectionItemId: string) {
  const results = db.prepare(`
    SELECT gr.*, gm.centering_lr, gm.centering_tb, gm.edge_score, gm.corner_score, gm.whitening_score
    FROM grade_results gr
    LEFT JOIN grade_measurements gm ON gm.grade_result_id = gr.id
    WHERE gr.collection_item_id = ?
    ORDER BY gr.created_at DESC
  `).all(collectionItemId);
  return results;
}
