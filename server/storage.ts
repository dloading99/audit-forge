import fs from 'fs';
import path from 'path';
import { Audit, AuditStatus } from '../types.js';

// Simple JSON file storage
// Use process.cwd() to ensure we write to the project folder, not root
const DATA_DIR = path.join((process as any).cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'audits.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to init DB file:', err);
  }
}

function readDb(): Audit[] {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading DB:', e);
    return [];
  }
}

function writeDb(audits: Audit[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(audits, null, 2));
  } catch (e) {
    console.error('Error writing DB:', e);
  }
}

export const storage = {
  getAll: (): Audit[] => {
    return readDb();
  },

  get: (id: string): Audit | undefined => {
    const audits = readDb();
    return audits.find(a => a.id === id);
  },

  create: (url: string): Audit => {
    const audits = readDb();
    const newAudit: Audit = {
      id: crypto.randomUUID(),
      url,
      status: AuditStatus.QUEUED,
      createdAt: new Date().toISOString(),
      scores: { overall: 0, seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 },
      issuesSummary: { critical: 0, major: 0, minor: 0, byCategory: { seo: 0, performance: 0, accessibility: 0, content: 0, uxDesign: 0 } },
      pages: []
    };
    audits.push(newAudit);
    writeDb(audits);
    return newAudit;
  },

  update: (id: string, updates: Partial<Audit>) => {
    const audits = readDb();
    const index = audits.findIndex(a => a.id === id);
    if (index !== -1) {
      audits[index] = { ...audits[index], ...updates };
      writeDb(audits);
    }
  }
};