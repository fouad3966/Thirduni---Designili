import React, { useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import state, { openPricing } from '../store';
import CustomButtom from './CustomButtom';
import { POSITION_PRESETS } from '../config/textTexture';

const FilePiker = ({ file, setFile, readFile, supportsLogo = true }) => {
  const snap = useSnapshot(state);
  const miniPadRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);

  // Position bounds on front of the t-shirt
  const minX = -0.20;
  const maxX = 0.20;
  const minY = -0.24;
  const maxY = 0.20;

  const currentScale = typeof snap.logoScale === 'number'
    ? snap.logoScale
    : Array.isArray(snap.logoScale)
    ? snap.logoScale[0]
    : 0.15;

  const posX = snap.logoPosition ? snap.logoPosition[0] : 0;
  const posY = snap.logoPosition ? snap.logoPosition[1] : 0.04;
  const percentX = Math.max(0, Math.min(100, ((posX - minX) / (maxX - minX)) * 100));
  const percentY = Math.max(0, Math.min(100, (1 - (posY - minY) / (maxY - minY)) * 100));

  const handleMiniPadPointer = (e) => {
    if (!miniPadRef.current) return;
    const rect = miniPadRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (clientX === undefined || clientY === undefined) return;

    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const targetX = minX + relX * (maxX - minX);
    const targetY = maxY - relY * (maxY - minY);

    state.logoPosition = [targetX, targetY, 0.15];
    if (!state.isLogoTexture) state.isLogoTexture = true;
  };

  const nudge = (dx, dy) => {
    const curX = snap.logoPosition ? snap.logoPosition[0] : 0;
    const curY = snap.logoPosition ? snap.logoPosition[1] : 0.04;
    const curZ = snap.logoPosition ? snap.logoPosition[2] : 0.15;
    const nextX = Math.max(minX, Math.min(maxX, curX + dx));
    const nextY = Math.max(minY, Math.min(maxY, curY + dy));
    state.logoPosition = [nextX, nextY, curZ];
    if (!state.isLogoTexture) state.isLogoTexture = true;
  };

  const handleApplyPreset = (pos) => {
    state.logoPosition = [...pos];
    if (!state.isLogoTexture) state.isLogoTexture = true;
  };

  return (
    <div className='filepicker-container'>
      {/* Upload Section */}
      <div className='flex flex-col gap-2 pb-2.5 border-b border-white/15'>
        <div className='flex items-center justify-between'>
          <label htmlFor='file-upload' className='filepicker-label'>
            Choose Image
          </label>
          <input
            id='file-upload'
            type='file'
            accept='image/*'
            onChange={(e) => setFile(e.target.files[0])}
          />
          {snap.isLogoTexture && (
            <button
              type='button'
              onClick={() => (state.isLogoTexture = !state.isLogoTexture)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition ${
                snap.isLogoTexture
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              {snap.isLogoTexture ? 'Logo On' : 'Logo Off'}
            </button>
          )}
        </div>

        <p className='text-slate-300 text-[11px] truncate'>
          {file ? `📎 ${file.name}` : 'Default Designili Logo loaded'}
        </p>

        {file && (
          <div className='flex gap-2 mt-1'>
            {supportsLogo && (
              <CustomButtom
                title='Apply Logo'
                type='filled'
                handleClick={() => readFile('logo')}
                customStyles='text-xs flex-1 py-1.5 font-bold rounded-lg shadow-sm'
              />
            )}
            <CustomButtom
              title='Full Pattern'
              type='outline'
              handleClick={() => readFile('full')}
              customStyles='text-xs flex-1 py-1.5 font-semibold rounded-lg'
            />
          </div>
        )}
      </div>

      {/* Brand Kit Saved Logos Section */}
      <div className='py-2.5 border-b border-white/10 flex flex-col gap-1.5'>
        <div className='flex items-center justify-between'>
          <span className='text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1'>
            <span>🏢</span>
            <span>Brand Kit Logos</span>
          </span>
          {['business', 'business_plus'].includes(snap.currentPlan) ? (
            <span className='text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'>
              Unlocked
            </span>
          ) : (
            <span className='text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5'>
              <span>🔒</span>
              <span>Business</span>
            </span>
          )}
        </div>

        {['business', 'business_plus'].includes(snap.currentPlan) ? (
          <div className='flex items-center gap-2 pt-1'>
            {(snap.brandKit?.savedLogos || []).map((logo) => (
              <button
                key={logo.id}
                type='button'
                onClick={() => {
                  state.logoDecal = logo.url;
                  state.isLogoTexture = true;
                }}
                className='px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 text-xs text-white transition active:scale-95'
                title={`Apply ${logo.name}`}
              >
                <span>🏷️</span>
                <span>{logo.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className='bg-slate-900/60 p-2 rounded-xl border border-white/5 flex flex-col gap-1'>
            <p className='text-[10px] text-slate-400'>
              Store high-res company logos in a shared team repository.
            </p>
            <button
              type='button'
              onClick={() => openPricing('companies')}
              className='text-left text-[10px] text-violet-300 font-bold hover:text-violet-200 transition'
            >
              Unlock on Business Plan ($39) →
            </button>
          </div>
        )}
      </div>

      {/* Position & Move Controls (Collapsible under "More Details") */}
      {supportsLogo && snap.isLogoTexture && (
        <div className='flex flex-col gap-2 mt-2.5 text-xs'>
          {/* More Details Toggle Button */}
          <button
            type='button'
            onClick={() => setShowDetails(!showDetails)}
            className='w-full py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center justify-between transition shadow-xs'
          >
            <span className='flex items-center gap-1.5'>
              <span>⚙️</span>
              <span>{showDetails ? 'Hide Controls' : 'Move & Resize Controls'}</span>
            </span>
            <span className='text-[10px] text-slate-400 font-bold'>
              {showDetails ? '▲' : '▼'}
            </span>
          </button>

          {/* Details Section: only visible when showDetails is true */}
          {showDetails && (
            <div className='flex flex-col gap-2.5 pt-1 transition-all'>
              {/* Quick Presets */}
              <div>
                <label className='text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-1'>
                  Position Presets
                </label>
                <div className='grid grid-cols-2 gap-1'>
                  {POSITION_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type='button'
                      onClick={() => handleApplyPreset(p.pos)}
                      className='px-2 py-1.5 text-[10px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 shadow-xs flex items-center gap-1 transition'
                    >
                      <span>{p.icon}</span>
                      <span className='truncate'>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive 2D Placement Pad */}
              <div>
                <div className='flex items-center justify-between mb-1'>
                  <label className='text-[10px] font-bold uppercase tracking-wider text-slate-300'>Placement Pad</label>
                  <span className='text-[9px] text-violet-400 font-semibold'>Click or drag dot</span>
                </div>
                <div
                  ref={miniPadRef}
                  onPointerDown={handleMiniPadPointer}
                  onPointerMove={(e) => {
                    if (e.buttons === 1) handleMiniPadPointer(e);
                  }}
                  className='relative w-full h-[76px] bg-slate-900 rounded-lg border border-slate-700 cursor-crosshair overflow-hidden shadow-inner'
                >
                  <div className='absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none'>
                    <div className='w-full h-[1px] bg-slate-600 border-dashed' />
                    <div className='absolute h-full w-[1px] bg-slate-600 border-dashed' />
                  </div>
                  <div className='absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 select-none pointer-events-none'>
                    COLLAR
                  </div>
                  <div className='absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 select-none pointer-events-none'>
                    HEM
                  </div>

                  {/* Draggable position indicator */}
                  <div
                    style={{
                      left: `${percentX}%`,
                      top: `${percentY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className='absolute w-4 h-4 rounded-full bg-violet-500 border-2 border-white shadow-md pointer-events-none flex items-center justify-center text-[7px] text-white font-bold'
                  >
                    LOGO
                  </div>
                </div>
              </div>

              {/* Directional Nudge Pad (D-Pad) */}
              <div className='flex items-center justify-between bg-slate-800/70 p-2 rounded-xl border border-white/10'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-slate-300'>Nudge</span>
                <div className='grid grid-cols-3 gap-1 w-24'>
                  <div />
                  <button
                    type='button'
                    onClick={() => nudge(0, 0.02)}
                    className='h-6 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center justify-center text-xs font-bold active:scale-95 transition'
                    title='Move Up'
                  >
                    ▲
                  </button>
                  <div />
                  <button
                    type='button'
                    onClick={() => nudge(-0.02, 0)}
                    className='h-6 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center justify-center text-xs font-bold active:scale-95 transition'
                    title='Move Left'
                  >
                    ◀
                  </button>
                  <button
                    type='button'
                    onClick={() => handleApplyPreset([0, 0.04, 0.15])}
                    className='h-6 bg-violet-600 text-white rounded flex items-center justify-center text-[9px] font-bold hover:bg-violet-500 transition'
                    title='Center'
                  >
                    ●
                  </button>
                  <button
                    type='button'
                    onClick={() => nudge(0.02, 0)}
                    className='h-6 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center justify-center text-xs font-bold active:scale-95 transition'
                    title='Move Right'
                  >
                    ▶
                  </button>
                  <div />
                  <button
                    type='button'
                    onClick={() => nudge(0, -0.02)}
                    className='h-6 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center justify-center text-xs font-bold active:scale-95 transition'
                    title='Move Down'
                  >
                    ▼
                  </button>
                  <div />
                </div>
              </div>

              {/* Size & Rotation Sliders */}
              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-[10px] font-bold text-slate-300'>Scale Size</span>
                  <span className='text-[10px] font-mono text-slate-200'>
                    {Math.round(currentScale * 100)}%
                  </span>
                </div>
                <input
                  type='range'
                  min='0.06'
                  max='0.35'
                  step='0.01'
                  value={currentScale}
                  onChange={(e) => (state.logoScale = Number(e.target.value))}
                  className='w-full accent-violet-500 h-1'
                />

                <div className='flex items-center justify-between mt-1'>
                  <span className='text-[10px] font-bold text-slate-300'>Angle Rotation</span>
                  <span className='text-[10px] font-mono text-slate-200'>
                    {snap.logoRotation || 0}°
                  </span>
                </div>
                <input
                  type='range'
                  min='-90'
                  max='90'
                  step='2'
                  value={snap.logoRotation || 0}
                  onChange={(e) => (state.logoRotation = Number(e.target.value))}
                  className='w-full accent-violet-500 h-1'
                />
              </div>

              {/* Remove Logo Background option */}
              <label className='flex items-center justify-between bg-slate-800/70 p-2.5 rounded-xl border border-white/10 cursor-pointer'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-slate-200'>
                  Remove Background
                </span>
                <input
                  type='checkbox'
                  checked={snap.removeLogoBackground}
                  onChange={(e) => (state.removeLogoBackground = e.target.checked)}
                  className='rounded accent-violet-500 cursor-pointer'
                />
              </label>

              {/* Direct 3D Canvas Drag Tip */}
              <p className='text-[10px] text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-white/10 leading-relaxed'>
                💡 <strong className='text-white'>Live Drag:</strong> Click and drag the logo directly on the 3D garment to position it anywhere.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilePiker;
