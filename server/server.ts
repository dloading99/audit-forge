import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { storage } from './storage.js';
import { startAudit } from './runner.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// List Audits
app.get('/api/audits', (req, res) => {
  try {
    const audits = storage.getAll();
    // Sort by date desc
    audits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(audits);
  } catch (error) {
    console.error('Error listing audits:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create Audit
app.post('/api/audits', async (req, res) => {
  try {
    const { url, maxPages } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const newAudit = storage.create(url);

    // Trigger background processing
    startAudit(newAudit.id, maxPages || 20).catch(err => {
      console.error(`Audit ${newAudit.id} failed to start:`, err);
    });

    res.status(201).json(newAudit);
  } catch (error) {
    console.error('Error creating audit:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Audit Detail
app.get('/api/audits/:id', (req, res) => {
  try {
    const audit = storage.get(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    res.json(audit);
  } catch (error) {
    console.error(`Error getting audit ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Audit Report (Markdown)
app.get('/api/audits/:id/report', (req, res) => {
  try {
    const audit = storage.get(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    res.json({ markdown: audit.reportMarkdown || '' });
  } catch (error) {
    console.error(`Error getting report for ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});