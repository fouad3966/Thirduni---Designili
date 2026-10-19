import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { beforeEach } from 'node:test';
import { nameColor, describePalette, COLOR_TABLE } from '../services/colors.js';
import { buildArtworkPrompt, normalizeArtworkOptions } from '../services/huggingface.js';
import {
    analyzeText, clearUnderstandCache, lexiconBrief, normalizeText, sanitizeBrief, understandPrompt,
} from '../services/darja.js';

beforeEach(() => clearUnderstandCache());

const brief = (text) => lexiconBrief(analyzeText(text));

test('script detection: Arabic script, Arabizi, and plain English/French', () => {
    assert.equal(analyzeText('بغيت تيشرت كحلة').script, 'arabic');
    assert.equal(analyzeText('bghit hoodie kahla').script, 'arabizi');
    assert.equal(analyzeText('7amra w byad').script, 'arabizi');
    assert.equal(analyzeText('a black floral t-shirt').script, 'latin');
    assert.equal(analyzeText('je veux un t-shirt noir avec des fleurs').script, 'latin');
    assert.equal(analyzeText('3D print on an XL shirt, 5xl').script, 'latin');
});

test('normalizeText folds Arabic-Indic digits, harakat, tatweel and letter repeats', () => {
    assert.equal(normalizeText('كَحْلـــة ٣'), 'كحلة 3');
    assert.equal(normalizeText('kahlaaaaa   zwiiiin'), 'kahlaa zwiin');
});

test('lexicon understands the Arabizi example from the spec', () => {
    const b = brief('bghit hoodie kahla b zellij dahabi w ktiba "DZ" fel sder');
    assert.equal(b.garment, 'hoodie');
    assert.deepEqual(b.palette, ['#0B0B0B', '#D4AF37']);
    assert.equal(b.textOnGarment, 'DZ');
    assert.equal(b.textPlacement, 'front');
    assert.match(b.englishPrompt, /zellige/);
    assert.match(b.englishPrompt, /zellige.* in gold on a black background/);
    assert.equal(b.style, 'heritage');
    assert.equal(b.language, 'darja_arabizi');
});

test('lexicon understands Arabic script with clitic prefixes (ب / و)', () => {
    const b = brief('بغيت تيشرت كحلة بزليج وذهبي');
    assert.equal(b.garment, 'tshirt');
    assert.deepEqual(b.palette, ['#0B0B0B', '#D4AF37']);
    assert.match(b.englishPrompt, /zellige/);
    assert.equal(b.language, 'darja_arabic');
});

test('lexicon handles accents, French mix and trigger-word text', () => {
    const b = brief('nbghi robe sport hamra et dorée ktiba Oran');
    assert.equal(b.garment, 'dress');
    assert.equal(b.style, 'sport');
    assert.equal(b.textOnGarment, 'Oran');
});

test('a single color gives no palette (the image API requires 2-4)', () => {
    const b = brief('bghit tricot kahla');
    assert.equal(b.palette, null);
    assert.match(b.englishPrompt, /black/);
});

test('homonyms and common Arabizi spellings like "get khal" resolve accurately to black cat', () => {
    const b = brief('get khal');
    assert.equal(b.language, 'darja_arabizi');
    assert.match(b.englishPrompt, /cat/);
    assert.match(b.englishPrompt, /black/);
});

test('sanitizeBrief rejects invalid model output and keeps lexicon values', () => {
    const fallback = brief('bghit hoodie kahla w dahabi');
    const ok = sanitizeBrief({
        language: 'darja_arabizi', garment: 'spaceship', style: 'wild', palette: ['red', '#12'],
        englishPrompt: 'Gold geometric lines\u0000 on black', textOnGarment: 'null', textPlacement: 'ceiling', confidence: 7,
    }, fallback);
    assert.equal(ok.garment, 'hoodie');
    assert.equal(ok.style, fallback.style);
    assert.deepEqual(ok.palette, fallback.palette);
    assert.equal(ok.textOnGarment, null);
    assert.equal(ok.textPlacement, null);
    assert.equal(ok.confidence, 1);
    assert.equal(ok.englishPrompt, 'Gold geometric lines on black');
    assert.throws(() => sanitizeBrief({ englishPrompt: '' }, fallback));
    assert.throws(() => sanitizeBrief(null, fallback));
});

test('English prompts pass through without any provider call', async () => {
    let calls = 0;
    const result = await understandPrompt('Racing stripes in navy', {
        env: { NLP_PROVIDER: 'gemini', NLP_MODEL: 'm', NLP_API_KEY: 'k' },
        fetchImpl: async () => { calls += 1; },
    });
    assert.equal(result.source, 'passthrough');
    assert.equal(result.style, 'sport');
    assert.equal(result.englishPrompt, 'Racing stripes in navy');
    assert.equal(calls, 0);
});

test('lexicon provider (default) never calls the network', async () => {
    const result = await understandPrompt('bghit hoodie kahla w dahabi', {
        env: {}, fetchImpl: async () => { throw new Error('network must not be used'); },
    });
    assert.equal(result.source, 'lexicon');
    assert.equal(result.garment, 'hoodie');
});

test('Gemini result is validated, merged with the lexicon, and cached', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        const payload = { language: 'darja_arabizi', garment: 'hoodie', style: 'abstract', palette: ['#0b0b0b', '#d4af37'],
            englishPrompt: 'Gold zellige tiles on black.', textOnGarment: null, textPlacement: null, confidence: 0.9 };
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }));
    };
    const env = { NLP_PROVIDER: 'gemini', NLP_MODEL: 'test-model', GEMINI_API_KEY: 'secret-key' };
    const text = 'bghit hoodie kahla b zellij dahabi w ktiba "DZ"';
    const first = await understandPrompt(text, { env, fetchImpl });
    assert.equal(first.source, 'llm');
    assert.deepEqual(first.palette, ['#0B0B0B', '#D4AF37']);
    assert.equal(first.textOnGarment, 'DZ');          // LLM said null; explicit quoted text wins
    assert.match(calls[0].url, /models\/test-model:generateContent$/);
    assert.equal(calls[0].init.headers['x-goog-api-key'], 'secret-key');
    assert.ok(!calls[0].url.includes('secret-key'), 'key must not be in the URL');
    await understandPrompt(text, { env, fetchImpl });
    assert.equal(calls.length, 1, 'second identical prompt is served from cache');
});

test('OpenAI-compatible provider is supported', async () => {
    let seen;
    const fetchImpl = async (url, init) => {
        seen = { url, init };
        const content = JSON.stringify({ englishPrompt: 'Red and white bands with rock art.', garment: 'tshirt', confidence: 0.8 });
        return new Response(JSON.stringify({ choices: [{ message: { content: `\`\`\`json\n${content}\n\`\`\`` } }] }));
    };
    const result = await understandPrompt('ndir maillot hamra w bayda', {
        env: { NLP_PROVIDER: 'openai', NLP_MODEL: 'm', NLP_API_KEY: 'k', NLP_BASE_URL: 'http://localhost:11434/v1/' }, fetchImpl,
    });
    assert.equal(seen.url, 'http://localhost:11434/v1/chat/completions');
    assert.equal(result.source, 'llm');
    assert.equal(result.garment, 'tshirt');
});

test('LLM failure falls back to the lexicon instead of failing generation', async () => {
    const warn = console.warn; console.warn = () => {};
    try {
        const result = await understandPrompt('bghit hoodie kahla w dahabi', {
            env: { NLP_PROVIDER: 'gemini', NLP_MODEL: 'm', NLP_API_KEY: 'k' },
            fetchImpl: async () => new Response('boom', { status: 500 }),
        });
        assert.equal(result.source, 'lexicon');
        assert.equal(result.garment, 'hoodie');
    } finally { console.warn = warn; }
});

/* ---------- Arabizi robustness: inconsistent spelling ---------- */

test('Arabizi spelling variants resolve to the same meaning', () => {
    const black = ['kahla', 'k7ala', 'ka7la', 'kahal', 'k7al', 'kehla', 'kahlaaa'];
    for (const word of black) {
        assert.deepEqual(brief(`bghit hoodie ${word} w dahabi`).palette, ['#0B0B0B', '#D4AF37'], word);
    }
    for (const word of ['zerga', 'zrag', 'zarqa', 'azrag', 'zerqa']) {
        assert.deepEqual(brief(`nheb tshirt ${word} w bayda`).palette, ['#1F4E9E', '#F5F5F0'], word);
    }
    for (const word of ['tishirt', 'tichirt', 'tshirt', 'teeshirt', 'tshert']) {
        assert.equal(brief(`bghit ${word} kahla`).garment, 'tshirt', word);
    }
    for (const word of ['zellij', 'zlij', 'zelij', 'zellige', 'zlige']) {
        assert.match(brief(`bghit hoodie b ${word}`).englishPrompt, /zellige/, word);
    }
});

test('the feminine/nisba ending separates kahla (black) from kahli (navy)', () => {
    assert.equal(brief('bghit hoodie kahla w dahabi').palette[0], '#0B0B0B');
    assert.equal(brief('bghit hoodie kahli w dahabi').palette[0], '#14213D');
});

test('fuzzy matching never turns plain English into darja', () => {
    assert.equal(analyzeText('A word cloud pattern, safari animals').script, 'latin');
    assert.equal(analyzeText('geometric waves in teal').script, 'latin');
});

test('shade words adjust the color: fatha = lighter, ghamqa = darker', () => {
    const plain = brief('bghit tshirt zerga w bayda').palette[0];
    const light = brief('bghit tshirt zerga fatha w bayda').palette[0];
    const dark = brief('bghit tshirt zerga ghamqa w bayda').palette[0];
    assert.notEqual(light, plain);
    assert.notEqual(dark, plain);
    assert.match(brief('bghit tshirt zerga fatha w bayda').englishPrompt, /light blue/);
});

test('negation removes what follows (bla / sans / بلا)', () => {
    assert.equal(brief('bghit hoodie bla zellij dahabi').style, null);
    assert.equal(brief('bghit tshirt kahla bla ktiba "DZ"').textOnGarment, null);
    assert.doesNotMatch(brief('hoodie sans zellij w kahla w dahabi').englishPrompt, /zellige/);
    assert.equal(brief('بغيت تيشرت كحلة بلا كتابة').textOnGarment, null);
});

test('color roles follow word order: base before the motif, motif color after it', () => {
    assert.match(brief('hoodie kahla b zellij dahabi').englishPrompt, /in gold on a black background/);
    assert.match(brief('hoodie zellij dahabi 3la kahla').englishPrompt, /in gold on a black background/);
    assert.deepEqual(brief('hoodie zellij dahabi 3la kahla').palette, ['#0B0B0B', '#D4AF37']);
});

test('cultural motifs imply the heritage style, explicit style words win', () => {
    assert.equal(brief('bghit robba b karakou dahabi').style, 'heritage');
    assert.equal(brief('bghit tshirt sport b zellij').style, 'sport');
    assert.equal(brief('bghit tshirt b sahra').style, null);
});

test('flag, crescent and shapes: new vocabulary and implied flag colors', () => {
    const flag = brief('bghit tshirt b 3alam');
    assert.deepEqual(flag.palette, ['#006233', '#F5F5F0', '#D21034']);
    assert.match(brief('bghit tshirt b nejma w hilal').englishPrompt, /stars.*crescent|crescent.*stars/);
});

test('traditional garments map to the closest supported garment', () => {
    assert.equal(brief('bghit gandoura bayda').garment, 'dress');
    assert.equal(brief('bghit kachabia kahla').garment, 'hoodie');
    assert.equal(brief('bghina tailleur zerga').garment, 'suit');
});

test('vague requests stay vague instead of inventing details', () => {
    const b = brief('bghit chi haja zwina');
    assert.equal(b.garment, null);
    assert.equal(b.palette, null);
    assert.ok(b.confidence < 0.4);
});

/* ---------- Design quality: color names and prompt structure ---------- */

test('every lexicon color has an exact descriptive name', () => {
    const exact = Object.fromEntries(COLOR_TABLE.map(([name, hex]) => [hex, name]));
    for (const hex of ['#0B0B0B', '#B3202A', '#1F4E9E', '#1E7B4A', '#F5F5F0', '#F2C94C', '#D4AF37', '#14213D', '#7A1E2E']) {
        assert.equal(nameColor(hex), exact[hex]);
    }
    assert.equal(describePalette(['#0B0B0B', '#D4AF37']), 'deep black, rich metallic gold');
    assert.equal(nameColor('#102A43'), 'midnight navy');
});

test('the image prompt leads with the subject, names colors, and keeps hex anchors', () => {
    const prompt = buildArtworkPrompt('geometric zellige tiles in gold on a black background.', 'full', {
        style: 'heritage', palette: ['#0B0B0B', '#D4AF37'], garment: 'hoodie',
    });
    assert.ok(prompt.startsWith('geometric zellige tiles in gold on a black background. '), 'subject first, no double period');
    assert.match(prompt, /Palette, background first: deep black, rich metallic gold \(#0B0B0B, #D4AF37\)/);
    assert.match(prompt, /Heritage North African textile/);
    assert.match(prompt, /seamless repeating textile pattern for a hoodie, edge-to-edge/);
    assert.ok(prompt.split(/\s+/).length < 100, 'stays within the text encoder budget');
    assert.equal(normalizeArtworkOptions({ style: 'heritage' }).style, 'heritage');
});

/* ---------- Regression floors on the evaluation sets ---------- */

const accuracy = async (file) => {
    const cases = JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
    let ok = 0; let total = 0;
    for (const { text, expect } of cases) {
        const result = await understandPrompt(text, { env: {} });
        const actual = { ...result, script: analyzeText(text).script };
        for (const [field, value] of Object.entries(expect)) {
            total += 1;
            if (JSON.stringify(actual[field] ?? null) === JSON.stringify(value ?? null)) ok += 1;
        }
    }
    return ok / total;
};

test('evaluation sets stay above their accuracy floors', async () => {
    assert.ok(await accuracy('darja-eval.json') >= 0.97, 'development set regressed');
    assert.ok(await accuracy('darja-heldout.json') >= 0.9, 'held-out set regressed');
});
