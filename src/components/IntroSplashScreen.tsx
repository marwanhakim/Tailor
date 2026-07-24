import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scissors, Sparkles } from 'lucide-react';

interface IntroSplashScreenProps {
  onComplete: () => void;
  durationSeconds?: number;
}

export function IntroSplashScreen({ onComplete, durationSeconds = 3 }: IntroSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, durationSeconds * 1000);

    return () => clearTimeout(timer);
  }, [durationSeconds]);

  const handleAnimationComplete = () => {
    if (!isVisible) {
      onComplete();
    }
  };

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {isVisible && (
        <motion.div
          key="intro-splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setIsVisible(false)}
          className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer"
        >
          {/* Subtle Background Fabric Texture Overlay */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}
          />

          {/* Ambient Glowing Orbs */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.25, 0.45, 0.25]
            }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
            className="absolute -bottom-24 -right-24 w-96 h-96 bg-rose-600/25 rounded-full blur-3xl pointer-events-none"
          />

          {/* Main Content Area */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full px-6 text-center">
            
            {/* Animated Brand Badge & Title */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex flex-col items-center mb-8"
            >
              <div className="relative mb-3">
                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-rose-500 rounded-3xl p-0.5 shadow-2xl shadow-indigo-500/30 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center relative overflow-hidden">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Scissors className="w-10 h-10 text-indigo-400" />
                    </motion.div>
                    <Sparkles className="w-4 h-4 text-amber-300 absolute top-2 right-2 animate-pulse" />
                  </div>
                </div>
              </div>

              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300"
              >
                نظام بكسل
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-xs font-bold text-indigo-300/80 mt-1.5 tracking-wide"
              >
                إدارة مشغل الخياطة والحسابات والطلبات
              </motion.p>
            </motion.div>

            {/* Fabric Cutting Animation Block */}
            <div className="w-full relative py-6 px-4 my-2">
              
              {/* Fabric Strip */}
              <div className="relative w-full h-12 bg-slate-900/90 rounded-2xl border border-indigo-500/30 overflow-hidden flex items-center shadow-inner">
                {/* Left side fabric (Indigo) */}
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.2, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-indigo-900/80 via-indigo-700/60 to-rose-900/80 border-r-2 border-amber-400 relative"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:12px_12px]" />
                </motion.div>

                {/* Dashed Line on Uncut Fabric */}
                <div className="absolute inset-0 border-b border-dashed border-slate-600/60 my-auto h-0 w-full" />

                {/* Animated Moving Scissors along the Fabric Cut */}
                <motion.div
                  initial={{ left: "0%" }}
                  animate={{ left: "92%" }}
                  transition={{ duration: 2.2, ease: "easeInOut" }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex items-center justify-center drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                >
                  <motion.div
                    animate={{ rotate: [0, -25, 0, -25, 0] }}
                    transition={{ repeat: Infinity, duration: 0.4, ease: "easeInOut" }}
                    className="p-1.5 bg-rose-500 text-white rounded-full shadow-lg border border-white/30"
                  >
                    <Scissors size={18} className="transform -scale-x-100" />
                  </motion.div>
                </motion.div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-bold px-1">
                <span className="flex items-center gap-1 text-indigo-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  قص وتجهيز القماش...
                </span>
                <span className="text-slate-500">انقر للتخطي</span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="w-full mt-6">
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: durationSeconds, ease: "linear" }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-400 rounded-full"
                />
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
