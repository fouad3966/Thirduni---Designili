import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnapshot } from 'valtio';
import state, { setPlan, resetDailyQuota } from '../store';
import { ALL_PLANS, MANDATORY_PAYMENT_NOTICE } from '../config/pricingPlans';

const SubscriptionCheckoutModal = () => {
  const snap = useSnapshot(state);

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

    setIsProcessing(true);
    setProcessingMessage(
      method === 'edahabia'
        ? 'Connecting to Algérie Poste...'
        : method === 'cib'
        ? 'Connecting to SATIM...'
        : 'Authorizing card...'
    );

    setTimeout(() => {
      setProcessingMessage('Confirming transaction...');
    }, 700);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      const generatedReceipt = `DZ-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
      setReceiptId(generatedReceipt);

      setPlan(plan.id);
      resetDailyQuota();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className='responsive-modal fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto'>
        {/* Soft Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className='fixed inset-0 bg-slate-900/50 backdrop-blur-sm'
        />

        {/* Modal Window: Clean, Clear & Simple */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className='modal-window relative w-full max-w-3xl my-auto rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[92vh]'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className='px-6 py-4 border-b border-slate-100 flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-bold text-slate-900'>
                Subscription Checkout
              </h2>
              <p className='text-xs text-slate-500 mt-0.5'>
                Upgrade to {plan.name} ({isAnnual ? 'Annual' : 'Monthly'})
              </p>
            </div>

            <button
              type='button'
              onClick={handleClose}
              className='p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>

          {/* Success Screen */}
          {isSuccess ? (
            <div className='p-8 sm:p-12 flex flex-col items-center justify-center text-center'>
              <div className='w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold mb-3'>
                ✓
              </div>
              <h3 className='text-xl font-bold text-slate-900'>Subscription Activated!</h3>
              <p className='text-slate-600 text-sm max-w-md mt-1'>
                You are now subscribed to <strong className='text-slate-900'>{plan.name}</strong>. Your plan limits and features are updated.
              </p>

              {/* Receipt */}
              <div className='mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-sm w-full text-xs space-y-2 text-left'>
                <div className='flex justify-between text-slate-600'>
                  <span>Receipt No:</span>
                  <span className='font-mono font-bold text-slate-900'>{receiptId}</span>
                </div>
                <div className='flex justify-between text-slate-600'>
                  <span>Amount:</span>
                  <span className='font-bold text-slate-900'>
                    {priceObj.da.toLocaleString()} DA (${priceObj.usd} USD)
                  </span>
                </div>
                <div className='flex justify-between text-slate-600'>
                  <span>Billing Cycle:</span>
                  <span className='capitalize font-medium text-slate-900'>{isAnnual ? 'Annual' : 'Monthly'}</span>
                </div>
              </div>

              <button
                type='button'
                onClick={handleClose}
                className='mt-6 px-6 py-2.5 rounded-lg font-bold text-xs bg-slate-900 hover:bg-black text-white transition'
              >
                Return to Studio
              </button>
            </div>
          ) : (
            /* Checkout Form */
            <div className='grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto'>
              {/* Payment Details (Left 7 Cols) */}
              <div className='md:col-span-7 p-6 border-b md:border-b-0 md:border-r border-slate-100 space-y-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-700 uppercase mb-2'>
                    Payment Method
                  </label>
                  <div className='grid grid-cols-3 gap-2'>
                    {/* Edahabia */}
                    <button
                      type='button'
                      onClick={() => {
                        setMethod('edahabia');
                        setCardNumber('6280 4412 8931 5024');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                        method === 'edahabia'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className='font-bold'>Edahabia</span>
                      <span className='text-[10px] opacity-75'>Algérie Poste</span>
                    </button>

                    {/* CIB */}
                    <button
                      type='button'
                      onClick={() => {
                        setMethod('cib');
                        setCardNumber('5359 8820 1492 6301');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                        method === 'cib'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className='font-bold'>CIB</span>
                      <span className='text-[10px] opacity-75'>SATIM</span>
                    </button>

                    {/* International */}
                    <button
                      type='button'
                      onClick={() => {
                        setMethod('mastercard');
                        setCardNumber('5412 7500 9238 1842');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                        method === 'mastercard'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className='font-bold'>Card</span>
                      <span className='text-[10px] opacity-75'>Visa / MC</span>
                    </button>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className='space-y-3 text-xs'>
                  <div>
                    <label className='block font-semibold text-slate-700 mb-1'>Card Number</label>
                    <input
                      type='text'
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder='16-digit card number'
                      className='w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:border-slate-900 focus:outline-none'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='block font-semibold text-slate-700 mb-1'>Expiry</label>
                      <input
                        type='text'
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder='MM/YY'
                        className='w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:border-slate-900 focus:outline-none'
                      />
                    </div>
                    <div>
                      <label className='block font-semibold text-slate-700 mb-1'>CVV</label>
                      <input
                        type='password'
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder='3 digits'
                        className='w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:border-slate-900 focus:outline-none'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block font-semibold text-slate-700 mb-1'>Cardholder Name</label>
                    <input
                      type='text'
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder='Name on card'
                      className='w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 uppercase text-xs focus:bg-white focus:border-slate-900 focus:outline-none'
                    />
                  </div>

                  {/* OTP Step */}
                  {otpStep && (
                    <div className='p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-slate-900'>SMS Confirmation Code</span>
                        <span className='text-[10px] text-emerald-600 font-medium'>Code sent</span>
                      </div>
                      <p className='text-[11px] text-slate-500'>
                        Enter the 6-digit code sent to phone <strong className='text-slate-800 font-mono'>+213 6** ** 24 19</strong>:
                      </p>
                      <input
                        type='text'
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className='w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-center font-mono text-sm tracking-widest text-slate-900 focus:border-slate-900 focus:outline-none'
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary (Right 5 Cols) */}
              <div className='md:col-span-5 p-6 bg-slate-50 flex flex-col justify-between space-y-4'>
                <div className='space-y-4'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-slate-600'>
                    Summary
                  </h3>

                  <div className='p-3.5 rounded-lg bg-white border border-slate-200'>
                    <span className='text-[10px] font-bold uppercase text-slate-400'>Selected Tier</span>
                    <h4 className='text-base font-bold text-slate-900'>{plan.name}</h4>
                    <p className='text-xs text-slate-500 mt-0.5'>
                      {plan.id === 'pro' && isAnnual ? '100 Gens / mo' : plan.generations.label}
                    </p>
                  </div>

                  <div className='space-y-2 text-xs text-slate-600'>
                    <div className='flex justify-between'>
                      <span>Plan Rate:</span>
                      <span className='font-semibold text-slate-900'>{priceObj.da.toLocaleString()} DA</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>USD Reference:</span>
                      <span className='text-slate-500'>${priceObj.usd}.00 USD</span>
                    </div>
                    <div className='flex justify-between text-xs font-bold text-slate-900 pt-2 border-t border-slate-200'>
                      <span>Total:</span>
                      <span className='text-base font-extrabold text-slate-900'>{priceObj.da.toLocaleString()} DA</span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type='button'
                    onClick={handleRequestOtpOrPay}
                    disabled={isProcessing}
                    className='w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-slate-900 hover:bg-black text-white transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2'
                  >
                    {isProcessing ? (
                      <span>{processingMessage}</span>
                    ) : otpStep ? (
                      <span>Confirm & Pay {priceObj.da.toLocaleString()} DA</span>
                    ) : (
                      <span>Pay with {method === 'edahabia' ? 'Edahabia' : method === 'cib' ? 'CIB' : 'Card'}</span>
                    )}
                  </button>

                  <p className='text-center text-[10px] text-slate-400 mt-2'>
                    SSL Encrypted & Verified
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
