export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'Designili AI Image Generation Service' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { prompt, mode = 'full', style = 'abstract', garment = 'tshirt' } = req.body || {};
    const cleanPrompt = (prompt || '').trim();

    if (!cleanPrompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // Enhance prompt for high-fashion surface textile pattern
    const enhancedPrompt = `${cleanPrompt}, seamless textile pattern print for ${garment}, high fashion luxury aesthetic, 4k resolution`;
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const imageRes = await fetch(pollinationsUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!imageRes.ok) {
      throw new Error(`Upstream image generator returned status ${imageRes.status}`);
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const base64Photo = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({
      photo: base64Photo,
      mimeType: mimeType.includes('png') ? 'image/png' : 'image/jpeg',
      interpretation: {
        language: 'darja_arabizi',
        englishPrompt: cleanPrompt,
        garment: garment,
        source: 'online'
      }
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({
      message: error.message || 'Image generation failed. Please try again.'
    });
  }
}
