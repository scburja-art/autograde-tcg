import fs from "fs";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "../../data/autograde.db");
const BACKUP_DIR = path.join(path.dirname(DB_PATH), "backups");
const MAX_BACKUPS = 5;

if (!fs.existsSync(DB_PATH)) {
  console.log("No database file found, nothing to back up.");
  process.exit(0);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupName = `autograde-${timestamp}.db`;
const backupPath = path.join(BACKUP_DIR, backupName);

fs.copyFileSync(DB_PATH, backupPath);
console.log(`Backup created: ${backupName}`);

// Clean up old backups, keep last MAX_BACKUPS
const backups = fs.readdirSync(BACKUP_DIR)
  .filter((f) => f.startsWith("autograde-") && f.endsWith(".db"))
  .sort()
  .reverse();

if (backups.length > MAX_BACKUPS) {
  const toDelete = backups.slice(MAX_BACKUPS);
  for (const file of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
    console.log(`Deleted old backup: ${file}`);
  }
}

console.log(`${Math.min(backups.length, MAX_BACKUPS)} backup(s) retained`);
