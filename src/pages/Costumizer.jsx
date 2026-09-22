import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSnapshot } from 'valtio'
import config from '../config/config'
import state from '../store'
import CustomButtom from '../comp/CustomButtom'
import { reader } from '../config/helpers'
import { EditorTabs, FilterTabs, DecalTypes } from '../config/constants'
import { fadeAnimation, slideAnimation } from '../config/motion'
import AIPicker from '../comp/AIPicker'
import ColorPicker from '../comp/ColorPicker'
import FilePiker from '../comp/FilePiker'
import Tab from '../comp/Tab'
import GarmentSelector from '../comp/GarmentSelector'
import { getFabricDirection, getFabricTrimColor } from '../config/fullDesign'

const Costumizer = () => {
  const snap = useSnapshot(state);
  const [file, setFile] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState('');
  const generationRequest = useRef(null);

  useEffect(() => () => generationRequest.current?.abort(), []);

  const handleSubmit = async () => {
    if (generationRequest.current) return;
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
      const response = await fetch(config[import.meta.env.DEV ? 'development' : 'production'].backendUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmedPrompt, mode: 'full', style: getFabricDirection(trimmedPrompt), garment: state.garment }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : `Generation failed (${response.status}). Please try again.`);
      }
      const mimeType = data?.mimeType ?? 'image/png';
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)
        || typeof data?.photo !== 'string' || !data.photo.length
        || data.photo.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.photo)) {
        throw new Error('The server returned an invalid image. Please try again.');
      }
      const imageUrl = `data:${mimeType};base64,${data.photo}`;
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
      setActiveEditorTab('');
    } catch (error) {
      setGenerationError(controller.signal.aborted
        ? 'Generation took longer than 3 minutes. The free Space may be busy. Please try again shortly.'
        : error instanceof TypeError
          ? 'Could not reach the generation server. Check your connection and make sure the backend is running.'
          : error.message || 'Generation failed. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      generationRequest.current = null;
      state.generatingGarment = null;
      setGeneratingImg(false);
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
      setActiveEditorTab('');
    }).catch(() => setGenerationError('The selected image could not be read.'));
  };

  const generateTabContent = () => {
    switch (activeEditorTab) {
      case 'colorpicker': return <ColorPicker />;
      case 'filepicker': return <FilePiker file={file} setFile={setFile} readFile={readFile} supportsLogo={snap.garment === 'tshirt'} />;
      case 'aipicker': return <AIPicker prompt={prompt} setPrompt={setPrompt} generatingImg={generatingImg} generationError={generationError} handleSubmit={handleSubmit} />;
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
                {EditorTabs.map(tab => <Tab key={tab.name} tab={tab} handleClick={() => setActiveEditorTab(tab.name)} />)}
                {generateTabContent()}
              </div>
            </div>
          </motion.div>
          <motion.div className='absolute z-10 top-5 right-5' {...fadeAnimation}>
            <CustomButtom type='filled' title='Go Back' handleClick={() => state.intro = true} customStyles='w-fit px-4 py-2.5 font-bold text-sm' />
          </motion.div>
          <motion.div className='filtertabs-container' {...slideAnimation('up')}>
            {FilterTabs.filter(tab => snap.garment === 'tshirt' || tab.name !== 'logoShirt').map(tab => <Tab key={tab.name} tab={tab} isFilterTab
              isActiveTab={tab.name === 'logoShirt' ? snap.isLogoTexture : snap.isFullTexture}
              handleClick={() => handleActiveFilterTab(tab.name)} />)}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Costumizer;
