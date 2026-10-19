import express from 'express'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { understandPrompt, toPublicBrief } from '../services/darja.js'
import { rateLimit } from '../middleware/rateLimit.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const router = express.Router();

// Cheap "what did you understand?" check: no GPU, so the user can confirm
// the interpretation of a darja prompt before generating an image.
router.post('/understand', rateLimit({ windowMs: 10 * 60_000, max: 40 }), async (req, res) => {
    const controller = new AbortController();
    const onClose = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', onClose);
    try {
        const { prompt } = req.body || {};
        if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) {
            return res.status(400).json({ message: 'Enter a prompt between 1 and 2000 characters.' });
        }
        const brief = await understandPrompt(prompt.trim(), { signal: controller.signal });
        if (!controller.signal.aborted) res.status(200).json({ interpretation: toPublicBrief(brief) });
    } catch {
        if (!controller.signal.aborted) res.status(502).json({ message: 'Could not interpret the prompt. Try again.' });
    } finally {
        res.off('close', onClose);
    }
})

export default router;
