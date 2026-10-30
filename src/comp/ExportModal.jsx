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
  const [exportStyle, setExportStyle] = useState('mockup'); // 'mockup' | 'techpack'
  const [format, setFormat] = useState('png'); // 'png' | 'jpeg'
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
        designerName: 'Designer',
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
        setGenerationStep('Capturing Front & Back views...');
        const views = await captureFrontAndBackViews();
        if (!isMounted) return;
        cachedViews.current = views;

        setGenerationStep('Rendering preview...');
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

  const handleStyleChange = async (newStyle) => {
    setExportStyle(newStyle);
    if (!cachedViews.current) return;
    setIsGenerating(true);
    setGenerationStep('Rendering preview...');
    try {
      const url = await buildActiveCanvas(cachedViews.current, newStyle, format);
      setPreviewUrl(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormatChange = async (newFormat) => {
    setFormat(newFormat);
    if (!cachedViews.current) return;
    const url = await buildActiveCanvas(cachedViews.current, exportStyle, newFormat);
    setPreviewUrl(url);
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

  if (!isOpen) return null;

  return (
    <div className='responsive-modal fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150'>
      {/* Soft Backdrop */}
      <div
        className='fixed inset-0 bg-slate-900/50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Modal Window: Clean & Simple */}
      <div
        className='modal-window relative w-full max-w-4xl my-auto rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[92vh] z-10'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='px-6 pt-5 pb-4 flex items-start justify-between border-b border-slate-100'>
          <div>
            <h2 className='text-xl font-bold text-slate-900 tracking-tight'>
              Export This Design
            </h2>
            <p className='text-xs text-slate-500 mt-0.5'>
              Front & Back 2D views for printing and tailoring
            </p>
          </div>

          <button
            type='button'
            onClick={onClose}
            className='p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition'
            aria-label='Close modal'
          >
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 bg-slate-50/50'>
          {/* Options: Style & Format */}
          <div className='flex flex-wrap items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs gap-3'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-semibold text-slate-600'>View:</span>
              <div className='inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200'>
                <button
                  type='button'
                  onClick={() => handleStyleChange('mockup')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    exportStyle === 'mockup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Clean Mockup
                </button>
                <button
                  type='button'
                  onClick={() => handleStyleChange('techpack')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    exportStyle === 'techpack'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full Tech Pack
                </button>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <span className='text-xs font-semibold text-slate-600'>Format:</span>
              <div className='inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200'>
                <button
                  type='button'
                  onClick={() => handleFormatChange('png')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    format === 'png'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  PNG
                </button>
                <button
                  type='button'
                  onClick={() => handleFormatChange('jpeg')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    format === 'jpeg'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  JPG
                </button>
              </div>
            </div>
          </div>

          {/* Preview Canvas Container */}
          <div className='relative w-full bg-white rounded-xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center min-h-[300px] max-h-[440px] p-3'>
            {isGenerating ? (
              <div className='flex flex-col items-center gap-2.5 py-16 text-center text-slate-600'>
                <div className='w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin' />
                <p className='text-xs font-semibold text-slate-700'>{generationStep}</p>
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt='Production Spec Sheet'
                className='max-w-full max-h-[400px] object-contain rounded-lg shadow-sm border border-slate-100'
              />
            ) : (
              <p className='text-xs text-slate-400'>Preview not available</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className='px-6 py-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={handleCopyClipboard}
              disabled={isGenerating || !previewUrl}
              className='px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition active:scale-95 disabled:opacity-40 cursor-pointer'
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Image'}
            </button>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer'
            >
              Close
            </button>

            <button
              type='button'
              onClick={handleDownload}
              disabled={isGenerating || !previewUrl}
              className='px-5 py-2.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer'
            >
              {downloadSuccess ? 'Downloaded!' : `Download (.${format.toUpperCase()})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
