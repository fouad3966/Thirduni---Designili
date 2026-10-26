import { understandPrompt, toPublicBrief } from '../src/config/darja/darja.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', message: 'Designili Darja NLP Service' });
  }

  try {
    const { prompt } = req.body || {};
    const cleanPrompt = (prompt || '').trim();

    if (!cleanPrompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const brief = await understandPrompt(cleanPrompt);
    return res.status(200).json({ interpretation: toPublicBrief(brief) });
  } catch (err) {
    console.error('NLP error:', err);
    return res.status(500).json({ message: 'Could not process prompt' });
  }
}
