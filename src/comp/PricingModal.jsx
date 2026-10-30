import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnapshot } from 'valtio';
import state, { openCheckout } from '../store';
import {
  INDIVIDUAL_PLANS,
  COMPANY_PLANS,
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
      <div className='responsive-modal fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto'>
        {/* Simple Soft Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className='fixed inset-0 bg-slate-900/50 backdrop-blur-sm'
        />

        {/* Modal Window: Clean, Simple & Clear */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className='modal-window relative w-full max-w-5xl my-auto rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[92vh]'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className='px-6 pt-6 pb-4 flex items-start justify-between border-b border-slate-100'>
            <div>
              <h2 className='text-2xl font-bold text-slate-900 tracking-tight'>
                Pricing & Plans
              </h2>
              <p className='text-sm text-slate-500 mt-1'>
                Select the plan that fits your creative needs. Upgrade or cancel anytime.
              </p>
            </div>

            <button
              type='button'
              onClick={handleClose}
              className='p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition'
              aria-label='Close modal'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>

          {/* Simple Toggles Bar */}
          <div className='px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3'>
            {/* Audience Segment: Individuals vs Companies */}
            <div className='inline-flex p-1 rounded-lg bg-slate-200/70 text-xs font-semibold'>
              <button
                type='button'
                onClick={() => (state.audienceTab = 'individuals')}
                className={`px-3.5 py-1.5 rounded-md transition ${
                  snap.audienceTab === 'individuals'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Individual Creators
              </button>
              <button
                type='button'
                onClick={() => (state.audienceTab = 'companies')}
                className={`px-3.5 py-1.5 rounded-md transition ${
                  snap.audienceTab === 'companies'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Companies & Teams
              </button>
            </div>

            {/* Billing Cycle & Currency Switchers */}
            <div className='flex items-center gap-2.5 flex-wrap'>
              {/* Monthly / Annual */}
              <div className='inline-flex p-1 rounded-lg bg-slate-200/70 text-xs font-semibold'>
                <button
                  type='button'
                  onClick={() => (state.billingCycle = 'monthly')}
                  className={`px-3 py-1 rounded-md transition ${
                    !isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type='button'
                  onClick={() => (state.billingCycle = 'annual')}
                  className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                    isAnnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Annual</span>
                  <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800'>
                    -20%
                  </span>
                </button>
              </div>

              {/* Currency Segmented Toggle */}
              <div className='inline-flex p-1 rounded-lg bg-slate-200/70 text-xs font-semibold'>
                <button
                  type='button'
                  onClick={() => (state.currency = 'USD')}
                  className={`px-3 py-1 rounded-md transition ${
                    snap.currency === 'USD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type='button'
                  onClick={() => (state.currency === 'DA' ? null : (state.currency = 'DA'))}
                  className={`px-3 py-1 rounded-md transition ${
                    snap.currency === 'DA' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  DA (Dinar)
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className='p-6 overflow-y-auto flex-1'>
            <div className={`grid grid-cols-1 gap-5 ${snap.audienceTab === 'companies' ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
              {Object.values(plans).map((plan) => {
                const isCurrent = snap.currentPlan === plan.id;
                const isPopular = plan.isPopular;
                const priceObj = isAnnual ? plan.price.annual : plan.price.monthly;
                const isFree = plan.id === 'free';

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl p-5 flex flex-col justify-between transition-all ${
                      isPopular
                        ? 'border-2 border-slate-900 bg-white shadow-md'
                        : 'border border-slate-200 bg-slate-50/50 hover:bg-white'
                    }`}
                  >
                    {/* Popular Pill */}
                    {isPopular && (
                      <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                        <span className='px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-900 text-white shadow-sm'>
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div>
                      {/* Plan Name & Active Status */}
                      <div className='flex items-center justify-between mb-2'>
                        <h3 className='text-lg font-bold text-slate-900'>{plan.name}</h3>
                        {isCurrent && (
                          <span className='px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200'>
                            Active
                          </span>
                        )}
                      </div>

                      {/* Clean Price */}
                      <div className='mb-3'>
                        {isFree ? (
                          <div className='flex items-baseline gap-1'>
                            <span className='text-3xl font-extrabold text-slate-900'>
                              {snap.currency === 'USD' ? '$0' : '0 DA'}
                            </span>
                            <span className='text-slate-500 text-xs'>/ Free Forever</span>
                          </div>
                        ) : (
                          <div>
                            <div className='flex items-baseline gap-1.5'>
                              <span className='text-3xl font-extrabold text-slate-900'>
                                {snap.currency === 'USD'
                                  ? `$${priceObj.usd}`
                                  : `${priceObj.da.toLocaleString()} DA`}
                              </span>
                              <span className='text-xs text-slate-500 font-medium'>
                                {isAnnual ? '/ year' : '/ month'}
                              </span>
                            </div>
                            <p className='text-xs text-slate-400 mt-0.5'>
                              {snap.currency === 'USD'
                                ? `≈ ${priceObj.da.toLocaleString()} DA`
                                : `≈ $${priceObj.usd} USD`}
                              {isAnnual && priceObj.monthlyEquivalent && (
                                <span className='text-slate-500 ml-1'>
                                  ({priceObj.monthlyEquivalent.da.toLocaleString()} DA / mo)
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        {/* Quota Badge */}
                        <div className='mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700'>
                          <span>{plan.id === 'pro' && isAnnual ? '100 AI Gens / month' : plan.generations.label}</span>
                        </div>
                      </div>

                      {/* Clean Feature List */}
                      <ul className='space-y-2 text-xs border-t border-slate-100 pt-3.5 mb-5'>
                        {plan.features
                          .filter((feat) => feat.included)
                          .map((feat, idx) => (
                            <li key={idx} className='flex items-start gap-2 text-slate-700 leading-snug'>
                              <span className='text-emerald-600 font-bold shrink-0'>✓</span>
                              <span>{feat.text}</span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <button
                      type='button'
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent}
                      className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                          : isPopular
                          ? 'bg-slate-900 hover:bg-black text-white shadow-sm active:scale-95'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 active:scale-95'
                      }`}
                    >
                      {isCurrent ? 'Current Plan' : plan.ctaText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clean Subtle Footer */}
          <div className='px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2'>
            <span>Secure checkout via Edahabia (Algérie Poste), CIB SATIM & Credit Card</span>
            <span className='text-slate-400 text-[11px]'>Official 1 USD = 134 DA exchange rate</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PricingModal;
