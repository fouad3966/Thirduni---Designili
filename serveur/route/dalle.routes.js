import express from 'express'
import * as dotenv from 'dotenv'
import OpenAI from 'openai'
import { fileURLToPath } from 'node:url'
import { generateWithHuggingFace, ImageGenerationError, normalizeArtworkOptions } from '../services/huggingface.js'
import { understandPrompt, toPublicBrief } from '../services/darja.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const router = express.Router();

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER || 'huggingface';
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

const generateWithOpenAI = async (prompt) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // gpt-image models always return base64 (b64_json)
    const response = await openai.images.generate({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'low',
    });

    return response.data[0].b64_json;
}

// Legacy integration, used only when explicitly selected.
const generateWithPollinations = async (prompt) => {
    const response = await fetch(
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`
    );

    if (!response.ok) {
        const error = new Error(`Pollinations request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString('base64');
}

const generateWithGemini = async (prompt) => {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseModalities: ['IMAGE'] },
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error?.message || 'Gemini request failed');
        error.status = response.status;
        throw error;
    }

    const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
    if (!imagePart) throw new Error('Gemini did not return an image');

    return imagePart.inlineData.data;
}

router.route('/').get((req, res) => {
    res.status(200).json({ message: 'Image generation service', provider: IMAGE_PROVIDER })
})

router.route('/').post(async (req, res) => {
    const controller = new AbortController();
    const onClose = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', onClose);
    try {
        const { prompt, mode, style, palette, seed, garment } = req.body || {};

        if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) {
            return res.status(400).json({ message: 'Enter a prompt between 1 and 2000 characters.' });
        }

        // Darja / Arabizi / Arabic-script prompts are interpreted into an English design brief.
        // English and French prompts pass through untouched (no extra latency or LLM call).
        const brief = await understandPrompt(prompt.trim(), { signal: controller.signal });

        // The brief only fills in what the client left open: an explicit style, palette or
        // garment sent by the client always wins, except that a garment named in the prompt
        // ("bghit hoodie...") switches the garment. Remove `switchGarment` to disable that.
        const switchGarment = brief.garment && (brief.source === 'lexicon' || brief.confidence >= 0.6);
        const resolvedStyle = style === undefined || style === 'auto' ? (brief.style || 'abstract') : style;
        const resolvedPalette = palette === undefined ? (brief.palette || undefined) : palette;
        const resolvedGarment = switchGarment ? brief.garment : garment;
        const effectivePrompt = brief.englishPrompt || prompt.trim();
        const interpretation = toPublicBrief(brief, { style: resolvedStyle, garment: resolvedGarment ?? brief.garment });

        const artworkOptions = normalizeArtworkOptions({
            mode, style: resolvedStyle, palette: resolvedPalette, seed, garment: resolvedGarment,
        });

        if (IMAGE_PROVIDER === 'huggingface') {
            const image = await generateWithHuggingFace(effectivePrompt, { ...artworkOptions, signal: controller.signal });
            if (!controller.signal.aborted) res.status(200).json({ ...image, interpretation });
            return;
        }

        const generators = {
            pollinations: generateWithPollinations,
            gemini: generateWithGemini,
            openai: generateWithOpenAI,
        };

        const generator = Object.hasOwn(generators, IMAGE_PROVIDER) ? generators[IMAGE_PROVIDER] : null;
        if (!generator) throw new ImageGenerationError('Unknown IMAGE_PROVIDER. Set IMAGE_PROVIDER=huggingface in serveur/.env.', 503);
        const image = await generator(effectivePrompt);

        res.status(200).json({ photo: image, interpretation });
    } catch (error) {
        if (controller.signal.aborted) return;
        // Provider errors can contain authorization headers: do not log raw error objects.
        const status = error instanceof ImageGenerationError ? error.status : 502;
        res.status(status).json({ message: error instanceof ImageGenerationError ? error.message : 'Image generation failed. Check your provider configuration and try again.' });
    } finally {
        res.off('close', onClose);
    }
})

export default router;
