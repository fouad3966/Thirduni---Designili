import React, { useState, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import state, { openPricing, openOrderPrint } from '../store';
import { MANDATORY_PAYMENT_NOTICE, ALL_PLANS } from '../config/pricingPlans';
import {
  captureFrontAndBackViews,
  generateSpecSheetCanvas,
  generateCleanMockupCanvas,
  downloadCanvasAsImage,
  copyCanvasToClipboard,
} from '../config/exportSpecSheet';
import { GARMENTS } from '../config/garments/catalog';

const ExportModal = ({ isOpen, onClose }) => {
  const snap = useSnapshot(state);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [exportStyle, setExportStyle] = useState('techpack'); // 'techpack' | 'mockup'
  const [format, setFormat] = useState('png'); // 'png' | 'jpeg'
  const [notes, setNotes] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const canvasRef = useRef(null);
  const cachedViews = useRef(null);

  const planConfig = ALL_PLANS[snap.currentPlan] || ALL_PLANS.free;
  const canExportToOutsidePrinter = !!planConfig.exportToOutsidePrinter;

  const garmentInfo = GARMENTS.find((g) => g.id === snap.garment) || {
    label: snap.garment || 'Garment',
  };

  const buildActiveCanvas = async (views, style, fmt) => {
    if (!views) return null;
    let sheetCanvas = null;
    if (style === 'techpack') {
      sheetCanvas = await generateSpecSheetCanvas({
        frontImage: views.frontImage,
        backImage: views.backImage,
        designState: snap,
        notes,
        orderQty,
        designerName: 'ThirdUni Creator',
      });
    } else {
      sheetCanvas = await generateCleanMockupCanvas({
        frontImage: views.frontImage,
        backImage: views.backImage,
        garmentLabel: garmentInfo.label,
        colorHex: snap.color || '#EFBD48',
      });
    }
    canvasRef.current = sheetCanvas;
    const mime = fmt === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = fmt === 'jpeg' ? 0.94 : undefined;
    return sheetCanvas.toDataURL(mime, quality);
  };

  // Generate when modal opens
  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null);
      cachedViews.current = null;
      setCopied(false);
      setDownloadSuccess(false);
      return;
    }

    let isMounted = true;

    async function runGeneration() {
      setIsGenerating(true);
      try {
        setGenerationStep('Capturing 3D Front & Back angles...');
        const views = await captureFrontAndBackViews();
        if (!isMounted) return;
        cachedViews.current = views;

        setGenerationStep('Assembling high-resolution export image...');
        const url = await buildActiveCanvas(views, exportStyle, format);
        if (!isMounted) return;
        setPreviewUrl(url);
      } catch (err) {
        console.error('Export sheet generation failed:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    }

    runGeneration();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Re-render canvas when style or notes change
  const handleStyleChange = async (newStyle) => {
    setExportStyle(newStyle);
    if (!cachedViews.current) return;
    setIsGenerating(true);
    setGenerationStep('Re-rendering layout...');
    try {
      const url = await buildActiveCanvas(cachedViews.current, newStyle, format);
      setPreviewUrl(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateNotes = async () => {
    if (!cachedViews.current) return;
    setIsGenerating(true);
    setGenerationStep('Updating specifications...');
    try {
      const url = await buildActiveCanvas(cachedViews.current, exportStyle, format);
      setPreviewUrl(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!canExportToOutsidePrinter) {
      return;
    }
    if (!canvasRef.current) return;
    const dateTag = new Date().toISOString().slice(0, 10);
    const prefix = exportStyle === 'techpack' ? 'TechPack' : 'Mockup';
    const cleanLabel = (garmentInfo.label || 'Garment').replace(/\s+/g, '_');
    const filename = `${prefix}_${cleanLabel}_Front_Back_${dateTag}`;

    downloadCanvasAsImage(canvasRef.current, filename, format);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleTestDownload = () => {
    if (!canvasRef.current) return;
    const dateTag = new Date().toISOString().slice(0, 10);
    const prefix = exportStyle === 'techpack' ? 'TechPack_Test' : 'Mockup_Test';
    const cleanLabel = (garmentInfo.label || 'Garment').replace(/\s+/g, '_');
    const filename = `${prefix}_${cleanLabel}_Front_Back_${dateTag}`;

    downloadCanvasAsImage(canvasRef.current, filename, format);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleCopyClipboard = async () => {
    if (!canExportToOutsidePrinter) return;
    if (!canvasRef.current) return;
    try {
      await copyCanvasToClipboard(canvasRef.current);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Could not copy to clipboard:', err);
    }
  };

  const handlePrint = () => {
    if (!canExportToOutsidePrinter) return;
    if (!previewUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>ThirdUni Production Spec Sheet - ${garmentInfo.label}</title>
          <style>
            body { margin: 0; padding: 20px; background: #fff; font-family: sans-serif; text-align: center; }
            img { max-width: 100%; height: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; }
            @media print { body { padding: 0; } img { width: 100%; } }
          </style>
        </head>
        <body>
          <img src="${previewUrl}" onload="window.print();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150'>
      <div className='relative w-full max-w-5xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]'>
        {/* Modal Header */}
        <div className='px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-lg shadow-sm'>
              📐
            </div>
            <div>
              <h2 className='text-base font-bold flex items-center gap-2'>
                <span>Export Design Specs & Tech Pack</span>
                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-400/40 uppercase'>
                  Front & Back Dual-View
                </span>
              </h2>
              <p className='text-xs text-slate-400'>
                High-resolution technical flat mockup & colorway specification for sewers and printers
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition text-sm font-bold'
            title='Close'
          >
            ✕
          </button>
        </div>

        {/* Mandatory Payment Notice Banner */}
        <div className='px-6 py-2.5 bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/50 border-b border-amber-500/30 flex items-center gap-2 text-xs text-amber-200/90'>
          <span className='text-amber-400 text-sm'>📢</span>
          <span className='font-medium'>{MANDATORY_PAYMENT_NOTICE}</span>
        </div>

        {/* Modal Content */}
        <div className='flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 custom-scrollbar bg-slate-900/60'>
          {/* Export Style Switcher & Format */}
          <div className='flex flex-wrap items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 shadow-xs gap-3'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold text-slate-300 pl-1'>Export Mode:</span>
              <div className='flex bg-slate-900/90 p-0.5 rounded-lg border border-slate-700'>
                <button
                  type='button'
                  onClick={() => handleStyleChange('techpack')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    exportStyle === 'techpack'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>📋</span>
                  <span>Full Tech Pack (Specs & Codes)</span>
                </button>
                <button
                  type='button'
                  onClick={() => handleStyleChange('mockup')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    exportStyle === 'mockup'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🖼️</span>
                  <span>Clean Mockup Only (Front + Back)</span>
                </button>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold text-slate-300'>Format:</span>
              <div className='flex bg-slate-900/90 p-0.5 rounded-lg border border-slate-700'>
                <button
                  type='button'
                  onClick={() => setFormat('png')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                    format === 'png'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title='Lossless PNG (Best for printers and sewers)'
                >
                  .PNG
                </button>
                <button
                  type='button'
                  onClick={() => setFormat('jpeg')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                    format === 'jpeg'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title='Compressed JPG (Great for fast email/WhatsApp)'
                >
                  .JPG
                </button>
              </div>
            </div>
          </div>

          {/* Main Visual Preview Area */}
          <div className='relative w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center min-h-[320px] max-h-[440px]'>
            {isGenerating ? (
              <div className='flex flex-col items-center gap-3 py-16 text-center text-white'>
                <div className='w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin' />
                <p className='text-sm font-bold text-slate-200'>{generationStep}</p>
                <p className='text-xs text-slate-400'>
                  Rotating 3D canvas and capturing 300 DPI technical elevations...
                </p>
              </div>
            ) : previewUrl ? (
              <div className='relative p-3 w-full h-full flex items-center justify-center'>
                <img
                  src={previewUrl}
                  alt='Production Export Sheet'
                  className='max-w-full max-h-[420px] object-contain rounded-lg shadow-2xl border border-slate-800'
                />
                {!canExportToOutsidePrinter && (
                  <div className='absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4'>
                    <div className='max-w-md bg-slate-900/95 border border-amber-500/40 p-5 rounded-2xl shadow-2xl text-center flex flex-col items-center gap-3'>
                      <div className='w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl text-amber-300'>
                        🔒
                      </div>
                      <h4 className='text-sm font-bold text-white'>
                        Outside Print Shop Export Locked
                      </h4>
                      <p className='text-xs text-slate-300 leading-relaxed'>
                        Direct technical exports to any outside printer without platform commission require the{' '}
                        <strong className='text-violet-300'>Studio ($19/mo)</strong> or{' '}
                        <strong className='text-violet-300'>Business Plus ($79/mo)</strong> plan.
                      </p>
                      <p className='text-xs text-emerald-400 font-medium'>
                        💡 You can order this garment directly through our certified Algerian Partner Print Shops (Cash on Delivery, 0 DA platform fee)!
                      </p>
                      <div className='flex flex-wrap gap-2 w-full pt-2'>
                        <button
                          type='button'
                          onClick={() => {
                            onClose();
                            openOrderPrint();
                          }}
                          className='flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition'
                        >
                          Order from Partner Shop (COD) →
                        </button>
                        <button
                          type='button'
                          onClick={() => {
                            onClose();
                            openPricing(snap.audienceTab || 'individuals');
                          }}
                          className='flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition'
                        >
                          Upgrade to Studio ($19)
                        </button>
                      </div>

                      <button
                        type='button'
                        onClick={handleTestDownload}
                        className='w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5'
                        title='Test export functionality (downloads full sheet with details)'
                      >
                        <span>🧪</span>
                        <span>{downloadSuccess ? 'Downloaded Test Sheet! ✓' : 'Test Download Full Specs Sheet'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className='text-xs text-slate-400'>No preview available</p>
            )}
          </div>

          {/* Notes Section for Tech Pack */}
          {exportStyle === 'techpack' && (
            <div className='p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 shadow-xs flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <label className='text-xs font-bold text-slate-200 flex items-center gap-1.5'>
                  <span>✂️</span>
                  <span>Custom Sewing & Printing Instructions</span>
                </label>
                <span className='text-[10px] text-slate-400'>Printed on the spec sheet</span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-4 gap-2'>
                <input
                  type='text'
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  placeholder='Qty (e.g. 50 pcs)'
                  className='col-span-1 px-3 py-1.5 text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-violet-500 bg-slate-900 text-white placeholder-slate-500'
                />
                <input
                  type='text'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='Notes: Sizing breakdown, fabric weight (e.g. 280 GSM), stitching...'
                  className='col-span-3 px-3 py-1.5 text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-violet-500 bg-slate-900 text-white placeholder-slate-500'
                />
              </div>
              <div className='flex items-center justify-between pt-1'>
                <span className='text-[10px] text-slate-400'>
                  Garment: <strong className='text-slate-200 capitalize'>{garmentInfo.label}</strong> • Color:{' '}
                  <strong className='font-mono text-slate-200 uppercase'>{snap.color}</strong>
                </span>
                <button
                  type='button'
                  onClick={handleUpdateNotes}
                  className='px-2.5 py-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 hover:bg-violet-950/40 rounded-lg transition'
                >
                  ↻ Update Sheet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className='px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={handleCopyClipboard}
              disabled={isGenerating || !previewUrl || !canExportToOutsidePrinter}
              className='px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-40'
              title={!canExportToOutsidePrinter ? 'Requires Studio or Business Plus' : 'Copy image'}
            >
              <span>📋</span>
              <span>{copied ? 'Copied Image to Clipboard! ✨' : 'Copy Image'}</span>
            </button>
            <button
              type='button'
              onClick={handlePrint}
              disabled={isGenerating || !previewUrl || !canExportToOutsidePrinter}
              className='px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-40'
              title={!canExportToOutsidePrinter ? 'Requires Studio or Business Plus' : 'Print sheet'}
            >
              <span>🖨️</span>
              <span>Print Sheet</span>
            </button>
            <button
              type='button'
              onClick={handleTestDownload}
              disabled={isGenerating || !previewUrl}
              className='px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-40'
              title='Test download functionality (downloads the full sheet with design details)'
            >
              <span>🧪</span>
              <span>{downloadSuccess ? 'Saved Image! ✓' : 'Test Download Sheet'}</span>
            </button>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition'
            >
              Close
            </button>

            {canExportToOutsidePrinter ? (
              <button
                type='button'
                onClick={handleDownload}
                disabled={isGenerating || !previewUrl}
                className='px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-50'
              >
                <span>📥</span>
                <span>
                  {downloadSuccess
                    ? 'Saved Image! ✓'
                    : `Download Image (.${format === 'jpeg' ? 'JPG' : 'PNG'})`}
                </span>
              </button>
            ) : (
              <button
                type='button'
                onClick={() => {
                  onClose();
                  openOrderPrint();
                }}
                className='px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition flex items-center gap-2 active:scale-95'
              >
                <span>🚚</span>
                <span>Order from Partner Print Shop (COD)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
