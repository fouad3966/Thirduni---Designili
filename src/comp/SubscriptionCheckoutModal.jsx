import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnapshot } from 'valtio';
import state, { setPlan, resetDailyQuota } from '../store';
import { ALL_PLANS, MANDATORY_PAYMENT_NOTICE } from '../config/pricingPlans';

const SubscriptionCheckoutModal = () => {
  const snap = useSnapshot(state);

  // Form inputs state (unconditional top-level hooks)
  const [method, setMethod] = useState(snap.selectedPaymentMethod || 'edahabia');
  const [cardNumber, setCardNumber] = useState('6280 4412 8931 5024');
  const [cardHolder, setCardHolder] = useState('AMINE BENALI');
  const [expiry, setExpiry] = useState('08/28');
  const [cvv, setCvv] = useState('482');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('739210');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptId, setReceiptId] = useState('');

  if (!snap.checkoutModalOpen) return null;

  const planId = snap.selectedPlanForCheckout || 'pro';
  const plan = ALL_PLANS[planId] || ALL_PLANS.pro;
  const isAnnual = snap.billingCycle === 'annual';
  const priceObj = isAnnual ? plan.price.annual : plan.price.monthly;

  const handleClose = () => {
    state.checkoutModalOpen = false;
    setIsSuccess(false);
    setOtpStep(false);
    setIsProcessing(false);
  };

  const handleRequestOtpOrPay = () => {
    if (method === 'edahabia' || method === 'cib') {
      if (!otpStep) {
        setOtpStep(true);
        return;
      }
    }

    // Trigger payment processing simulation
    setIsProcessing(true);
    setProcessingMessage(
      method === 'edahabia'
        ? 'Connecting to Algérie Poste BaridiNet gateway...'
        : method === 'cib'
        ? 'Authenticating with SATIM Interbank server...'
        : 'Authorizing with Mastercard SecureCode...'
    );

    setTimeout(() => {
      setProcessingMessage('Verifying balance & transaction approval...');
    }, 800);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      const generatedReceipt = `DZ-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
      setReceiptId(generatedReceipt);

      // Update global plan and generation quotas in store
      setPlan(plan.id);
      resetDailyQuota(); // reset for the new plan tier
    }, 1800);
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
          className='fixed inset-0 bg-black/85 backdrop-blur-md'
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className='relative w-full max-w-4xl my-auto rounded-2xl bg-slate-900/95 border border-white/15 shadow-[0_25px_65px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(139,92,246,0.2)] backdrop-blur-2xl text-white overflow-hidden flex flex-col max-h-[94vh]'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Bar */}
          <div className='h-1.5 w-full bg-gradient-to-r from-amber-400 via-violet-500 to-indigo-500' />

          {/* Modal Header */}
          <div className='p-5 sm:p-6 pb-3 border-b border-white/10 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-lg shadow-inner'>
                💳
              </div>
              <div>
                <h2 className='text-lg sm:text-xl font-black text-white flex items-center gap-2'>
                  <span>Secure Subscription Checkout</span>
                </h2>
                <p className='text-xs text-slate-300'>
                  Algérie Poste (Edahabia), SATIM (CIB), and International Card Gateway
                </p>
              </div>
            </div>

            <button
              type='button'
              onClick={handleClose}
              className='p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2.2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>

          {/* Success State Screen */}
          {isSuccess ? (
            <div className='p-8 sm:p-12 flex flex-col items-center justify-center text-center'>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className='w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(16,185,129,0.4)] mb-4'
              >
                ✓
              </motion.div>
              <h3 className='text-2xl font-black text-white'>Subscription Activated!</h3>
              <p className='text-slate-300 text-sm max-w-md mt-1'>
                Welcome to <strong className='text-violet-300'>{plan.name}</strong>. Your account has been upgraded and your studio feature gates are now unlocked.
              </p>

              {/* Receipt Pill */}
              <div className='mt-6 p-4 rounded-xl bg-slate-950/70 border border-white/15 max-w-sm w-full text-xs space-y-2 text-left'>
                <div className='flex justify-between text-slate-400'>
                  <span>Receipt No:</span>
                  <span className='font-mono font-bold text-white'>{receiptId}</span>
                </div>
                <div className='flex justify-between text-slate-400'>
                  <span>Amount Charged:</span>
                  <span className='font-bold text-amber-300'>
                    {priceObj.da.toLocaleString()} DA (${priceObj.usd} USD)
                  </span>
                </div>
                <div className='flex justify-between text-slate-400'>
                  <span>Billing Period:</span>
                  <span className='capitalize text-white'>{isAnnual ? 'Annual (12 Months)' : 'Monthly'}</span>
                </div>
                <div className='flex justify-between text-slate-400'>
                  <span>Payment Channel:</span>
                  <span className='uppercase font-semibold text-white'>
                    {method === 'edahabia' ? 'Edahabia (Algérie Poste)' : method === 'cib' ? 'CIB / SATIM' : 'Mastercard'}
                  </span>
                </div>
              </div>

              <div className='mt-8 flex gap-3'>
                <button
                  type='button'
                  onClick={handleClose}
                  className='px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 transition active:scale-95'
                >
                  Return to 3D Studio & Start Creating
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form Body */
            <div className='grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto'>
              {/* Payment Methods & Card Form (Left 7 Cols) */}
              <div className='md:col-span-7 p-5 sm:p-6 border-b md:border-b-0 md:border-r border-white/10 space-y-5'>
                {/* Method Tabs */}
                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'>
                    Select Payment Method (Algeria & International)
                  </label>
                  <div className='grid grid-cols-3 gap-2'>
                    {/* Edahabia Tab */}
                    <button
                      type='button'
                      onClick={() => {
                        setMethod('edahabia');
                        setCardNumber('6280 4412 8931 5024');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        method === 'edahabia'
                          ? 'bg-amber-500/15 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                          : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className='text-lg'>🟡</span>
                      <span>Edahabia</span>
                      <span className='text-[9px] text-amber-400/80 font-normal'>Algérie Poste</span>
                    </button>

                    {/* CIB Tab */}
                    <button
                      type='button'
                      onClick={() => {
                        setMethod('cib');
                        setCardNumber('5359 8820 1492 6301');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        method === 'cib'
                          ? 'bg-indigo-500/15 border-indigo-400 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                          : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className='text-lg'>🔵</span>
                      <span>CIB SATIM</span>
                      <span className='text-[9px] text-indigo-300/80 font-normal'>Interbank</span>
                    </button>

                    {/* Mastercard Tab */}
                    <button
                      type='button'
                      onClick={() => {
                        setMethod('mastercard');
                        setCardNumber('5412 7500 9238 1842');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        method === 'mastercard'
                          ? 'bg-violet-500/15 border-violet-400 text-violet-200 shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                          : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className='text-lg'>🔴</span>
                      <span>Mastercard</span>
                      <span className='text-[9px] text-slate-400 font-normal'>International</span>
                    </button>
                  </div>
                </div>

                {/* Virtual Card Graphic Preview */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl shadow-xl border relative overflow-hidden transition-all duration-300 ${
                    method === 'edahabia'
                      ? 'bg-gradient-to-tr from-amber-900/80 via-yellow-700/60 to-amber-600/80 border-amber-400/40'
                      : method === 'cib'
                      ? 'bg-gradient-to-tr from-slate-900 via-blue-900/70 to-indigo-700/80 border-blue-400/40'
                      : 'bg-gradient-to-tr from-slate-950 via-slate-800 to-zinc-700 border-white/20'
                  }`}
                >
                  <div className='flex justify-between items-start mb-6'>
                    <div>
                      <span className='text-[10px] font-black uppercase tracking-wider text-white/70'>
                        {method === 'edahabia' ? 'Carte Edahabia' : method === 'cib' ? 'Carte CIB SATIM' : 'Credit Card'}
                      </span>
                      <h4 className='text-sm font-bold text-white'>
                        {method === 'edahabia' ? 'BaridiNet • Algérie Poste' : method === 'cib' ? 'SATIM e-Paiement' : 'Mastercard Worldwide'}
                      </h4>
                    </div>
                    <div className='w-8 h-8 rounded-md bg-white/10 flex items-center justify-center font-black text-xs'>
                      {method === 'edahabia' ? 'AP' : method === 'cib' ? 'CIB' : 'MC'}
                    </div>
                  </div>

                  <div className='text-base sm:text-lg font-mono font-bold tracking-widest text-white/95 mb-4'>
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className='flex justify-between items-end text-xs text-white/80'>
                    <div>
                      <span className='text-[9px] uppercase tracking-wider block text-white/50'>Cardholder</span>
                      <span className='font-bold uppercase'>{cardHolder || 'CARD HOLDER'}</span>
                    </div>
                    <div>
                      <span className='text-[9px] uppercase tracking-wider block text-white/50'>Expires</span>
                      <span className='font-bold font-mono'>{expiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Input Fields */}
                <div className='space-y-3 text-xs'>
                  <div>
                    <label className='block font-semibold text-slate-300 mb-1'>Card Number</label>
                    <input
                      type='text'
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder='16-digit card number'
                      className='w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white font-mono placeholder-slate-500 focus:border-violet-500 focus:outline-none'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='block font-semibold text-slate-300 mb-1'>Expiry Date</label>
                      <input
                        type='text'
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder='MM/YY'
                        className='w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white font-mono placeholder-slate-500 focus:border-violet-500 focus:outline-none'
                      />
                    </div>
                    <div>
                      <label className='block font-semibold text-slate-300 mb-1'>
                        {method === 'cib' ? 'CVV2' : 'CVV / CVC'}
                      </label>
                      <input
                        type='password'
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder='3 digits'
                        className='w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white font-mono placeholder-slate-500 focus:border-violet-500 focus:outline-none'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block font-semibold text-slate-300 mb-1'>Cardholder Name</label>
                    <input
                      type='text'
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder='Name as printed on card'
                      className='w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white uppercase placeholder-slate-500 focus:border-violet-500 focus:outline-none'
                    />
                  </div>

                  {/* Simulated SMS OTP Verification Step */}
                  {otpStep && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className='p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/40 space-y-2'
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-violet-300 flex items-center gap-1.5'>
                          <span>📲</span>
                          <span>SMS One-Time Password (OTP)</span>
                        </span>
                        <span className='text-[10px] text-emerald-400 font-semibold'>Code sent!</span>
                      </div>
                      <p className='text-[11px] text-slate-300'>
                        Enter the 6-digit confirmation code sent by your bank to phone{' '}
                        <strong className='text-white font-mono'>+213 6** ** 24 19</strong>:
                      </p>
                      <input
                        type='text'
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className='w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-violet-400 text-center font-mono text-base tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-violet-500'
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Order Summary Sidebar (Right 5 Cols) */}
              <div className='md:col-span-5 p-5 sm:p-6 bg-slate-950/50 flex flex-col justify-between space-y-4'>
                <div className='space-y-4'>
                  <h3 className='text-sm font-black uppercase tracking-wider text-slate-300 border-b border-white/10 pb-2'>
                    Subscription Summary
                  </h3>

                  {/* Plan Badge */}
                  <div className='p-3.5 rounded-xl bg-slate-900 border border-white/15'>
                    <div className='flex justify-between items-start'>
                      <div>
                        <span className='text-[10px] font-black uppercase text-violet-400 tracking-wider'>Selected Plan</span>
                        <h4 className='text-base font-black text-white'>{plan.name}</h4>
                        <span className='text-xs text-slate-400 capitalize'>
                          Billing: {isAnnual ? 'Annual (12 Months)' : 'Monthly'}
                        </span>
                      </div>
                      <span className='px-2.5 py-1 rounded-lg text-xs font-black bg-violet-600/30 text-violet-300 border border-violet-500/40'>
                        {plan.id === 'pro' && isAnnual ? '100 Gens/mo' : plan.generations.label}
                      </span>
                    </div>
                  </div>

                  {/* Cost Calculation */}
                  <div className='space-y-2 text-xs text-slate-300'>
                    <div className='flex justify-between'>
                      <span>Platform Tools & AI License:</span>
                      <span className='font-mono text-white font-semibold'>{priceObj.da.toLocaleString()} DA</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>USD Reference Price:</span>
                      <span className='font-mono text-slate-400'>${priceObj.usd}.00 USD</span>
                    </div>
                    <div className='flex justify-between text-emerald-400'>
                      <span>Garment & Printing Charge:</span>
                      <span className='font-semibold'>0 DA (Paid to print shop)</span>
                    </div>
                    <div className='flex justify-between text-[11px] text-slate-400 pt-1 border-t border-white/10'>
                      <span>TVA / Gateway Processing:</span>
                      <span>Included</span>
                    </div>
                    <div className='flex justify-between text-base font-black text-white pt-2 border-t border-white/15'>
                      <span>Total Due Today:</span>
                      <span className='text-amber-400 font-mono'>{priceObj.da.toLocaleString()} DA</span>
                    </div>
                  </div>

                  {/* Mandatory Notice */}
                  <div className='p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed'>
                    {MANDATORY_PAYMENT_NOTICE}
                  </div>
                </div>

                {/* Checkout Trigger Button */}
                <div className='pt-2'>
                  <button
                    type='button'
                    onClick={handleRequestOtpOrPay}
                    disabled={isProcessing}
                    className='w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl hover:shadow-violet-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2'
                  >
                    {isProcessing ? (
                      <>
                        <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                        <span>{processingMessage}</span>
                      </>
                    ) : otpStep ? (
                      <span>Confirm & Pay {priceObj.da.toLocaleString()} DA</span>
                    ) : (
                      <span>Proceed with {method === 'edahabia' ? 'Edahabia' : method === 'cib' ? 'CIB' : 'Mastercard'}</span>
                    )}
                  </button>

                  <p className='text-center text-[10px] text-slate-500 mt-2'>
                    Simulated production checkout for hackathon demonstration.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SubscriptionCheckoutModal;
