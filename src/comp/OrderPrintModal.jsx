import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnapshot } from 'valtio';
import state, { simulateNextOrderStatus } from '../store';
import {
  ALGERIAN_WILAYAS,
  PARTNER_PRINT_SHOPS,
  USD_TO_DA,
} from '../config/pricingPlans';
import { GARMENTS } from '../config/garments/catalog';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const OrderPrintModal = () => {
  const snap = useSnapshot(state);

  const [selectedSize, setSelectedSize] = useState('L');
  const [singleQty, setSingleQty] = useState(1);
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('16');
  const [address, setAddress] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('casbah-textile-alger');
  const [orderPlaced, setOrderPlaced] = useState(false);

  if (!snap.orderModalOpen && !snap.orderTrackingOpen) return null;

  const garmentInfo = GARMENTS.find((g) => g.id === snap.garment) || {
    label: snap.garment || 'Garment',
  };

  const totalQuantity = Math.max(1, parseInt(singleQty, 10) || 1);
  const selectedShop =
    PARTNER_PRINT_SHOPS.find((s) => s.id === selectedShopId) || PARTNER_PRINT_SHOPS[0];

  const unitBasePriceDA = selectedShop.basePriceDA;
  const subtotalGarmentDA = unitBasePriceDA * totalQuantity;
  const deliveryDA = selectedShop.deliveryFeeDA;
  const totalOrderDA = subtotalGarmentDA + deliveryDA;
  const totalOrderUSD = (totalOrderDA / USD_TO_DA).toFixed(2);

  const handleClose = () => {
    state.orderModalOpen = false;
    state.orderTrackingOpen = false;
    setOrderPlaced(false);
  };

  const handlePlaceOrder = () => {
    state.currentOrder.garment = snap.garment;
    state.currentOrder.quantity = totalQuantity;
    state.currentOrder.size = selectedSize;
    state.currentOrder.selectedShopId = selectedShop.id;
    state.currentOrder.wilaya = selectedWilayaCode;
    state.currentOrder.address = address;
    state.currentOrder.status = 'received';
    setOrderPlaced(true);
  };

  const orderStages = [
    { key: 'received', label: '1. Received', desc: 'Design dispatched to print atelier' },
    { key: 'printing', label: '2. Printing', desc: 'Fabric in production' },
    { key: 'shipped', label: '3. Shipped', desc: 'In transit with courier' },
    { key: 'delivered', label: '4. Delivered', desc: 'Delivered (Cash on Delivery)' },
  ];

  const currentStageIndex = orderStages.findIndex((s) => s.key === snap.currentOrder.status);

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

        {/* Modal Window: Clean, Simple & Clear */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className='modal-window relative w-full max-w-4xl my-auto rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[92vh]'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className='px-6 py-4 border-b border-slate-100 flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-bold text-slate-900'>Order This Design</h2>
              <p className='text-xs text-slate-500 mt-0.5'>
                Custom printed by verified Algerian ateliers • Pay Cash on Delivery (COD)
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

          {/* Placed Order / Tracking Screen */}
          {(orderPlaced || snap.orderTrackingOpen) ? (
            <div className='p-6 sm:p-8 space-y-6 overflow-y-auto flex-1'>
              <div className='text-center space-y-1.5'>
                <div className='w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold'>
                  ✓
                </div>
                <h3 className='text-xl font-bold text-slate-900'>Order Confirmed!</h3>
                <p className='text-xs text-slate-500'>
                  Dispatched to <strong className='text-slate-800'>{selectedShop.name}</strong> • Delivery to <strong className='text-slate-800'>{address || `Wilaya ${selectedWilayaCode}`}</strong>
                </p>
              </div>

              {/* 4-Stage Stepper */}
              <div className='grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2'>
                {orderStages.map((stage, idx) => {
                  const isPassed = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div
                      key={stage.key}
                      className={`p-3.5 rounded-xl border text-xs transition-all ${
                        isCurrent
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : isPassed
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      <div className='flex items-center justify-between font-bold mb-1'>
                        <span>{stage.label}</span>
                        <span>{isPassed ? (isCurrent ? '•' : '✓') : '⏳'}</span>
                      </div>
                      <p className={`text-[11px] leading-snug ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                        {stage.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Status Simulation Trigger */}
              <div className='p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3'>
                <div>
                  <h4 className='text-xs font-bold text-slate-800'>Delivery Simulation Tool</h4>
                  <p className='text-[11px] text-slate-500'>
                    Simulate partner production progress and courier transit stages.
                  </p>
                </div>
                <button
                  type='button'
                  onClick={simulateNextOrderStatus}
                  className='px-4 py-2 rounded-lg font-bold text-xs bg-slate-900 hover:bg-black text-white transition active:scale-95 shrink-0'
                >
                  Advance Stage →
                </button>
              </div>

              {/* Order Breakdown */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600'>
                <div className='p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5'>
                  <span className='font-bold text-slate-800 uppercase text-[10px] block'>Package Details</span>
                  <div>Garment: <strong className='text-slate-900 capitalize'>{garmentInfo.label}</strong> (Size {selectedSize})</div>
                  <div>Quantity: <strong className='text-slate-900'>{totalQuantity} piece(s)</strong></div>
                  <div>Print Atelier: <strong className='text-slate-900'>{selectedShop.name}</strong></div>
                  <div>Estimated Transit: <strong className='text-slate-900'>{selectedShop.deliveryTimeLocal}</strong></div>
                </div>

                <div className='p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5'>
                  <span className='font-bold text-slate-800 uppercase text-[10px] block'>Payment Terms</span>
                  <div>Method: <strong className='text-slate-900'>Cash on Delivery (COD)</strong></div>
                  <div>Total Due to Courier: <strong className='text-slate-900 text-sm font-bold'>{totalOrderDA.toLocaleString()} DA (${totalOrderUSD})</strong></div>
                  <div className='text-[11px] text-emerald-700 font-medium'>No card required now • Pay only when you receive your package.</div>
                </div>
              </div>

              <div className='flex justify-end pt-2'>
                <button
                  type='button'
                  onClick={handleClose}
                  className='px-5 py-2.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition'
                >
                  Close & Continue Designing
                </button>
              </div>
            </div>
          ) : (
            /* Order Form */
            <div className='grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto'>
              {/* Configuration Form (Left 7 cols) */}
              <div className='md:col-span-7 p-6 border-b md:border-b-0 md:border-r border-slate-100 space-y-5'>
                {/* Garment Preview Pill */}
                <div className='p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <div
                      className='w-8 h-8 rounded-lg border border-slate-300 shadow-xs shrink-0'
                      style={{ backgroundColor: snap.color || '#30343a' }}
                    />
                    <div>
                      <h4 className='text-xs font-bold text-slate-900 capitalize'>
                        {garmentInfo.label} ({snap.color})
                      </h4>
                      <p className='text-[11px] text-slate-500'>
                        {snap.isFullTexture ? 'Custom Fabric Pattern' : snap.isLogoTexture ? 'Chest Graphic Decal' : 'Base Garment'}
                        {snap.isTextTexture ? ' • Custom Text' : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type='button'
                    onClick={() => {
                      state.wearItOpen = true;
                      state.orderModalOpen = false;
                    }}
                    className='px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition'
                  >
                    📷 Try on Camera
                  </button>
                </div>

                {/* Sizing & Quantity */}
                <div className='space-y-3'>
                  <label className='block text-xs font-bold uppercase text-slate-700'>
                    Select Size
                  </label>
                  <div className='grid grid-cols-6 gap-2'>
                    {SIZES.map((size) => (
                      <button
                        key={size}
                        type='button'
                        onClick={() => setSelectedSize(size)}
                        className={`py-2 rounded-lg text-xs font-bold transition ${
                          selectedSize === size
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  <div className='pt-2 flex items-center justify-between'>
                    <span className='text-xs font-semibold text-slate-700'>Quantity</span>
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => setSingleQty(Math.max(1, singleQty - 1))}
                        className='w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-sm flex items-center justify-center'
                      >
                        -
                      </button>
                      <span className='w-8 text-center font-bold text-sm text-slate-900'>
                        {singleQty}
                      </span>
                      <button
                        type='button'
                        onClick={() => setSingleQty(singleQty + 1)}
                        className='w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-sm flex items-center justify-center'
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery Address (placed right under Quantity) */}
                <div className='space-y-2 pt-1'>
                  <label className='block text-xs font-bold uppercase text-slate-700'>
                    Delivery Address
                  </label>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div>
                      <select
                        value={selectedWilayaCode}
                        onChange={(e) => setSelectedWilayaCode(e.target.value)}
                        className='w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-slate-900 focus:outline-none'
                      >
                        {ALGERIAN_WILAYAS.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type='text'
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder='Street / City'
                        className='w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-slate-900 focus:outline-none'
                      />
                    </div>
                  </div>
                </div>

                {/* Partner Print Shop Selection */}
                <div className='space-y-2'>
                  <label className='block text-xs font-bold uppercase text-slate-700'>
                    Select Print Shop
                  </label>
                  <div className='space-y-2'>
                    {PARTNER_PRINT_SHOPS.map((shop) => (
                      <div
                        key={shop.id}
                        onClick={() => setSelectedShopId(shop.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          selectedShopId === shop.id
                            ? 'border-slate-900 bg-slate-50/70 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50/40'
                        }`}
                      >
                        <div className='flex justify-between items-start'>
                          <div>
                            <h5 className='text-xs font-bold text-slate-900'>{shop.name}</h5>
                            <p className='text-[11px] text-slate-500 mt-0.5'>{shop.city} • {shop.deliveryTimeLocal}</p>
                          </div>
                          <span className='text-xs font-bold text-slate-900'>
                            {shop.basePriceDA.toLocaleString()} DA
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary & Confirm (Right 5 cols) */}
              <div className='md:col-span-5 p-6 bg-slate-50 flex flex-col justify-between space-y-4'>
                <div className='space-y-4'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-slate-600'>
                    Order Summary
                  </h3>

                  <div className='p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 text-xs'>
                    <div className='flex justify-between text-slate-600'>
                      <span>Garment ({totalQuantity} pc):</span>
                      <span className='font-semibold text-slate-900'>{subtotalGarmentDA.toLocaleString()} DA</span>
                    </div>
                    <div className='flex justify-between text-slate-600'>
                      <span>Shipping to Wilaya {selectedWilayaCode}:</span>
                      <span className='font-semibold text-slate-900'>{deliveryDA.toLocaleString()} DA</span>
                    </div>
                    <div className='pt-2 border-t border-slate-200 flex justify-between text-slate-900 font-bold'>
                      <span className='text-sm'>Total Due:</span>
                      <span className='text-base font-extrabold text-slate-900'>{totalOrderDA.toLocaleString()} DA</span>
                    </div>
                    <p className='text-[11px] text-slate-400'>
                      ≈ ${totalOrderUSD} USD • Cash on Delivery
                    </p>
                  </div>

                  <div className='p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed'>
                    <strong className='font-bold'>Cash on Delivery (COD):</strong> No online card charge required. You pay the courier in cash when your garment is delivered.
                  </div>
                </div>

                <div>
                  <button
                    type='button'
                    onClick={handlePlaceOrder}
                    className='w-full py-3 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white transition active:scale-95 shadow-sm'
                  >
                    Confirm Order ({totalOrderDA.toLocaleString()} DA)
                  </button>
                  <p className='text-center text-[11px] text-slate-400 mt-2'>
                    Dispatched directly to {selectedShop.name}
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

export default OrderPrintModal;
