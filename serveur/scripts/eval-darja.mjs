// Field-level accuracy of the offline darja lexicon engine.
// Usage:  node scripts/eval-darja.mjs            (development set: spellings the lexicon was built from)
//         node scripts/eval-darja.mjs --heldout  (unseen spellings: the realistic estimate)
//         node scripts/eval-darja.mjs --verbose  (every case)
// Add real user prompts to the fixture to keep this honest: the shipped cases were written by
// the developer and are therefore an optimistic estimate of real-world accuracy.
import { readFileSync } from 'node:fs';
import { analyzeText, lexiconBrief, understandPrompt } from '../services/darja.js';

const heldout = process.argv.includes('--heldout');
const cases = JSON.parse(readFileSync(new URL(`../test/fixtures/${heldout ? 'darja-heldout' : 'darja-eval'}.json`, import.meta.url), 'utf8'));
const verbose = process.argv.includes('--verbose');

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const totals = {};
const failures = [];
let perfect = 0;

for (const { text, expect } of cases) {
    const result = await understandPrompt(text, { env: {} });
    const analysis = analyzeText(text);
    const actual = { ...result, script: analysis.script };
    let allOk = true;
    for (const field of Object.keys(expect)) {
        totals[field] ??= { ok: 0, total: 0 };
        totals[field].total += 1;
        const ok = same(actual[field], expect[field]);
        if (ok) totals[field].ok += 1; else { allOk = false; failures.push({ text, field, expected: expect[field], actual: actual[field] }); }
    }
    if (allOk) perfect += 1;
    if (verbose) console.log(`${allOk ? 'PASS' : 'FAIL'}  ${text}`);
}

const pct = (n, d) => `${((100 * n) / d).toFixed(1)}%`;
console.log(`\nCases fully correct: ${perfect}/${cases.length} (${pct(perfect, cases.length)})`);
for (const [field, { ok, total }] of Object.entries(totals)) console.log(`  ${field.padEnd(15)} ${String(ok).padStart(3)}/${String(total).padEnd(3)} ${pct(ok, total)}`);
if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  "${f.text}"\n     ${f.field}: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}`);
}
// Exit code lets CI guard against regressions.
const floor = Number(process.env.EVAL_MIN_FIELD_ACCURACY ?? 0);
const overall = Object.values(totals).reduce((a, t) => ({ ok: a.ok + t.ok, total: a.total + t.total }), { ok: 0, total: 0 });
console.log(`\nOverall field accuracy: ${pct(overall.ok, overall.total)}`);
if (overall.ok / overall.total < floor) process.exit(1);
