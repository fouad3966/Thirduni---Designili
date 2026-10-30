import React, { useState, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import state from '../store';
import {
  getDesignHistory,
  saveDesignHistory,
  addDesignToHistory,
  applyHistoryDesign,
} from '../config/designHistory';
import { GARMENTS } from '../config/garments/catalog';

const GARMENT_ICONS = {
  tshirt: '',
  dress: '',
  caftan: '',
  karakou: '',
  hoodie: '',
  hat: '',
  shoes: '',
};

const DesignHistoryDropdown = () => {
  const snap = useSnapshot(state);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState(() => getDesignHistory());
  const [isSaving, setIsSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  // 'current' = only show current garment designs; 'all' = show all
  const [filterMode, setFilterMode] = useState('current');
  const [justAppliedId, setJustAppliedId] = useState(null);
  const dropdownRef = useRef(null);

  const currentGarment = snap.garment || 'tshirt';
  const currentGarmentInfo = GARMENTS.find((g) => g.id === currentGarment) || {
    id: currentGarment,
    label: currentGarment.charAt(0).toUpperCase() + currentGarment.slice(1),
  };
  const currentIcon = '';

  // Number of designs for current garment vs total
  const currentGarmentHistory = history.filter(
    (item) => (item.garment || 'tshirt') === currentGarment
  );
  const currentCount = currentGarmentHistory.length;
  const totalCount = history.length;

  // Designs to display based on filterMode
  const displayedHistory = filterMode === 'current' ? currentGarmentHistory : history;

  // Sync history across tabs and on IndexedDB load
  useEffect(() => {
    const handleUpdate = (e) => {
      setHistory(e.detail || getDesignHistory());
    };
    window.addEventListener('designHistoryChange', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('designHistoryChange', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsSaving(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (item) => {
    applyHistoryDesign(item);
    setJustAppliedId(item.id);
    setTimeout(() => setJustAppliedId(null), 1800);
  };

  const handleStartSave = () => {
    setSaveTitle(`${currentGarmentInfo.label} #${currentCount + 1}`);
    setIsSaving(true);
  };

  const handleConfirmSave = () => {
    const title = saveTitle.trim() || `${currentGarmentInfo.label} Design`;
    const updated = addDesignToHistory({
      title,
      garment: currentGarment,
    });
    setHistory(updated);
    setIsSaving(false);
    setJustAppliedId(updated[0]?.id || null);
    setTimeout(() => setJustAppliedId(null), 1800);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const remaining = history.filter((item) => item.id !== id);
    setHistory(remaining);
    saveDesignHistory(remaining);
  };

  const renderThumbnail = (item) => {
    if (item.thumbnail) {
      return (
        <img
          src={item.thumbnail}
          alt={item.title}
          className='w-12 h-12 rounded-lg object-cover border border-white shadow-xs shrink-0 bg-gray-100'
        />
      );
    }

    if (item.isFullTexture && item.fullDecal) {
      return (
        <div
          style={{ backgroundColor: item.color || '#e5e7eb' }}
          className='w-12 h-12 rounded-lg border border-white shadow-xs shrink-0 overflow-hidden relative'
        >
          <img
            src={item.fullDecal}
            alt={item.title}
            className='w-full h-full object-cover'
          />
        </div>
      );
    }

    if (item.isLogoTexture && item.logoDecal) {
      return (
        <div
          style={{ backgroundColor: item.color || '#333' }}
          className='w-12 h-12 rounded-lg border border-white shadow-xs shrink-0 flex items-center justify-center p-1.5 relative overflow-hidden'
        >
          <img
            src={item.logoDecal}
            alt=''
            className='max-w-full max-h-full object-contain filter drop-shadow'
          />
        </div>
      );
    }

    return (
      <div
        style={{ backgroundColor: item.color || '#333' }}
        className='w-12 h-12 rounded-lg border border-white shadow-xs shrink-0 flex items-center justify-center text-xs font-bold uppercase text-white'
      >
        <span>{(item.garment || '3D').slice(0, 2)}</span>
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className='relative flex flex-col items-end'>
      {/* Trigger Button showing current garment & count */}
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/90 hover:bg-white text-gray-800 border border-white/60 shadow-lg backdrop-blur-md transition-all active:scale-95'
      >
        <span>
          {currentGarmentInfo.label} Saved ({currentCount})
        </span>
        <span className='text-[10px] text-gray-400 font-bold'>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className='mt-2 w-[310px] glassmorphism p-3 rounded-2xl shadow-2xl flex flex-col gap-2.5 border border-white/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-30'>
          {/* Header */}
          <div className='flex items-center justify-between pb-2 border-b border-white/20'>
            <div className='flex items-center gap-1.5'>
              <span className='text-xs font-bold text-white'>
                {filterMode === 'current'
                  ? `${currentGarmentInfo.label} Designs`
                  : 'All Saved Designs'}
              </span>
              <span className='text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold'>
                {displayedHistory.length}
              </span>
            </div>
            {!isSaving && (
              <button
                type='button'
                onClick={handleStartSave}
                className='px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 flex items-center gap-1'
                title={`Save current ${currentGarmentInfo.label} design`}
              >
                <span>+</span>
                <span>Save {currentGarmentInfo.label}</span>
              </button>
            )}
          </div>

          {/* Inline Save Form */}
          {isSaving && (
            <div className='p-2 rounded-xl bg-white/80 border border-indigo-200 shadow-sm flex flex-col gap-2 animate-in fade-in duration-150'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1'>
                  <span>Name this {currentGarmentInfo.label}</span>
                </span>
                <button
                  type='button'
                  onClick={() => setIsSaving(false)}
                  className='text-xs text-gray-400 hover:text-gray-600'
                >
                  ✕
                </button>
              </div>
              <div className='flex gap-1.5'>
                <input
                  type='text'
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmSave()}
                  placeholder='Design name...'
                  autoFocus
                  className='flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500 bg-white'
                />
                <button
                  type='button'
                  onClick={handleConfirmSave}
                  className='px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-xs'
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Toggle Pills: [Current Garment Only] vs [All Garments] */}
          <div className='flex items-center gap-1 bg-white/50 p-1 rounded-xl border border-white/60 text-[10px] font-bold'>
            <button
              type='button'
              onClick={() => setFilterMode('current')}
              className={`flex-1 py-1 px-2 rounded-lg transition flex items-center justify-center gap-1 ${
                filterMode === 'current'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{currentIcon}</span>
              <span>{currentGarmentInfo.label} Only ({currentCount})</span>
            </button>
            <button
              type='button'
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1 px-2 rounded-lg transition flex items-center justify-center gap-1 ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>All ({totalCount})</span>
            </button>
          </div>

          {/* Design List */}
          <div className='max-h-[290px] overflow-y-auto pr-0.5 custom-scrollbar flex flex-col gap-2'>
            {displayedHistory.length === 0 ? (
              <div className='text-center py-6 flex flex-col items-center gap-1.5 text-gray-500'>
                <p className='text-xs font-bold text-gray-700'>
                  No saved {currentGarmentInfo.label}s yet.
                </p>
                <p className='text-[10px] text-gray-400'>
                  Click "+ Save {currentGarmentInfo.label}" to save your current design!
                </p>
                {filterMode === 'current' && totalCount > 0 && (
                  <button
                    type='button'
                    onClick={() => setFilterMode('all')}
                    className='mt-1 text-[10px] text-indigo-600 hover:underline font-semibold'
                  >
                    View all {totalCount} designs in other garments
                  </button>
                )}
              </div>
            ) : (
              displayedHistory.map((item) => {
                const isActive = snap.activeDesignId === item.id;
                const isJustApplied = justAppliedId === item.id;
                const itemGarment = item.garment || 'tshirt';
                const itemGarmentLabel =
                  GARMENTS.find((g) => g.id === itemGarment)?.label || itemGarment;
                const dateStr = new Date(item.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });
                const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`group relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isActive || isJustApplied
                        ? 'bg-indigo-50/95 border-indigo-400 shadow-md ring-2 ring-indigo-300'
                        : 'bg-white/70 hover:bg-white border-white/80 hover:border-indigo-200 shadow-xs hover:shadow-sm'
                    }`}
                    title={`Click to load onto 3D ${itemGarmentLabel}`}
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      {renderThumbnail(item)}

                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5'>
                          <span className='text-xs font-bold text-gray-900 truncate group-hover:text-indigo-600 transition'>
                            {item.title}
                          </span>
                          {isActive && (
                            <span className='px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-indigo-600 text-white shrink-0'>
                              ACTIVE
                            </span>
                          )}
                          {isJustApplied && !isActive && (
                            <span className='px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white shrink-0 animate-pulse'>
                              LOADED
                            </span>
                          )}
                        </div>

                        <div className='text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5'>
                          <span className='capitalize font-medium text-gray-700 bg-gray-100 px-1 rounded text-[9px] flex items-center gap-0.5'>
                            <span>{itemGarmentLabel}</span>
                          </span>
                          <span>•</span>
                          <span>
                            {dateStr} {timeStr}
                          </span>
                        </div>

                        {/* Badges for active layers */}
                        <div className='flex items-center gap-1 mt-1 text-[8px] font-semibold text-gray-500'>
                          {item.isFullTexture && (
                            <span className='bg-purple-100 text-purple-700 px-1 rounded'>
                              Pattern
                            </span>
                          )}
                          {item.isLogoTexture && (
                            <span className='bg-blue-100 text-blue-700 px-1 rounded'>
                              Logo
                            </span>
                          )}
                          {item.isTextTexture && (
                            <span className='bg-amber-100 text-amber-700 px-1 rounded'>
                              Text
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-1 shrink-0'>
                      <button
                        type='button'
                        onClick={(e) => handleDelete(item.id, e)}
                        className='p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-xs'
                        title='Delete from history'
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignHistoryDropdown;


