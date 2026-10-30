import React from 'react';
import { SketchPicker } from 'react-color';
import { useSnapshot } from 'valtio';
import state, { openPricing } from '../store';

const ColorPicker = () => {
  const snap = useSnapshot(state);
  const isCompanyTier = ['business', 'business_plus'].includes(snap.currentPlan);
  const brandColors = snap.brandKit?.brandColors || ['#0f172a', '#3b82f6', '#f59e0b', '#10b981'];

  const handleColorSelect = (hex) => {
    state.color = hex;
    if (state.isFullTexture) state.trimColor = hex;
  };

  return (
    <div className='absolute left-full ml-3 flex flex-col gap-2.5 z-20'>
      <div className='bg-slate-900/95 p-3 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-col gap-3 max-w-[240px]'>
        {/* Sketch Picker */}
        <div className='rounded-xl overflow-hidden shadow-inner'>
          <SketchPicker
            color={snap.color}
            disableAlpha
            width='216px'
            onChange={(color) => handleColorSelect(color.hex)}
          />
        </div>

        {/* Company Brand Kit Section */}
        <div className='pt-2 border-t border-slate-800 flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1'>
              <span>🏢</span>
              <span>Brand Kit</span>
            </span>
            {isCompanyTier ? (
              <span className='text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'>
                Active
              </span>
            ) : (
              <span className='text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5'>
                <span>🔒</span>
                <span>Business</span>
              </span>
            )}
          </div>

          {isCompanyTier ? (
            <div className='flex flex-col gap-1.5'>
              <div className='flex items-center gap-2'>
                {brandColors.map((hex) => (
                  <button
                    key={hex}
                    type='button'
                    onClick={() => handleColorSelect(hex)}
                    style={{ backgroundColor: hex }}
                    title={`Select brand color: ${hex}`}
                    className={`w-7 h-7 rounded-full border-2 transition transform active:scale-90 ${
                      snap.color.toLowerCase() === hex.toLowerCase()
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-slate-600 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
              <p className='text-[9px] text-slate-400'>
                {snap.brandKit?.companyName || 'Company'} official brand palette
              </p>
            </div>
          ) : (
            <div className='flex flex-col gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800'>
              <div className='flex items-center gap-2 opacity-50 pointer-events-none'>
                {brandColors.map((hex) => (
                  <span
                    key={hex}
                    style={{ backgroundColor: hex }}
                    className='w-6 h-6 rounded-full border border-slate-700'
                  />
                ))}
              </div>
              <p className='text-[9px] text-slate-400 leading-tight'>
                Saved brand colors & multi-size bulk orders for corporate apparel.
              </p>
              <button
                type='button'
                onClick={() => openPricing('companies')}
                className='w-full py-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-[10px] shadow-sm transition'
              >
                Unlock on Business ($39) →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
