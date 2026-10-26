import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnapshot } from 'valtio';
import state, { simulateNextOrderStatus } from '../store';
import {
  ALGERIAN_WILAYAS,
  PARTNER_PRINT_SHOPS,
  MANDATORY_PAYMENT_NOTICE,
  USD_TO_DA,
} from '../config/pricingPlans';
import { GARMENTS } from '../config/garments/catalog';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const OrderPrintModal = () => {
  const snap = useSnapshot(state);

  const isCompanyPlan = snap.currentPlan === 'business' || snap.currentPlan === 'business_plus';
  const isFreePlan = snap.currentPlan === 'free';

  // Order configuration state (unconditional top-level hooks)
  const [isBulkMode, setIsBulkMode] = useState(isCompanyPlan);
  const [selectedSize, setSelectedSize] = useState('L');
  const [singleQty, setSingleQty] = useState(1);
  const [bulkSizes, setBulkSizes] = useState({ XS: 0, S: 10, M: 20, L: 20, XL: 10, XXL: 0 });
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('31');
  const [address, setAddress] = useState("12 Rue Larbi Ben M'hidi, Oran");
  const [selectedShopId, setSelectedShopId] = useState('oran-print-hub');
  const [showEconomicsDetails, setShowEconomicsDetails] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);

  if (!snap.orderModalOpen && !snap.orderTrackingOpen) return null;

  const garmentInfo = GARMENTS.find((g) => g.id === snap.garment) || {
    label: snap.garment || 'Garment',
  };

  // Calculate quantities and pricing
  const totalQuantity = isBulkMode
    ? Object.values(bulkSizes).reduce((sum, n) => sum + Number(n || 0), 0)
    : Number(singleQty);

  const selectedShop =
    PARTNER_PRINT_SHOPS.find((s) => s.id === selectedShopId) || PARTNER_PRINT_SHOPS[0];

  const unitBasePriceDA = selectedShop.basePriceDA;
  const bulkDiscount =
    isBulkMode && totalQuantity >= selectedShop.minBulkQty
      ? selectedShop.bulkDiscountPercent / 100
      : 0;
  const discountedUnitDA = Math.round(unitBasePriceDA * (1 - bulkDiscount));
  const subtotalGarmentDA = discountedUnitDA * totalQuantity;
  const deliveryDA = selectedShop.deliveryFeeDA;
  const totalOrderDA = subtotalGarmentDA + deliveryDA;
  const totalOrderUSD = (totalOrderDA / USD_TO_DA).toFixed(2);

  // 15% Platform Commission (invoiced to print shop, NOT charged to customer)
  const platformCommissionDA = Math.round(subtotalGarmentDA * 0.15);
  const platformCommissionUSD = (platformCommissionDA / USD_TO_DA).toFixed(2);

  const handleClose = () => {
    state.orderModalOpen = false;
    state.orderTrackingOpen = false;
    setOrderPlaced(false);
  };

  const handlePlaceOrder = () => {
    state.currentOrder.garment = snap.garment;
    state.currentOrder.quantity = totalQuantity;
    state.currentOrder.selectedShopId = selectedShop.id;
    state.currentOrder.wilaya = selectedWilayaCode;
    state.currentOrder.status = 'received';
    setOrderPlaced(true);
  };

  const orderStages = [
    { key: 'received', label: '1. Received', desc: '3D print spec files dispatched to partner shop' },
    { key: 'printing', label: '2. Printing', desc: 'Textile assembly & color-matched print in production' },
    { key: 'shipped', label: '3. Shipped', desc: 'Courier in transit with Cash on Delivery tracking' },
    { key: 'delivered', label: '4. Delivered', desc: 'Paid COD to courier; 15% platform commission logged' },
  ];

  const currentStageIndex = orderStages.findIndex((s) => s.key === snap.currentOrder.status);

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
          className='relative w-full max-w-5xl my-auto rounded-2xl bg-slate-900/95 border border-white/15 shadow-[0_25px_65px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(99,102,241,0.2)] backdrop-blur-2xl text-white overflow-hidden flex flex-col max-h-[94vh]'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Gradient */}
          <div className='h-1.5 w-full bg-gradient-to-r from-emerald-400 via-violet-500 to-indigo-500' />

          {/* Modal Header */}
          <div className='p-5 sm:p-6 pb-3 border-b border-white/10 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-lg shadow-inner'>
                📦
              </div>
              <div>
                <h2 className='text-lg sm:text-xl font-black text-white flex items-center gap-2'>
                  <span>Order Physical Garment from Partner Print Shops</span>
                </h2>
                <p className='text-xs text-slate-300'>
                  Algerian verified textile ateliers • Cash on Delivery (COD) • Direct 3D Techpack Dispatch
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

          {/* Mandatory Separation-of-Payment Banner */}
          <div className='mx-5 sm:mx-6 mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200'>
            <span className='text-base shrink-0'>ℹ️</span>
            <p className='font-medium leading-relaxed'>{MANDATORY_PAYMENT_NOTICE}</p>
          </div>

          {/* Live Order Tracker View if placed */}
          {(orderPlaced || snap.orderTrackingOpen) ? (
            <div className='p-6 sm:p-8 space-y-6 overflow-y-auto flex-1'>
              <div className='text-center space-y-1.5'>
                <span className='px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'>
                  Order Active & Dispatched
                </span>
                <h3 className='text-xl sm:text-2xl font-black text-white'>
                  4-Stage Live Delivery Tracker
                </h3>
                <p className='text-xs text-slate-300'>
                  Order dispatched to <strong className='text-white'>{selectedShop.name}</strong> • Destination:{' '}
                  <strong className='text-white'>{address}</strong>
                </p>
              </div>

              {/* 4-Stage Progress Stepper */}
              <div className='grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3'>
                {orderStages.map((stage, idx) => {
                  const isPassed = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div
                      key={stage.key}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-violet-950/60 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                          : isPassed
                          ? 'bg-emerald-950/40 border-emerald-500/40'
                          : 'bg-slate-900/60 border-white/10 opacity-60'
                      }`}
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-xs font-black uppercase text-white'>{stage.label}</span>
                        <span>{isPassed ? (isCurrent ? '🔄' : '✓') : '⏳'}</span>
                      </div>
                      <p className='text-[11px] text-slate-300 leading-snug'>{stage.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Tracking Simulation Tool */}
              <div className='p-5 rounded-2xl bg-slate-950/80 border border-violet-500/40 flex flex-col sm:flex-row items-center justify-between gap-4'>
                <div>
                  <h4 className='text-sm font-bold text-violet-300 flex items-center gap-2'>
                    <span>🔄</span>
                    <span>Live Tracking Simulator</span>
                  </h4>
                  <p className='text-xs text-slate-400'>
                    Simulate real-time partner production updates and courier transit stages.
                  </p>
                </div>
                <button
                  type='button'
                  onClick={simulateNextOrderStatus}
                  className='px-5 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 transition active:scale-95 shrink-0'
                >
                  Advance Next Stage →
                </button>
              </div>

              {/* Order Summary & COD Notice */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300'>
                <div className='p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2'>
                  <span className='font-bold text-white uppercase text-[10px] tracking-wider block'>
                    Package Details
                  </span>
                  <div>Garment: <strong className='text-white capitalize'>{garmentInfo.label}</strong> ({snap.color})</div>
                  <div>Quantity: <strong className='text-white'>{totalQuantity} piece(s)</strong> {isBulkMode && '(Bulk Batch)'}</div>
                  <div>Print Shop: <strong className='text-white'>{selectedShop.name}</strong></div>
                  <div>Estimated Arrival: <strong className='text-emerald-400'>{selectedShop.deliveryTimeLocal}</strong></div>
                </div>

                <div className='p-4 rounded-xl bg-slate-900 border border-white/10 space-y-2'>
                  <span className='font-bold text-white uppercase text-[10px] tracking-wider block'>
                    Payment & Economics
                  </span>
                  <div>Payment Term: <strong className='text-amber-300'>Cash on Delivery (COD)</strong></div>
                  <div>Amount to Pay Courier: <strong className='text-white font-mono text-sm'>{totalOrderDA.toLocaleString()} DA (${totalOrderUSD})</strong></div>
                  <div className='text-emerald-400 font-semibold'>Platform Charge: 0 DA (Paid directly to print shop)</div>
                  <div className='text-[10px] text-slate-400 pt-1 border-t border-white/10'>
                    15% Partner Commission: <strong className='text-violet-300'>{platformCommissionDA.toLocaleString()} DA (${platformCommissionUSD})</strong> (invoiced monthly to {selectedShop.name})
                  </div>
                </div>
              </div>

              <div className='flex justify-end pt-2'>
                <button
                  type='button'
                  onClick={handleClose}
                  className='px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition'
                >
                  Close & Continue Designing
                </button>
              </div>
            </div>
          ) : (
            /* Main 6-Step Order Builder */
            <div className='grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto'>
              {/* Left Column: Garment, Sizing, Wilaya, and Print Shop (7 Cols) */}
              <div className='md:col-span-7 p-5 sm:p-6 border-b md:border-b-0 md:border-r border-white/10 space-y-5'>
                {/* Step 1: Design & Wear It verification banner */}
                <div className='p-3.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <div
                      className='w-9 h-9 rounded-lg border border-white/20 shadow-md shrink-0 flex items-center justify-center text-base'
                      style={{ backgroundColor: snap.color || '#30343a' }}
                    >
                      👕
                    </div>
                    <div>
                      <h4 className='text-xs font-bold text-white capitalize'>
                        {garmentInfo.label} • {snap.color}
                      </h4>
                      <p className='text-[10px] text-slate-400'>
                        {snap.isFullTexture ? 'Sublimation Texture' : snap.isLogoTexture ? 'Front Emblem Decal' : 'Clean Base'}
                        {snap.isTextTexture ? ' • Custom Text Print' : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type='button'
                    onClick={() => {
                      state.wearItOpen = true;
                      state.orderModalOpen = false;
                    }}
                    className='px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/40 transition flex items-center gap-1.5 shrink-0'
                  >
                    <span>📷</span>
                    <span>Verify with Wear It</span>
                  </button>
                </div>

                {/* Step 2: Order Mode, Sizing & Wilaya */}
                <div className='space-y-4'>
                  {/* Order Mode Toggle */}
                  <div className='flex items-center justify-between'>
                    <label className='text-xs font-bold uppercase tracking-wider text-slate-400'>
                      Order Mode & Sizing
                    </label>

                    {/* Bulk Toggle (Company Plans) */}
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => setIsBulkMode(false)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                          !isBulkMode ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Single / Sample
                      </button>
                      <button
                        type='button'
                        onClick={() => setIsBulkMode(true)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                          isBulkMode
                            ? 'bg-violet-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Company Bulk Batch</span>
                        {!isCompanyPlan && (
                          <span className='px-1 py-0.2 rounded text-[9px] bg-amber-400 text-black font-black'>
                            PRO/BIZ
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Sizing Controls */}
                  {isBulkMode ? (
                    /* Multi-Size Matrix for Bulk */
                    <div className='p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2.5'>
                      <div className='flex justify-between items-center text-xs'>
                        <span className='font-bold text-violet-300'>Company Multi-Size Matrix</span>
                        <span className='text-[10px] text-emerald-400 font-semibold'>
                          Total: {totalQuantity} pcs {totalQuantity >= 10 ? '(Volume discount applied!)' : ''}
                        </span>
                      </div>
                      <div className='grid grid-cols-6 gap-2 text-center text-xs'>
                        {SIZES.map((size) => (
                          <div key={size} className='space-y-1'>
                            <span className='text-[10px] font-black text-slate-400'>{size}</span>
                            <input
                              type='number'
                              min={0}
                              max={500}
                              value={bulkSizes[size] || 0}
                              onChange={(e) =>
                                setBulkSizes({
                                  ...bulkSizes,
                                  [size]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                              }
                              className='w-full px-1.5 py-1.5 text-center text-xs rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:border-violet-500 focus:outline-none'
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Single Sizing & Qty */
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-[11px] font-semibold text-slate-300 mb-1'>Size</label>
                        <div className='grid grid-cols-6 gap-1.5'>
                          {SIZES.map((size) => (
                            <button
                              key={size}
                              type='button'
                              onClick={() => setSelectedSize(size)}
                              className={`py-1.5 text-xs font-bold rounded-lg transition ${
                                selectedSize === size
                                  ? 'bg-violet-600 text-white shadow-xs'
                                  : 'bg-slate-800/80 text-slate-300 border border-white/10 hover:border-white/20'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className='block text-[11px] font-semibold text-slate-300 mb-1'>Quantity</label>
                        <input
                          type='number'
                          min={1}
                          max={20}
                          value={singleQty}
                          onChange={(e) => setSingleQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className='w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800/90 border border-slate-700 text-white font-mono focus:border-violet-500 focus:outline-none'
                        />
                      </div>
                    </div>
                  )}

                  {/* Wilaya & Address Selection */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1'>
                    <div>
                      <label className='block text-[11px] font-semibold text-slate-300 mb-1'>
                        Delivery Wilaya (Algeria)
                      </label>
                      <select
                        value={selectedWilayaCode}
                        onChange={(e) => setSelectedWilayaCode(e.target.value)}
                        className='w-full px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white focus:border-violet-500 focus:outline-none'
                      >
                        {ALGERIAN_WILAYAS.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='block text-[11px] font-semibold text-slate-300 mb-1'>
                        Commune & Street Address
                      </label>
                      <input
                        type='text'
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder='Commune, Boulevard, Quartier...'
                        className='w-full px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white focus:border-violet-500 focus:outline-none'
                      />
                    </div>
                  </div>
                </div>

                {/* Step 3 & 4: Partner Print Shop Directory */}
                <div className='space-y-3 pt-2'>
                  <div className='flex items-center justify-between'>
                    <label className='text-xs font-bold uppercase tracking-wider text-slate-400'>
                      Select Verified Partner Print Shop
                    </label>
                    <span className='text-[10px] text-emerald-400 font-semibold'>
                      {PARTNER_PRINT_SHOPS.length} verified workshops available
                    </span>
                  </div>

                  <div className='space-y-2.5'>
                    {PARTNER_PRINT_SHOPS.map((shop) => {
                      const isSelected = selectedShopId === shop.id;

                      return (
                        <div
                          key={shop.id}
                          onClick={() => setSelectedShopId(shop.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800/95 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.25)]'
                              : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className='flex items-start justify-between gap-3'>
                            <div className='flex-1'>
                              <div className='flex items-center gap-2 mb-0.5'>
                                <h4 className='text-xs font-bold text-white'>{shop.name}</h4>
                                <span className='px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'>
                                  ★ {shop.rating} Verified
                                </span>
                              </div>
                              <p className='text-[10px] text-slate-400 mb-2'>{shop.city} • {shop.description}</p>
                              
                              <div className='flex flex-wrap gap-1.5'>
                                {shop.specialties.map((spec, idx) => (
                                  <span key={idx} className='px-2 py-0.5 rounded-md text-[9px] bg-slate-800 text-slate-300 border border-white/5'>
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className='text-right shrink-0'>
                              <div className='text-xs font-mono font-bold text-amber-300'>
                                {shop.basePriceDA.toLocaleString()} DA / pc
                              </div>
                              <span className='text-[10px] text-slate-400'>
                                Delivery: {shop.deliveryTimeLocal}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Economics, COD confirmation & Checkout CTA (5 Cols) */}
              <div className='md:col-span-5 p-5 sm:p-6 bg-slate-950/60 flex flex-col justify-between space-y-4'>
                <div className='space-y-4'>
                  <h3 className='text-sm font-black uppercase tracking-wider text-slate-300 border-b border-white/10 pb-2'>
                    Order Summary & Quotation
                  </h3>

                  {/* Summary Breakdown */}
                  <div className='space-y-2.5 text-xs text-slate-300'>
                    <div className='flex justify-between'>
                      <span>Garment & Sublimation Printing:</span>
                      <span className='font-mono text-white'>
                        {subtotalGarmentDA.toLocaleString()} DA
                      </span>
                    </div>

                    {bulkDiscount > 0 && (
                      <div className='flex justify-between text-emerald-400'>
                        <span>Volume Bulk Discount ({selectedShop.bulkDiscountPercent}%):</span>
                        <span>-{(Math.round(unitBasePriceDA * bulkDiscount) * totalQuantity).toLocaleString()} DA</span>
                      </div>
                    )}

                    <div className='flex justify-between'>
                      <span>Doorstep Courier Delivery:</span>
                      <span className='font-mono text-white'>{deliveryDA.toLocaleString()} DA</span>
                    </div>

                    <div className='flex justify-between text-emerald-400'>
                      <span>Designili Platform Charge:</span>
                      <span className='font-semibold'>$0 / 0 DA</span>
                    </div>

                    <div className='flex justify-between text-base font-black text-white pt-2.5 border-t border-white/15'>
                      <span>Total Cash On Delivery:</span>
                      <span className='text-amber-400 font-mono'>
                        {totalOrderDA.toLocaleString()} DA (${totalOrderUSD})
                      </span>
                    </div>
                  </div>

                  {/* Payment Term Pill */}
                  <div className='p-3 rounded-xl bg-slate-900 border border-white/15 text-xs space-y-1.5'>
                    <div className='flex items-center gap-2 text-white font-bold'>
                      <span className='text-amber-400'>💵</span>
                      <span>Payment Method: Cash on Delivery (COD)</span>
                    </div>
                    <p className='text-[11px] text-slate-400 leading-relaxed'>
                      You pay directly to the delivery courier upon inspecting your printed garment. Designili charges 0 DA at checkout.
                    </p>
                  </div>

                  {/* Collapsible Platform Fee Transparency */}
                  <div className='rounded-xl border border-violet-500/30 bg-violet-950/20 overflow-hidden text-xs'>
                    <button
                      type='button'
                      onClick={() => setShowEconomicsDetails(!showEconomicsDetails)}
                      className='w-full p-2.5 flex items-center justify-between text-[11px] font-bold text-violet-300 hover:bg-violet-900/20 transition'
                    >
                      <span className='flex items-center gap-1.5'>
                        <span>📊</span>
                        <span>Platform Fee & Commission Breakdown</span>
                      </span>
                      <span>{showEconomicsDetails ? '▲' : '▼'}</span>
                    </button>

                    {showEconomicsDetails && (
                      <div className='p-3 pt-0 text-[11px] text-slate-300 space-y-2 border-t border-violet-500/20 mt-1'>
                        <div className='flex justify-between'>
                          <span>15% Platform Commission:</span>
                          <strong className='text-amber-300 font-mono'>
                            {platformCommissionDA.toLocaleString()} DA (${platformCommissionUSD} USD)
                          </strong>
                        </div>
                        <p className='text-[10px] text-slate-400 leading-normal'>
                          Designili invoices the partner print shop monthly for this 15% marketplace fee. It is never charged to the customer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className='pt-2'>
                  <button
                    type='button'
                    onClick={handlePlaceOrder}
                    disabled={isFreePlan}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                      isFreePlan
                        ? 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl hover:shadow-emerald-500/25 active:scale-95'
                    }`}
                  >
                    {isFreePlan ? 'Upgrade to Pro to Order Print' : `Confirm Order (${totalOrderDA.toLocaleString()} DA COD)`}
                  </button>

                  {isFreePlan && (
                    <p className='text-center text-[10px] text-amber-300 font-semibold mt-2'>
                      Free trial accounts can design & simulate. Upgrade to Pro ($9 / 1,200 DA) to place physical orders.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OrderPrintModal;
