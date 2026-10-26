import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnapshot } from 'valtio';
import state, { setPlan, openPricing, openOrderPrint, resetDailyQuota } from '../store';
import { UNIT_ECONOMICS, YEAR_1_MILESTONES } from '../config/pricingPlans';

const PLAN_KEYS = [
  { id: 'free', label: 'Free Trial', tag: '0 DA' },
  { id: 'pro', label: 'Pro', tag: '1.2k DA' },
  { id: 'studio', label: 'Studio', tag: '2.5k DA' },
  { id: 'business', label: 'Business', tag: '5.2k DA' },
  { id: 'business_plus', label: 'Biz Plus', tag: '10.6k DA' },
];

const JudgeDemoBar = () => {
  const snap = useSnapshot(state);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEconomicsModal, setShowEconomicsModal] = useState(false);

  if (!snap.judgeDemoBarOpen) return null;

  const currentPlan = snap.currentPlan || 'free';
  const isAnnual = snap.billingCycle === 'annual';
  const planEcon = UNIT_ECONOMICS[currentPlan];

  return (
    <>
      {/* Floating Floating Pill in bottom-left */}
      <div className='fixed bottom-4 left-4 z-40 flex flex-col gap-2'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-2xl bg-slate-900/90 border border-violet-500/40 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(139,92,246,0.2)] backdrop-blur-xl p-2.5 text-white flex flex-col gap-2 max-w-[95vw] sm:max-w-md'
        >
          {/* Top Bar with Title & Collapse */}
          <div className='flex items-center justify-between gap-3 px-1'>
            <div className='flex items-center gap-1.5'>
              <span className='text-[10px] font-black uppercase tracking-wider text-slate-300'>
                Account Tier Sandbox
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={() => setShowEconomicsModal(true)}
                className='px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30 transition'
                title='View Year 1 Financial Milestones & Unit Margins'
              >
                📊 Economics
              </button>
              <button
                type='button'
                onClick={() => setIsExpanded(!isExpanded)}
                className='text-slate-400 hover:text-white p-1 rounded-md text-xs transition'
                title={isExpanded ? 'Minimize' : 'Expand switcher'}
              >
                {isExpanded ? '▼' : '▲'}
              </button>
              <button
                type='button'
                onClick={() => (state.judgeDemoBarOpen = false)}
                className='text-slate-400 hover:text-rose-400 p-1 rounded-md text-xs transition font-bold'
                title='Dismiss sandbox bar'
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Active Tier Summary */}
          <div className='flex items-center justify-between gap-2 px-1 text-xs'>
            <div className='flex items-center gap-1.5'>
              <span className='text-slate-400 text-[11px]'>Active Tier:</span>
              <span className='font-black uppercase text-white bg-slate-800 px-2 py-0.5 rounded-md border border-white/10'>
                {currentPlan.replace('_', ' ')}
              </span>
            </div>
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() => openPricing()}
                className='text-[10px] text-violet-300 hover:underline font-bold'
              >
                Pricing Modal
              </button>
              <span className='text-slate-600'>•</span>
              <button
                type='button'
                onClick={() => openOrderPrint()}
                className='text-[10px] text-emerald-300 hover:underline font-bold'
              >
                Order COD
              </button>
            </div>
          </div>

          {/* Expanded 1-Click Tier Switcher */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='pt-2 border-t border-white/10 space-y-2'
            >
              <div className='flex items-center justify-between text-[10px] text-slate-400 px-1'>
                <span>1-Click Live Tier Switch:</span>
                <div className='flex items-center gap-1'>
                  <button
                    type='button'
                    onClick={() => (state.billingCycle = 'monthly')}
                    className={`px-1.5 py-0.5 rounded ${!isAnnual ? 'bg-violet-600 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Mo
                  </button>
                  <button
                    type='button'
                    onClick={() => (state.billingCycle = 'annual')}
                    className={`px-1.5 py-0.5 rounded ${isAnnual ? 'bg-violet-600 text-white font-bold' : 'text-slate-400'}`}
                  >
                    Yr
                  </button>
                </div>
              </div>

              {/* Tier Buttons */}
              <div className='grid grid-cols-5 gap-1'>
                {PLAN_KEYS.map((p) => {
                  const isActive = currentPlan === p.id;
                  return (
                    <button
                      key={p.id}
                      type='button'
                      onClick={() => setPlan(p.id)}
                      className={`py-1.5 px-1 rounded-xl text-center flex flex-col items-center justify-center transition ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black shadow-md border border-violet-400'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10'
                      }`}
                    >
                      <span className='text-[10px] leading-tight font-extrabold'>{p.label}</span>
                      <span className='text-[9px] text-slate-400 font-mono'>{p.tag}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quota reset tool */}
              <div className='flex items-center justify-between text-[10px] text-slate-400 pt-1'>
                <span>Used Gens Today: <strong className='text-white'>{snap.generationsUsed}</strong></span>
                <button
                  type='button'
                  onClick={() => resetDailyQuota()}
                  className='text-amber-400 hover:text-amber-300 font-bold underline'
                >
                  Reset AI Quota to 0
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Unit Economics & Year 1 Milestones Modal */}
      <AnimatePresence>
        {showEconomicsModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto'>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEconomicsModal(false)}
              className='fixed inset-0 bg-black/85 backdrop-blur-md'
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='relative w-full max-w-2xl my-auto rounded-2xl bg-slate-900 border border-violet-500/40 shadow-2xl p-6 text-white space-y-5 max-h-[90vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-start justify-between border-b border-white/10 pb-3'>
                <div>
                  <span className='px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30'>
                    Financial Plan • Sections 4, 5 & 6
                  </span>
                  <h3 className='text-xl font-black text-white mt-1'>
                    Designili Unit Economics & Financial Projections
                  </h3>
                </div>
                <button
                  type='button'
                  onClick={() => setShowEconomicsModal(false)}
                  className='p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10'
                >
                  ✕
                </button>
              </div>

              {/* Active Plan Unit Margin Card */}
              <div className='p-4 rounded-xl bg-violet-950/40 border border-violet-500/30 space-y-2.5'>
                <div className='flex justify-between items-center'>
                  <span className='text-xs font-black uppercase text-violet-300 tracking-wider'>
                    Active Tier Economics: {planEcon.title} ({isAnnual ? 'Annual' : 'Monthly'})
                  </span>
                  <span className='px-2 py-0.5 rounded-md text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'>
                    Margin: {isAnnual && planEcon.annual ? planEcon.annual.marginPercent : planEcon.monthly ? planEcon.monthly.marginPercent : planEcon.marginPercent}
                  </span>
                </div>

                {currentPlan === 'free' ? (
                  <div className='text-xs text-slate-300 space-y-1'>
                    <div>Customer Acquisition Cost (CAC): <strong className='text-white'>{planEcon.aiCost}</strong></div>
                    <p className='text-[11px] text-slate-400'>{planEcon.note}</p>
                  </div>
                ) : (
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1'>
                    <div className='p-2 rounded-lg bg-slate-900/80 border border-white/5'>
                      <span className='text-[10px] text-slate-400 block'>Revenue / mo</span>
                      <strong className='text-white font-mono'>
                        {isAnnual ? planEcon.annual?.revMo : planEcon.monthly?.rev}
                      </strong>
                    </div>
                    <div className='p-2 rounded-lg bg-slate-900/80 border border-white/5'>
                      <span className='text-[10px] text-slate-400 block'>Max AI Cost</span>
                      <strong className='text-white font-mono'>
                        {isAnnual ? planEcon.annual?.maxAiCost : planEcon.monthly?.maxAiCost}
                      </strong>
                    </div>
                    <div className='p-2 rounded-lg bg-slate-900/80 border border-white/5'>
                      <span className='text-[10px] text-slate-400 block'>Gateway Fee (3%)</span>
                      <strong className='text-white font-mono'>
                        {isAnnual ? planEcon.annual?.paymentFee : planEcon.monthly?.paymentFee}
                      </strong>
                    </div>
                    <div className='p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30'>
                      <span className='text-[10px] text-emerald-300 block'>Net Contribution</span>
                      <strong className='text-emerald-400 font-mono'>
                        {isAnnual ? planEcon.annual?.netMargin : planEcon.monthly?.netMargin}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Year 1 Milestones */}
              <div className='space-y-3'>
                <h4 className='text-xs font-black uppercase tracking-wider text-slate-300'>
                  Year 1 Key Milestones (Algerian Market)
                </h4>
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs'>
                  <div className='p-3 rounded-xl bg-slate-950/60 border border-white/10'>
                    <span className='text-[10px] text-slate-400 block'>Breakeven Month</span>
                    <strong className='text-amber-300 text-sm'>{YEAR_1_MILESTONES.breakevenMonth}</strong>
                    <span className='text-[10px] text-slate-400 block mt-0.5'>{YEAR_1_MILESTONES.breakevenNet}</span>
                  </div>
                  <div className='p-3 rounded-xl bg-slate-950/60 border border-white/10'>
                    <span className='text-[10px] text-slate-400 block'>Year 1 Revenue</span>
                    <strong className='text-white text-sm'>{YEAR_1_MILESTONES.year1TotalRevenue}</strong>
                    <span className='text-[10px] text-slate-400 block mt-0.5'>2.57M DA total</span>
                  </div>
                  <div className='p-3 rounded-xl bg-slate-950/60 border border-white/10'>
                    <span className='text-[10px] text-slate-400 block'>Year 1 Net Profit</span>
                    <strong className='text-emerald-400 text-sm'>{YEAR_1_MILESTONES.year1NetProfit}</strong>
                    <span className='text-[10px] text-emerald-300 block mt-0.5'>{YEAR_1_MILESTONES.year1NetMargin} Margin</span>
                  </div>
                </div>

                {/* Revenue Streams breakdown */}
                <div className='p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2'>
                  <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider block'>
                    Revenue Stream Breakdown:
                  </span>
                  {YEAR_1_MILESTONES.revenueStreams.map((s, idx) => (
                    <div key={idx} className='space-y-1 text-xs'>
                      <div className='flex justify-between text-slate-300'>
                        <span>{s.label}</span>
                        <strong className='text-white'>{s.percentage}% ({s.amountDA})</strong>
                      </div>
                      <div className='w-full bg-slate-800 rounded-full h-1.5 overflow-hidden'>
                        <div
                          className={`h-full ${idx === 0 ? 'bg-violet-500' : idx === 1 ? 'bg-indigo-400' : 'bg-emerald-400'}`}
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='flex justify-end pt-2 border-t border-white/10'>
                <button
                  type='button'
                  onClick={() => setShowEconomicsModal(false)}
                  className='px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition'
                >
                  Close Economics Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default JudgeDemoBar;
