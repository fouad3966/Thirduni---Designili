import React, { useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import state from '../store';
import { AVAILABLE_FONTS, COLOR_PRESETS, POSITION_PRESETS } from '../config/textTexture';
import CustomButtom from './CustomButtom';

const TextPicker = () => {
  const snap = useSnapshot(state);
  const [activeTab, setActiveTab] = useState('style'); // 'style' | 'position'
  const miniPadRef = useRef(null);

  // Position bounds for the front of the t-shirt
  const minX = -0.20;
  const maxX = 0.20;
  const minY = -0.24;
  const maxY = 0.20;

  // Convert 3D position [x, y, z] to mini-pad percentage (0% - 100%)
  const posX = snap.textPosition[0] ?? 0;
  const posY = snap.textPosition[1] ?? 0.04;
  const percentX = Math.max(0, Math.min(100, ((posX - minX) / (maxX - minX)) * 100));
  // In 3D: +y is up, on screen: +y is down, so invert
  const percentY = Math.max(0, Math.min(100, (1 - (posY - minY) / (maxY - minY)) * 100));

  // Handle click or drag on the interactive mini placement pad
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

    state.textPosition = [targetX, targetY, 0.15];
    if (!state.isTextTexture) state.isTextTexture = true;
  };

  const nudge = (dx, dy) => {
    const curX = snap.textPosition[0] ?? 0;
    const curY = snap.textPosition[1] ?? 0.04;
    const curZ = snap.textPosition[2] ?? 0.15;
    const nextX = Math.max(minX, Math.min(maxX, curX + dx));
    const nextY = Math.max(minY, Math.min(maxY, curY + dy));
    state.textPosition = [nextX, nextY, curZ];
    if (!state.isTextTexture) state.isTextTexture = true;
  };

  const handleApplyPreset = (pos) => {
    state.textPosition = [...pos];
    if (!state.isTextTexture) state.isTextTexture = true;
  };

  return (
    <div className='textpicker-container'>
      {/* Header with Title and On/Off Toggle */}
      <div className='flex items-center justify-between pb-2 border-b border-white/15 mb-2'>
        <span className='font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5'>
          <span>🔤</span>
          Text Decal
        </span>
        <button
          type='button'
          onClick={() => {
            state.isTextTexture = !state.isTextTexture;
          }}
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
            snap.isTextTexture
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10'
          }`}
        >
          {snap.isTextTexture ? 'Active' : 'Hidden'}
        </button>
      </div>

      {/* Main Text Input */}
      <div className='flex flex-col gap-1 mb-2.5'>
        <div className='flex items-center justify-between'>
          <label className='text-[10px] font-bold uppercase tracking-wider text-slate-300'>Text Content</label>
          <div className='flex items-center gap-1'>
            <button
              type='button'
              title='Uppercase toggle'
              onClick={() => (state.textUppercase = !state.textUppercase)}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                snap.textUppercase ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10'
              }`}
            >
              AA
            </button>
            <button
              type='button'
              title='Curved / Arc text'
              onClick={() => (state.textCurved = !state.textCurved)}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                snap.textCurved ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10'
              }`}
            >
              Arc
            </button>
          </div>
        </div>
        <input
          type='text'
          dir='auto'
          value={snap.textContent}
          onChange={(e) => {
            state.textContent = e.target.value;
            if (!state.isTextTexture && e.target.value.trim().length > 0) {
              state.isTextTexture = true;
            }
          }}
          placeholder='e.g. VINTAGE 98'
          maxLength={30}
          className='w-full bg-slate-800/90 border border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 font-medium outline-none transition'
        />
      </div>

      {/* Navigation Sub-Tabs: Style vs Position */}
      <div className='grid grid-cols-2 gap-1 p-0.5 bg-slate-900/80 rounded-lg mb-2.5 text-center text-xs font-semibold border border-white/10'>
        <button
          type='button'
          onClick={() => setActiveTab('style')}
          className={`py-1 rounded-md transition-all ${
            activeTab === 'style' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Typography
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('position')}
          className={`py-1 rounded-md transition-all ${
            activeTab === 'position' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Move / Place
        </button>
      </div>

      {/* TAB 1: Typography & Styling */}
      {activeTab === 'style' && (
        <div className='flex flex-col gap-2.5 text-xs'>
          {/* Font Selector */}
          <div>
            <label className='text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-1'>Font Family</label>
            <div className='grid grid-cols-2 gap-1 max-h-[110px] overflow-y-auto pr-0.5 custom-scrollbar'>
              {AVAILABLE_FONTS.map((font) => (
                <button
                  key={font.id}
                  type='button'
                  onClick={() => (state.textFont = font.id)}
                  style={{ fontFamily: font.id }}
                  className={`text-left px-2 py-1.5 rounded text-[11px] truncate border transition-all ${
                    snap.textFont === font.id
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color Presets + Picker */}
          <div>
            <div className='flex items-center justify-between mb-1'>
              <label className='text-[10px] font-bold uppercase tracking-wider text-slate-300'>Ink Color</label>
              <div className='flex items-center gap-1.5'>
                <input
                  type='color'
                  value={snap.textColor}
                  onChange={(e) => (state.textColor = e.target.value)}
                  className='w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent'
                  title='Custom Color'
                />
                <span className='text-[10px] font-mono text-slate-300 uppercase'>{snap.textColor}</span>
              </div>
            </div>
            <div className='flex flex-wrap gap-1'>
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type='button'
                  onClick={() => (state.textColor = color)}
                  style={{ backgroundColor: color }}
                  className={`w-4 h-4 rounded-full border shadow-xs transition-transform ${
                    snap.textColor === color
                      ? 'scale-125 ring-2 ring-violet-400 border-white'
                      : 'border-white/30 hover:scale-110'
                  }`}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Outline / Stroke Option */}
          <div className='bg-slate-800/70 p-2 rounded-xl border border-white/10 flex flex-col gap-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase tracking-wider text-slate-200'>Contrast Outline</span>
              <input
                type='checkbox'
                checked={snap.textBorder}
                onChange={(e) => (state.textBorder = e.target.checked)}
                className='cursor-pointer rounded accent-violet-500'
              />
            </div>
            {snap.textBorder && (
              <div className='flex items-center justify-between gap-2 mt-1'>
                <input
                  type='color'
                  value={snap.textBorderColor}
                  onChange={(e) => (state.textBorderColor = e.target.value)}
                  className='w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent'
                />
                <div className='flex-1 flex items-center gap-2'>
                  <span className='text-[10px] text-slate-400'>Width</span>
                  <input
                    type='range'
                    min='2'
                    max='12'
                    step='1'
                    value={snap.textBorderWidth}
                    onChange={(e) => (state.textBorderWidth = Number(e.target.value))}
                    className='w-full accent-violet-500 h-1'
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Move & Position Controls */}
      {activeTab === 'position' && (
        <div className='flex flex-col gap-2.5 text-xs'>
          {/* Quick Preset Buttons */}
          <div>
            <label className='text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-1'>Quick Presets</label>
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
              {/* T-Shirt Guide Grid */}
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
                T
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
                {Math.round((snap.textScale || 0.16) * 100)}%
              </span>
            </div>
            <input
              type='range'
              min='0.08'
              max='0.28'
              step='0.01'
              value={snap.textScale || 0.16}
              onChange={(e) => (state.textScale = Number(e.target.value))}
              className='w-full accent-violet-500 h-1'
            />

            <div className='flex items-center justify-between mt-1'>
              <span className='text-[10px] font-bold text-slate-300'>Angle Rotation</span>
              <span className='text-[10px] font-mono text-slate-200'>{snap.textRotation || 0}°</span>
            </div>
            <input
              type='range'
              min='-90'
              max='90'
              step='2'
              value={snap.textRotation || 0}
              onChange={(e) => (state.textRotation = Number(e.target.value))}
              className='w-full accent-violet-500 h-1'
            />
          </div>

          {/* Direct 3D Canvas Drag Tip */}
          <p className='text-[10px] text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-white/10 leading-relaxed'>
            💡 <strong className='text-white'>Live Drag:</strong> You can also click and drag directly on the 3D garment to position the text in real-time.
          </p>
        </div>
      )}

      {/* Action Footer */}
      <div className='mt-2.5 pt-2 border-t border-white/15 flex gap-2'>
        <CustomButtom
          type={snap.isTextTexture ? 'filled' : 'outline'}
          title={snap.isTextTexture ? 'Update Text' : 'Apply to Garment'}
          handleClick={() => {
            state.isTextTexture = true;
          }}
          customStyles='text-xs flex-1 py-2 font-bold rounded-lg shadow-md'
        />
        {snap.isTextTexture && (
          <button
            type='button'
            onClick={() => (state.isTextTexture = false)}
            className='px-3 py-1.5 text-[11px] font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-lg border border-rose-500/30 transition'
            title='Remove text from garment'
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default TextPicker;
