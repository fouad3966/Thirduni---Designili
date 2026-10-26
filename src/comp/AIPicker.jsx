import React from 'react';
import { useSnapshot } from 'valtio';
import state, { openPricing } from '../store';
import { getPlanQuota, ALL_PLANS } from '../config/pricingPlans';
import CustomButtom from './CustomButtom';

const LANGUAGE_LABELS = {
  darja_arabic: 'Darja (الدارجة)',
  darja_arabizi: 'Darja (Arabizi)',
  msa: 'Arabic',
  french: 'French',
  english: 'English',
  mixed: 'Mixed languages',
  other: 'Other',
};

const GARMENT_LABELS = {
  tshirt: 'T-shirt',
  hoodie: 'Hoodie',
  dress: 'Dress',
  caftan: 'Caftan',
  karakou: 'Karakou',
  hat: 'Cap',
  shoes: 'Shoes',
};

// Shows what the darja NLP layer understood, so the user can correct the prompt before generating.
const Interpretation = ({ interpretation, garment }) => {
  if (!interpretation) return null;
  if (interpretation.source === 'passthrough') {
    return (
      <div className='text-xs rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-2.5 flex flex-col gap-1' role='status'>
        <div className='flex items-center justify-between gap-2'>
          <span className='font-bold uppercase text-[10px] text-emerald-400'>✓ Direct English / French</span>
          <span className='text-[10px] text-emerald-300 font-medium'>Ready</span>
        </div>
        <p className='text-slate-200 text-[11px] leading-relaxed'>Prompt recognized as English/French. It will be sent directly to the AI image generator.</p>
      </div>
    );
  }
  const { language, englishPrompt, palette, textOnGarment, garment: detectedGarment } = interpretation;
  const garmentName = GARMENT_LABELS[detectedGarment || garment];
  const textUnsupported = textOnGarment && (detectedGarment || garment) !== 'tshirt';
  return (
    <div className='text-xs rounded-xl bg-slate-800/80 border border-violet-500/40 p-2.5 flex flex-col gap-1.5' role='status'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-bold uppercase text-[10px] text-violet-400'>Understood</span>
        <span className='text-[10px] text-slate-300 font-medium'>{LANGUAGE_LABELS[language] || language}</span>
      </div>
      <p className='text-white font-medium text-xs break-words' dir='ltr'>{englishPrompt}</p>
      <div className='flex flex-wrap items-center gap-2 text-[11px] text-slate-200 pt-0.5'>
        {garmentName && <span className='px-2 py-0.5 rounded-md bg-slate-700/80 border border-white/10 text-white font-semibold'>{garmentName}</span>}
        {palette?.map(color => <Swatch key={color} color={color} />)}
        {textOnGarment && (
          <span className='px-2 py-0.5 rounded-md bg-slate-700/80 border border-white/10 text-white font-semibold' dir='auto'>
            Text: {textOnGarment}
          </span>
        )}
      </div>
      {textUnsupported && <p className='text-[11px] text-amber-300 font-medium'>Text printing is only available on T-shirts.</p>}
    </div>
  );
};

const Swatch = ({ color }) => (
  <span title={color} className='inline-block w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs' style={{ backgroundColor: color }} />
);

// Tells the user when the generated image drifted from the requested colors, and fixes it on demand.
const ColorMatchNotice = ({ colorMatch, matching, handleMatchColors, handleRestoreColors }) => {
  if (!colorMatch || colorMatch.status === 'ok') return null;
  const matched = colorMatch.status === 'matched';
  return (
    <div
      role='status'
      className={`text-xs rounded-xl border p-2.5 flex flex-col gap-1.5 ${matched ? 'bg-emerald-950/60 border-emerald-500/40' : 'bg-amber-950/60 border-amber-500/40'}`}
    >
      {matched ? (
        <p className='text-emerald-200 font-medium'>Colors matched to your requested palette.</p>
      ) : (
        <div className='flex flex-wrap items-center gap-1.5 text-amber-200'>
          <span>Color drift detected:</span>
          {colorMatch.missing.map(color => <Swatch key={color} color={color} />)}
          <span className='text-slate-300'>(missing)</span>
        </div>
      )}
      <button
        type='button'
        onClick={matched ? handleRestoreColors : handleMatchColors}
        disabled={matching}
        className='self-start px-2.5 py-1 rounded-lg border border-white/20 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold disabled:opacity-50 transition'
      >
        {matched ? 'Use original colors' : matching ? 'Matching...' : 'Match my colors'}
      </button>
    </div>
  );
};

const AIPicker = ({
  prompt, setPrompt, generatingImg, generationError, handleSubmit,
  interpretation, previewing, handlePreview, garment,
  colorMatch, matching, handleMatchColors, handleRestoreColors,
}) => {
  const snap = useSnapshot(state);
  const quota = getPlanQuota(snap.currentPlan, snap.billingCycle);
  const used = snap.generationsUsed || 0;
  const isExhausted = quota !== Infinity && used >= quota;
  const planConfig = ALL_PLANS[snap.currentPlan] || ALL_PLANS.free;

  const handleGenerateClick = (type) => {
    if (isExhausted) {
      openPricing(snap.audienceTab || 'individuals');
      return;
    }
    handleSubmit(type);
  };

  return (
    <div
      className='aipicker-container'
      style={{ height: 'auto', minHeight: 220, maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto' }}
    >
      {/* Header with AI Quota Pill */}
      <div className='flex items-center justify-between mb-2 gap-2'>
        <label className='text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5'>
          <span className='text-violet-400'>✨</span>
          AI Fabric Designer
        </label>

        {/* Live Quota Pill */}
        <button
          type='button'
          onClick={() => openPricing(snap.audienceTab || 'individuals')}
          title='View plan details & quotas'
          className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold flex items-center gap-1 transition ${
            isExhausted
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
              : 'bg-violet-950/60 border-violet-500/30 text-violet-200 hover:border-violet-400'
          }`}
        >
          <span>{planConfig.badge}</span>
          <span className='text-slate-400'>•</span>
          <span className={isExhausted ? 'font-bold text-rose-200' : 'text-white'}>
            {used}/{quota === Infinity ? '∞' : quota}
          </span>
        </button>
      </div>

      {/* Quota Exhausted Warning Banner */}
      {isExhausted && (
        <div className='mb-2 p-2.5 rounded-xl bg-gradient-to-r from-rose-950/80 to-amber-950/80 border border-rose-500/40 text-xs flex flex-col gap-1.5'>
          <div className='flex items-center justify-between text-rose-300 font-bold text-[11px]'>
            <span>⚠️ Generation Quota Reached</span>
            <span className='text-[10px] text-slate-300'>{used} / {quota} used</span>
          </div>
          <p className='text-slate-200 text-[11px] leading-snug'>
            You have used all AI generations for your {planConfig.name} plan. Upgrade to get up to 600 generations per month.
          </p>
          <button
            type='button'
            onClick={() => openPricing(snap.audienceTab || 'individuals')}
            className='mt-0.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow-sm transition'
          >
            Upgrade Plan Now →
          </button>
        </div>
      )}

      <textarea
        className='aipicker-textarea'
        dir='auto'
        lang='ar-DZ'
        aria-label='Describe your garment design'
        placeholder='Describe your pattern in English, French or darja (e.g. bghit hoodie kahla b zellij dahabi / بغيت تيشيرت كحلة بزليج ذهبي)...'
        rows={4}
        maxLength={1500}
        value={prompt}
        disabled={generatingImg}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <Interpretation interpretation={interpretation} garment={garment} />
      <ColorMatchNotice
        colorMatch={colorMatch}
        matching={matching}
        handleMatchColors={handleMatchColors}
        handleRestoreColors={handleRestoreColors}
      />

      {generationError && (
        <p id='generation-error' role='alert' className='text-xs text-rose-400 break-words font-medium'>
          {generationError}
        </p>
      )}

      {generatingImg && (
        <p role='status' className='text-xs text-violet-300 font-medium flex items-center gap-2'>
          <span className='w-2 h-2 rounded-full bg-violet-400 animate-ping' />
          <span>Generating design with AI...</span>
        </p>
      )}

      <div className='flex flex-wrap gap-2.5 pt-1'>
        <CustomButtom
          type='outline'
          title={previewing ? 'Reading...' : 'Check understanding'}
          handleClick={handlePreview}
          customStyles='text-xs flex-1 py-2 font-semibold rounded-lg'
          disabled={generatingImg || previewing || !prompt.trim()}
        />
        <CustomButtom
          type={isExhausted ? 'outline' : generatingImg ? 'outline' : 'filled'}
          title={
            isExhausted
              ? 'Upgrade to Generate'
              : generatingImg
              ? 'Asking AI...'
              : 'AI Full Pattern'
          }
          handleClick={() => handleGenerateClick('full')}
          customStyles={`text-xs flex-1 py-2 font-bold rounded-lg shadow-md ${
            isExhausted ? 'border-amber-500/60 text-amber-300 hover:bg-amber-500/10' : ''
          }`}
          disabled={generatingImg}
        />
      </div>

      {/* Subtle Financial Plan Clarification */}
      <p className='text-[10px] text-slate-400/90 text-center pt-2 leading-relaxed'>
        💡 Only AI pattern prompts consume plan generations. Garment colors, logo uploads, and 3D preview are unlimited and free.
      </p>
    </div>
  );
};

export default AIPicker;
