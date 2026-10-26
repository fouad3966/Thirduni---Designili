import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSnapshot } from 'valtio'
import config from '../config/config'
import state, { toggleFlip, selectGarment, openPricing, openOrderPrint } from '../store'
import { getPlanQuota, ALL_PLANS } from '../config/pricingPlans'
import CustomButtom from '../comp/CustomButtom'
import { reader } from '../config/helpers'
import { EditorTabs, FilterTabs, DecalTypes } from '../config/constants'
import { fadeAnimation, slideAnimation } from '../config/motion'
import AIPicker from '../comp/AIPicker'
import ColorPicker from '../comp/ColorPicker'
import FilePiker from '../comp/FilePiker'
import TextPicker from '../comp/TextPicker'
import DesignHistoryDropdown from '../comp/DesignHistoryDropdown'
import Tab from '../comp/Tab'
import GarmentSelector from '../comp/GarmentSelector'
import { getFabricTrimColor } from '../config/fullDesign'
import { addDesignToHistory } from '../config/designHistory'
import ExportModal from '../comp/ExportModal'
import { hasArabic, ARABIC_DEFAULT_FONT } from '../config/textTexture'
import { analyzePaletteMatch, matchImageToPalette } from '../config/palette'
import { understandPrompt, toPublicBrief } from '../config/darja/darja'

const Costumizer = () => {
  const snap = useSnapshot(state);
  const [file, setFile] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [interpretation, setInterpretation] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [colorMatch, setColorMatch] = useState(null);
  const [matching, setMatching] = useState(false);
  const generated = useRef(null); // { image, palette } of the latest AI design, for color matching
  const [activeEditorTab, setActiveEditorTab] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const generationRequest = useRef(null);

  useEffect(() => () => generationRequest.current?.abort(), []);

  const handleSubmit = async () => {
    if (generationRequest.current) return;
    const quota = getPlanQuota(state.currentPlan, state.billingCycle);
    if (quota !== Infinity && (state.generationsUsed || 0) >= quota) {
      openPricing(state.audienceTab || 'individuals');
      return;
    }
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setGenerationError('Describe the full-shirt design you want.');
      return;
    }
    const controller = new AbortController();
    generationRequest.current = controller;
    state.generatingGarment = state.garment;
    const timeoutId = setTimeout(() => controller.abort(), 180000);
    setGeneratingImg(true);
    setGenerationError('');
    try {
      let mimeType = 'image/png';
      let photoBase64 = null;
      let understood = null;

      // 1. Immediately understand Darja / Arabic / English prompt
      try {
        const brief = await understandPrompt(trimmedPrompt);
        understood = toPublicBrief(brief);
        setInterpretation(understood);
        if (understood?.garment && understood.garment !== state.garment) {
          state.generatingGarment = null;
          selectGarment(understood.garment);
        }
      } catch (err) {
        console.warn('Darja understanding error:', err);
      }

      const effectivePrompt = understood?.englishPrompt || trimmedPrompt;
      const targetGarment = understood?.garment || state.garment;

      // 2. Try configured backend first
      try {
        const response = await fetch(config[import.meta.env.DEV ? 'development' : 'production'].backendUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: effectivePrompt, mode: 'full', style: 'auto', garment: targetGarment }),
        });
        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (data?.photo) {
            mimeType = data?.mimeType ?? 'image/png';
            photoBase64 = data.photo;
            if (data?.interpretation && data.interpretation.source !== 'passthrough') {
              understood = data.interpretation;
              setInterpretation(understood);
            }
          }
        }
      } catch (backendErr) {
        console.warn('Backend endpoint unavailable, falling back to direct AI generation:', backendErr);
      }

      // 3. Resilient fallback: Direct AI generation using the translated English prompt
      if (!photoBase64) {
        const enhancedPrompt = `${effectivePrompt}, seamless repeating textile surface print pattern for ${targetGarment}, high fashion luxury aesthetic, edge-to-edge 2D flat artwork, vibrant colors, 4k`;
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
        const pollRes = await fetch(pollUrl, { signal: controller.signal });
        if (!pollRes.ok) {
          throw new Error(`AI image generation failed (${pollRes.status}). Please try again shortly.`);
        }
        const blob = await pollRes.blob();
        mimeType = blob.type || 'image/jpeg';
        photoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            const b64 = typeof result === 'string' ? result.split(',')[1] : null;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (!photoBase64) {
        throw new Error('The generator did not return an image. Please try again.');
      }

      const imageUrl = `data:${mimeType};base64,${photoBase64}`;
      const generatedImage = new Image();
      generatedImage.src = imageUrl;
      try { await generatedImage.decode(); } catch {
        throw new Error('The generated image could not be opened. Please try again.');
      }
      if (controller.signal.aborted) throw new DOMException('Generation timed out', 'AbortError');
      state.patternScale = 1;
      state.patternRotation = 0;
      state.patternOffsetX = 0;
      state.patternOffsetY = 0;
      state.trimColor = getFabricTrimColor(generatedImage);
      state.useTrim = true;
      handleDecals('full', imageUrl);
      addDesignToHistory({
        title: trimmedPrompt,
        fullDecal: imageUrl,
        trimColor: state.trimColor,
        isFullTexture: true,
        isLogoTexture: false,
      });
      state.generationsUsed = (state.generationsUsed || 0) + 1;
      // Did the model use the colors the user asked for? If not, offer a one-click fix.
      generated.current = { image: generatedImage, palette: understood?.palette ?? null, matchedUrl: null };
      setColorMatch(understood?.palette
        ? { ...analyzePaletteMatch(generatedImage, understood.palette), originalUrl: imageUrl, matchedUrl: null }
        : null);
      // Text the user asked to print ("ktiba "DZ" fel sder") goes through the text tool, not the image model.
      if (understood?.textOnGarment && state.garment === 'tshirt') {
        state.textContent = understood.textOnGarment;
        state.isTextTexture = true;
        if (hasArabic(understood.textOnGarment)) {
          state.textFont = ARABIC_DEFAULT_FONT;
          state.textUppercase = false;
          state.textCurved = false;
        }
      }
      setActiveEditorTab('');
    } catch (error) {
      setGenerationError(controller.signal.aborted
        ? 'Generation took longer than 3 minutes. Please try again shortly.'
        : error.message || 'Generation failed. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      generationRequest.current = null;
      state.generatingGarment = null;
      setGeneratingImg(false);
    }
  };

  // Instant Darja understanding check
  const handlePreview = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || previewing) return;
    setPreviewing(true);
    setGenerationError('');
    try {
      // 1. Direct local Darja translation engine
      const brief = await understandPrompt(trimmedPrompt);
      const publicBrief = toPublicBrief(brief);
      setInterpretation(publicBrief);

      // If the prompt specifies another garment ("bghit hoodie..."), switch to it
      if (publicBrief?.garment && publicBrief.garment !== state.garment) {
        selectGarment(publicBrief.garment);
      }
    } catch (error) {
      console.warn('Darja preview error:', error);
      setGenerationError('Could not analyze prompt. Please try again.');
    } finally {
      setPreviewing(false);
    }
  };

  // Apply a design image to the garment, keeping the collar/cuff trim in step with its colors.
  const applyDesignImage = async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    state.trimColor = getFabricTrimColor(image);
    handleDecals('full', url);
  };

  const handleMatchColors = async () => {
    const latest = generated.current;
    if (!latest?.palette || matching) return;
    setMatching(true);
    setGenerationError('');
    try {
      const matchedUrl = latest.matchedUrl ?? matchImageToPalette(latest.image, latest.palette);
      if (!matchedUrl) {
        setGenerationError('This design is too flat to recolor automatically. Try generating it again.');
        return;
      }
      latest.matchedUrl = matchedUrl;
      await applyDesignImage(matchedUrl);
      setColorMatch((current) => current && { ...current, status: 'matched', matchedUrl });
    } catch {
      setGenerationError('Could not recolor the design. Please try again.');
    } finally {
      setMatching(false);
    }
  };

  const handleRestoreColors = async () => {
    if (!colorMatch?.originalUrl) return;
    try {
      await applyDesignImage(colorMatch.originalUrl);
      setColorMatch((current) => current && { ...current, status: 'drift' });
    } catch {
      setGenerationError('Could not restore the original colors.');
    }
  };

  const handleDecals = (type, result) => {
    const decalType = DecalTypes[type];
    state[decalType.stateProperty] = result;
    if (type === 'full') {
      state.isFullTexture = true;
      state.isLogoTexture = false;
    } else {
      state.isLogoTexture = true;
    }
  };

  const handleActiveFilterTab = tabName => {
    if (tabName === 'logoShirt') state.isLogoTexture = !state.isLogoTexture;
    if (tabName === 'stylishShirt') state.isFullTexture = !state.isFullTexture;
    if (tabName === 'textShirt') state.isTextTexture = !state.isTextTexture;
  };

  const handleEditorTabClick = tabName => {
    const next = activeEditorTab === tabName ? '' : tabName;
    setActiveEditorTab(next);
    state.activeEditorTab = next;
  };

  const readFile = type => {
    if (!file) return;
    reader(file).then(result => {
      if (type === 'logo') {
        state.removeLogoBackground = false;
        state.logoScale = 0.15;
        state.logoPosition = [0, 0.04, 0.15];
      } else {
        state.useTrim = false;
      }
      handleDecals(type, result);
      if (type === 'full') {
        setActiveEditorTab('');
        state.activeEditorTab = '';
      }
    }).catch(() => setGenerationError('The selected image could not be read.'));
  };

  const generateTabContent = () => {
    switch (activeEditorTab) {
      case 'colorpicker': return <ColorPicker />;
      case 'filepicker': return <FilePiker file={file} setFile={setFile} readFile={readFile} supportsLogo={snap.garment === 'tshirt'} />;
      case 'aipicker': return (
        <AIPicker
          prompt={prompt}
          setPrompt={(value) => { setPrompt(value); setInterpretation(null); }}
          generatingImg={generatingImg}
          generationError={generationError}
          handleSubmit={handleSubmit}
          interpretation={interpretation}
          previewing={previewing}
          handlePreview={handlePreview}
          colorMatch={colorMatch && snap.fullDecal === (colorMatch.status === 'matched' ? colorMatch.matchedUrl : colorMatch.originalUrl) ? colorMatch : null}
          matching={matching}
          handleMatchColors={handleMatchColors}
          handleRestoreColors={handleRestoreColors}
          garment={snap.garment}
        />
      );
      case 'textpicker': return <TextPicker />;
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {!snap.intro && (
        <>
          <div className='garment-selector-editor'><GarmentSelector /></div>
          <motion.div key='custom' className='absolute top-0 left-0 z-10' {...slideAnimation('left')}>
            <div className='flex items-center min-h-screen'>
              <div className='editortabs-container tabs'>
                {EditorTabs.map(tab => (
                  <Tab
                    key={tab.name}
                    tab={tab}
                    isActiveTab={activeEditorTab === tab.name}
                    handleClick={() => handleEditorTabClick(tab.name)}
                  />
                ))}
                {generateTabContent()}
              </div>
            </div>
          </motion.div>
          <motion.div className='absolute z-10 top-3 right-3 sm:top-5 sm:right-5 flex flex-col items-end gap-2 sm:gap-2.5 max-w-[calc(100vw-24px)]' {...fadeAnimation}>
            {/* Top Row: Plan Quota Pill & Glowing Order This Design CTA */}
            <div className='flex items-center gap-2 flex-wrap justify-end'>
              <button
                type='button'
                onClick={() => openPricing(snap.audienceTab || 'individuals')}
                className='px-3 py-1.5 rounded-xl bg-slate-900/90 border border-violet-500/40 hover:border-violet-400 text-xs text-white flex items-center gap-2 shadow-lg backdrop-blur-md transition group'
                title='Click to view or upgrade subscription plan'
              >
                <span className='px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-violet-600 text-white'>
                  {ALL_PLANS[snap.currentPlan]?.badge || 'PLAN'}
                </span>
                <span className='text-slate-300 text-[11px] font-medium'>
                  {snap.generationsUsed || 0}/{getPlanQuota(snap.currentPlan, snap.billingCycle) === Infinity ? '∞' : getPlanQuota(snap.currentPlan, snap.billingCycle)} Gens
                </span>
                <span className='text-[10px] text-violet-400 font-bold group-hover:translate-x-0.5 transition-transform'>
                  Upgrade ↗
                </span>
              </button>

              <button
                type='button'
                onClick={() => openOrderPrint()}
                className='flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/40 active:scale-95 transition-all'
                title='Order custom garments with this design printed by Algerian partner shops (Cash on Delivery)'
              >
                <span className='text-sm'>🚚</span>
                <span>Order This Design</span>
              </button>
            </div>

            {/* Middle Row: View & Mode Actions */}
            <div className='flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end'>
              <CustomButtom
                type='filled'
                title={snap.isFlipped ? '🔄 Front View' : '🔄 Flip to Back'}
                handleClick={toggleFlip}
                customStyles='w-fit px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold text-xs sm:text-sm whitespace-nowrap rounded-lg'
              />
              <CustomButtom
                type='filled'
                title={snap.currentPlan === 'free' ? '🔒 Wear it (Pro)' : '📷 Wear it'}
                handleClick={() => {
                  if (snap.currentPlan === 'free') {
                    openPricing('individuals');
                  } else {
                    state.wearItOpen = true;
                  }
                }}
                disabled={generatingImg}
                customStyles={`w-fit px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold text-xs sm:text-sm whitespace-nowrap rounded-lg ${
                  snap.currentPlan === 'free' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 hover:bg-amber-600/40' : ''
                }`}
              />
              {snap.currentPlan === 'free' && (
                <button
                  type='button'
                  onClick={() => (state.wearItOpen = true)}
                  disabled={generatingImg}
                  className='w-fit px-2.5 sm:px-3 py-1.5 sm:py-2 font-bold text-xs whitespace-nowrap rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-xs transition active:scale-95 flex items-center gap-1 cursor-pointer'
                  title='Test Wear It AR virtual try-on directly (bypasses plan gate for testing)'
                >
                  <span>🧪</span>
                  <span>Test Wear it</span>
                </button>
              )}
              <CustomButtom
                type='filled'
                title='Go Back'
                handleClick={() => state.intro = true}
                customStyles='w-fit px-2.5 sm:px-4 py-1.5 sm:py-2 font-bold text-xs sm:text-sm whitespace-nowrap rounded-lg'
              />
            </div>

            {/* Bottom Row: Export & History */}
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setIsExportOpen(true)}
                className='flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-lg backdrop-blur-md transition-all active:scale-95 border border-slate-700'
                title='Export production spec sheet (Front & Back)'
              >
                <span>📐</span>
                <span>Export Spec Sheet</span>
              </button>
              <DesignHistoryDropdown />
            </div>
          </motion.div>
          <motion.div className='filtertabs-container' {...slideAnimation('up')}>
            {FilterTabs.filter(tab => snap.garment === 'tshirt' || (tab.name !== 'logoShirt' && tab.name !== 'textShirt')).map(tab => (
              <Tab
                key={tab.name}
                tab={tab}
                isFilterTab
                isActiveTab={
                  tab.name === 'logoShirt'
                    ? snap.isLogoTexture
                    : tab.name === 'stylishShirt'
                    ? snap.isFullTexture
                    : snap.isTextTexture
                }
                handleClick={() => handleActiveFilterTab(tab.name)}
              />
            ))}
          </motion.div>
          <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
        </>
      )}
    </AnimatePresence>
  );
};

export default Costumizer;
