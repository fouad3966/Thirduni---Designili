
import React from 'react'
import { useSnapshot } from 'valtio'

import state from '../store';

const Tab = ({ tab, isFilterTab, isActiveTab, handleClick }) => {
  const snap = useSnapshot(state);

  const activeStyles = isFilterTab && isActiveTab
    ? { backgroundColor: snap.color, opacity: 0.85, boxShadow: `0 0 14px ${snap.color}66` }
    : !isFilterTab && isActiveTab
    ? { backgroundColor: "rgba(255, 255, 255, 0.22)", borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.35)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)' }
    : { backgroundColor: "transparent", opacity: 1 };

  return (
    <div
      key={tab.name}
      className={`tab-btn group relative transition-all duration-200 ${
        isFilterTab
          ? 'rounded-full glassmorphism hover:scale-105 active:scale-95'
          : 'rounded-xl hover:bg-white/10 active:scale-95'
      }`}
      onClick={handleClick}
      style={activeStyles}
      title={tab.label || tab.name}
    >
      {/* Active Indicator bar for Editor Tabs */}
      {!isFilterTab && isActiveTab && (
        <span className="absolute -left-1 top-2.5 bottom-2.5 w-1 bg-violet-400 rounded-full shadow-[0_0_8px_#a78bfa]" />
      )}

      {/* Tooltip on Hover */}
      {tab.label && (
        <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide bg-slate-900/95 text-white border border-white/20 shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-30">
          {tab.label}
        </span>
      )}

      <img
        src={tab.icon}
        alt={tab.name}
        className={`${isFilterTab ? 'w-2/3 h-2/3 object-contain' : 'w-7 h-7 object-contain drop-shadow'}`}
      />
    </div>
  );
};

export default Tab