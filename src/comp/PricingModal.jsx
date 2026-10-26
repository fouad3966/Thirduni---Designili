import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnapshot } from 'valtio';
import state, { openCheckout } from '../store';
import {
  INDIVIDUAL_PLANS,
  COMPANY_PLANS,
  MANDATORY_PAYMENT_NOTICE,
  formatCurrency,
} from '../config/pricingPlans';

const PricingModal = () => {
  const snap = useSnapshot(state);

  if (!snap.pricingModalOpen) return null;

  const isAnnual = snap.billingCycle === 'annual';
  const plans = snap.audienceTab === 'companies' ? COMPANY_PLANS : INDIVIDUAL_PLANS;

  const handleClose = () => {
    state.pricingModalOpen = false;
  };

  const handleSelectPlan = (planId) => {
    if (planId === snap.currentPlan) return;
    openCheckout(planId);
  };

  return (
    <AnimatePresence>
      <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto'>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className='fixed inset-0 bg-black/80 backdrop-blur-md'
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className='relative w-full max-w-5xl my-auto rounded-2xl bg-slate-900/95 border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(139,92,246,0.15)] backdrop-blur-2xl text-white overflow-hidden flex flex-col max-h-[92vh]'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Accent Bar */}
          <div className='h-1.5 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-amber-400' />

          {/* Modal Header */}
          <div className='p-5 sm:p-6 pb-3 sm:pb-4 flex items-start justify-between gap-4 border-b border-white/10'>
            <div>
              <div className='flex items-center gap-2.5 mb-1'>
                <span className='px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/40'>
                  Official 2026 Plans
                </span>
                <span className='text-xs text-slate-400 hidden sm:inline'>• 1 USD = 134 DA</span>
              </div>
              <h2 className='text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2'>
                Designili Creative Studio Plans
              </h2>
              <p className='text-xs sm:text-sm text-slate-300 mt-0.5'>
                Predictable subscription pricing for creators, luxury ateliers, and enterprise apparel teams.
              </p>
            </div>

            <button
              type='button'
              onClick={handleClose}
              className='p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95'
              aria-label='Close modal'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2.2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>

          {/* Control Toggles: Audience, Billing Cycle, Currency */}
          <div className='px-5 sm:px-6 py-3 bg-slate-950/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3'>
            {/* Audience Segmented Toggle */}
            <div className='inline-flex p-1 rounded-xl bg-slate-900 border border-white/10'>
              <button
                type='button'
                onClick={() => (state.audienceTab = 'individuals')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  snap.audienceTab === 'individuals'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👤</span>
                <span>Individual Creators</span>
              </button>
              <button
                type='button'
                onClick={() => (state.audienceTab = 'companies')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  snap.audienceTab === 'companies'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🏢</span>
                <span>Companies & Teams</span>
              </button>
            </div>

            {/* Billing Cycle + Currency */}
            <div className='flex items-center gap-2 sm:gap-3 flex-wrap'>
              {/* Billing Cycle Toggle */}
              <div className='inline-flex p-1 rounded-xl bg-slate-900 border border-white/10 items-center text-xs'>
                <button
                  type='button'
                  onClick={() => (state.billingCycle = 'monthly')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    !isAnnual ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type='button'
                  onClick={() => (state.billingCycle = 'annual')}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    isAnnual ? 'bg-violet-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annual</span>
                  <span className='px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase'>
                    Save ~20%
                  </span>
                </button>
              </div>

              {/* Currency Toggle */}
              <button
                type='button'
                onClick={() => {
                  state.currency = snap.currency === 'DA' ? 'USD' : snap.currency === 'USD' ? 'BOTH' : 'DA';
                }}
                className='px-2.5 py-1.5 rounded-xl border border-white/15 bg-slate-800/80 hover:bg-slate-700/80 text-xs font-bold text-slate-200 transition flex items-center gap-1'
                title='Click to switch display currency'
              >
                <span className='text-amber-400'>💱</span>
                <span>{snap.currency === 'DA' ? 'Dinar (DA)' : snap.currency === 'USD' ? 'US Dollar ($)' : 'DA & USD'}</span>
              </button>
            </div>
          </div>

          {/* Mandatory Separation-of-Payment Banner */}
          <div className='mx-5 sm:mx-6 mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200'>
            <span className='text-base shrink-0'>ℹ️</span>
            <p className='font-medium leading-relaxed'>{MANDATORY_PAYMENT_NOTICE}</p>
          </div>

          {/* Plans Grid */}
          <div className='p-5 sm:p-6 overflow-y-auto flex-1'>
            <div className={`grid grid-cols-1 gap-4 sm:gap-5 ${snap.audienceTab === 'companies' ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
              {Object.values(plans).map((plan) => {
                const isCurrent = snap.currentPlan === plan.id;
                const isProAnnual = plan.id === 'pro' && isAnnual;
                const priceObj = isAnnual ? plan.price.annual : plan.price.monthly;
                const isFree = plan.id === 'free';

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${
                      plan.isPopular
                        ? 'bg-gradient-to-b from-slate-900/95 via-violet-950/30 to-slate-900/95 border-2 border-violet-500/70 shadow-[0_0_30px_rgba(139,92,246,0.25)]'
                        : 'bg-slate-900/70 border border-white/15 hover:border-white/25'
                    }`}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <div className='absolute -top-3 left-5'>
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md ${
                            plan.isPopular
                              ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white'
                              : 'bg-slate-800 text-slate-300 border border-white/10'
                          }`}
                        >
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      {/* Plan Name & Tag */}
                      <div className='flex items-center justify-between mb-2 mt-1'>
                        <h3 className='text-lg font-black text-white'>{plan.name}</h3>
                        {isCurrent && (
                          <span className='px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'>
                            Active Plan
                          </span>
                        )}
                      </div>

                      {/* Pricing Display */}
                      <div className='mb-4'>
                        {isFree ? (
                          <div className='flex items-baseline gap-1.5'>
                            <span className='text-3xl font-black text-white'>0 DA</span>
                            <span className='text-slate-400 text-xs font-medium'>($0 / Forever)</span>
                          </div>
                        ) : (
                          <div>
                            <div className='flex items-baseline gap-2'>
                              <span className='text-3xl font-black text-white'>
                                {snap.currency === 'USD'
                                  ? `$${priceObj.usd}`
                                  : `${priceObj.da.toLocaleString()} DA`}
                              </span>
                              <span className='text-xs text-slate-400'>
                                {isAnnual ? '/ year' : '/ month'}
                              </span>
                            </div>

                            {/* Secondary currency info */}
                            <p className='text-[11px] text-slate-400 mt-0.5'>
                              {snap.currency === 'USD'
                                ? `≈ ${priceObj.da.toLocaleString()} DA`
                                : `≈ $${priceObj.usd} USD`}
                              {isAnnual && priceObj.monthlyEquivalent && (
                                <span className='text-amber-300 font-semibold ml-1.5'>
                                  ({priceObj.monthlyEquivalent.da.toLocaleString()} DA / mo)
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        {/* Generation allowance badge */}
                        <div className='mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/10 text-xs text-slate-200'>
                          <span className='text-violet-400 font-bold'>⚡</span>
                          <span className='font-semibold'>
                            {isProAnnual ? '100 AI Gens / month' : plan.generations.label}
                          </span>
                          {isProAnnual && (
                            <span className='text-[10px] text-amber-400 font-bold ml-1'>
                              (+40 bonus)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Features Checklist */}
                      <ul className='space-y-2.5 text-xs border-t border-white/10 pt-3.5 mb-6'>
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className='flex items-start gap-2.5 leading-snug'>
                            {feat.included ? (
                              <span className='text-emerald-400 font-bold text-sm shrink-0'>✓</span>
                            ) : (
                              <span className='text-slate-500 font-bold text-xs shrink-0 mt-0.5'>🔒</span>
                            )}
                            <div className='flex flex-col'>
                              <span
                                className={`${
                                  feat.included
                                    ? feat.highlight
                                      ? 'text-white font-semibold'
                                      : 'text-slate-200'
                                    : 'text-slate-500 line-through'
                                }`}
                              >
                                {feat.text}
                              </span>
                              {!feat.included && feat.lockedNotice && (
                                <span className='text-[10px] text-amber-300/90 font-medium'>
                                  {feat.lockedNotice}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <button
                      type='button'
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                        isCurrent
                          ? 'bg-slate-800/80 text-slate-400 border border-white/10 cursor-default'
                          : plan.isPopular
                          ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-violet-500/25 active:scale-95'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/15 hover:border-white/30 active:scale-95'
                      }`}
                    >
                      {isCurrent ? 'Current Plan' : plan.ctaText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className='px-6 py-3 bg-slate-950/80 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2'>
            <span>🔒 Secure payments via Algérie Poste (Edahabia) & SATIM (CIB) • SSL Encrypted</span>
            <span className='text-slate-500'>Designili SaaS Engine v2.4</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PricingModal;
