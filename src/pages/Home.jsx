import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSnapshot } from 'valtio'
import {
    headContainerAnimation,
    headContentAnimation,
    headTextAnimation,
    slideAnimation
} from '../config/motion';
import CustomButtom from '../comp/CustomButtom'
import config from '../config/config'
import GarmentSelector from '../comp/GarmentSelector'
import state, { openPricing } from "../store/index"

// Where the Marketplace button goes: the game's street (see config.js).
const { gameUrl } = config[import.meta.env.DEV ? 'development' : 'production'];

const Home = () => {
    const snap = useSnapshot(state);
    return (
        <AnimatePresence>

            {snap.intro && (
                <motion.section className='home' {...slideAnimation('left')}>
                    <motion.header {...slideAnimation("down")} className="flex items-center justify-between w-full max-w-7xl pointer-events-auto">
                        <img className='w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow' src="/logo designili no BG.png" alt="Designili" />
                        <button
                            type="button"
                            onClick={() => openPricing('individuals')}
                            className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900/80 border border-violet-500/40 hover:border-violet-400 text-xs sm:text-sm text-violet-200 hover:text-white font-bold backdrop-blur-md transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                            <span>💎</span>
                            <span>Pricing & Plans</span>
                        </button>
                    </motion.header>

                    <motion.div className='home-content' {...headContainerAnimation}>
                        <motion.div {...headTextAnimation}>
                            <h1 className='head-text select-none'>
                                <span className="text-white drop-shadow-md">Let's</span>
                                <br className='xl:block hidden' />
                                <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent drop-shadow-md">
                                    Do it.
                                </span>
                            </h1>
                        </motion.div>

                        <motion.div {...headContentAnimation} className="flex flex-col gap-5 sm:gap-6">
                            <p className='max-w-xs sm:max-w-md md:max-w-lg font-normal text-slate-200 text-sm sm:text-base md:text-lg leading-relaxed drop-shadow'>
                                Create your unique and exclusive shirt with our brand-new 3D
                                customization tool. <strong className="font-semibold text-white">Unleash your imagination</strong>
                                {" "}and define your own style.
                            </p>

                            <GarmentSelector />

                            <div className="flex flex-wrap gap-2.5 sm:gap-3.5 w-fit items-center pt-1 max-w-full">
                                <CustomButtom
                                    type="filled"
                                    title="Customize it"
                                    customStyles="w-fit px-4 sm:px-6 font-bold text-xs sm:text-sm md:text-base py-2.5 sm:py-3 whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                                    handleClick={() => state.intro = false} />
                                <CustomButtom
                                    type="filled"
                                    title="Wear it"
                                    customStyles="w-fit px-3.5 sm:px-5 font-bold text-xs sm:text-sm md:text-base py-2.5 sm:py-3 whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                                    handleClick={() => state.wearItOpen = true}
                                    disabled={Boolean(snap.generatingGarment)} />
                                <CustomButtom
                                    type="filled"
                                    title="Marketplace"
                                    customStyles="w-fit px-3.5 sm:px-5 font-bold text-xs sm:text-sm md:text-base py-2.5 sm:py-3 whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                                    handleClick={() => window.open(gameUrl || 'https://atelier-city.vercel.app/street.html', '_blank', 'noopener')} />
                            </div>
                        </motion.div>
                    </motion.div>

                </motion.section>
            )}
        </AnimatePresence>
    )
}

export default Home
