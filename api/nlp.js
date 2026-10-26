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

  const { prompt } = req.body || {};
  const cleanPrompt = (prompt || '').trim();

  // Basic Darja palette and garment heuristic
  let detectedGarment = 'tshirt';
  const lower = cleanPrompt.toLowerCase();
  if (lower.includes('hoodie') || lower.includes('capuche')) detectedGarment = 'hoodie';
  else if (lower.includes('robe') || lower.includes('foustan')) detectedGarment = 'dress';
  else if (lower.includes('caftan') || lower.includes('kaftan')) detectedGarment = 'caftan';
  else if (lower.includes('karakou')) detectedGarment = 'karakou';
  else if (lower.includes('casquette') || lower.includes('chapeau') || lower.includes('tagia')) detectedGarment = 'hat';
  else if (lower.includes('shoes') || lower.includes('sabbat') || lower.includes('sneaker')) detectedGarment = 'shoes';

  return res.status(200).json({
    interpretation: {
      language: 'darja_arabizi',
      englishPrompt: cleanPrompt,
      garment: detectedGarment,
      source: 'lexicon',
      confidence: 0.95
    }
  });
}
