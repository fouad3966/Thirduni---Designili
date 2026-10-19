import React, { useState, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import state from '../store';
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
    if (!canvasRef.current) return;
    const dateTag = new Date().toISOString().slice(0, 10);
    const prefix = exportStyle === 'techpack' ? 'TechPack' : 'Mockup';
    const cleanLabel = (garmentInfo.label || 'Garment').replace(/\s+/g, '_');
    const filename = `${prefix}_${cleanLabel}_Front_Back_${dateTag}`;

    downloadCanvasAsImage(canvasRef.current, filename, format);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleCopyClipboard = async () => {
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
      <div className='relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]'>
        {/* Modal Header */}
        <div className='px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-lg shadow-sm'>
              📐
            </div>
            <div>
              <h2 className='text-base font-bold flex items-center gap-2'>
                <span>Export Design for Production</span>
                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase'>
                  Front & Back Dual-View
                </span>
              </h2>
              <p className='text-xs text-slate-400'>
                Ready-to-manufacture technical flat mockup & colorway specification for sewers and printers
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

        {/* Modal Content */}
        <div className='flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 custom-scrollbar bg-slate-50/50'>
          {/* Export Style Switcher */}
          <div className='flex items-center justify-between bg-white p-2 rounded-xl border border-gray-200 shadow-xs'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold text-gray-700 pl-1'>Export Mode:</span>
              <div className='flex bg-gray-100 p-0.5 rounded-lg border border-gray-200'>
                <button
                  type='button'
                  onClick={() => handleStyleChange('techpack')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    exportStyle === 'techpack'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
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
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>🖼️</span>
                  <span>Clean Mockup Only (Front + Back)</span>
                </button>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold text-gray-700'>Format:</span>
              <div className='flex bg-gray-100 p-0.5 rounded-lg border border-gray-200'>
                <button
                  type='button'
                  onClick={() => setFormat('png')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                    format === 'png'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
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
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title='Compressed JPG (Great for fast email/WhatsApp)'
                >
                  .JPG
                </button>
              </div>
            </div>
          </div>

          {/* Main Visual Preview Area */}
          <div className='relative w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner flex items-center justify-center min-h-[340px] max-h-[460px]'>
            {isGenerating ? (
              <div className='flex flex-col items-center gap-3 py-16 text-center text-white'>
                <div className='w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin' />
                <p className='text-sm font-bold text-slate-200'>{generationStep}</p>
                <p className='text-xs text-slate-400'>
                  Rotating 3D canvas and capturing 300 DPI technical elevations...
                </p>
              </div>
            ) : previewUrl ? (
              <div className='p-3 w-full h-full flex items-center justify-center'>
                <img
                  src={previewUrl}
                  alt='Production Export Sheet'
                  className='max-w-full max-h-[440px] object-contain rounded-lg shadow-2xl border border-slate-800'
                />
              </div>
            ) : (
              <p className='text-xs text-slate-400'>No preview available</p>
            )}
          </div>

          {/* Notes Section for Tech Pack */}
          {exportStyle === 'techpack' && (
            <div className='p-4 bg-white rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <label className='text-xs font-bold text-gray-800 flex items-center gap-1.5'>
                  <span>✂️</span>
                  <span>Custom Sewing & Printing Instructions</span>
                </label>
                <span className='text-[10px] text-gray-400'>Printed on the spec sheet</span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-4 gap-2'>
                <input
                  type='text'
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  placeholder='Qty (e.g. 50 pcs)'
                  className='col-span-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500 bg-white'
                />
                <input
                  type='text'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='Notes: Sizing breakdown, fabric weight (e.g. 280 GSM), stitching...'
                  className='col-span-3 px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500 bg-white'
                />
              </div>
              <div className='flex items-center justify-between pt-1'>
                <span className='text-[10px] text-gray-500'>
                  Garment: <strong className='text-gray-800 capitalize'>{garmentInfo.label}</strong> • Color:{' '}
                  <strong className='font-mono text-gray-800 uppercase'>{snap.color}</strong>
                </span>
                <button
                  type='button'
                  onClick={handleUpdateNotes}
                  className='px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition'
                >
                  ↻ Update Sheet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className='px-6 py-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={handleCopyClipboard}
              disabled={isGenerating || !previewUrl}
              className='px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 shadow-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50'
            >
              <span>📋</span>
              <span>{copied ? 'Copied Image to Clipboard! ✨' : 'Copy Image'}</span>
            </button>
            <button
              type='button'
              onClick={handlePrint}
              disabled={isGenerating || !previewUrl}
              className='px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 shadow-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50'
            >
              <span>🖨️</span>
              <span>Print Sheet</span>
            </button>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleDownload}
              disabled={isGenerating || !previewUrl}
              className='px-5 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-50'
            >
              <span>📥</span>
              <span>
                {downloadSuccess
                  ? 'Saved Image! ✓'
                  : `Download Image (.${format === 'jpeg' ? 'JPG' : 'PNG'})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
