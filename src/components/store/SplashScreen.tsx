"use client";

import React, { useState, useEffect } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Only show once per browser session
    try {
      const alreadyShown = sessionStorage.getItem("u3_intro_splash_seen");
      if (!alreadyShown) {
        setVisible(true);
        sessionStorage.setItem("u3_intro_splash_seen", "true");

        // Start fade out after 1.5 seconds
        const fadeTimer = setTimeout(() => {
          setFading(true);
        }, 1500);

        // Completely unmount after 2 seconds
        const removeTimer = setTimeout(() => {
          setVisible(false);
        }, 2000);

        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(removeTimer);
        };
      }
    } catch {
      // Ignore sessionStorage exceptions (e.g., in incognito or restricted mode)
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#111214] text-white transition-opacity duration-500 cursor-pointer select-none no-print ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="U3 STORE Opening Screen"
    >
      <div className="flex flex-col items-center justify-center px-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-700">
        {/* Glowing Logo Frame with 3D Ring */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-white/10 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#30343A] p-1.5 bg-black/80 shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src="/logo.png"
              alt="U3 STORE"
              className="w-full h-full object-contain rounded-full transform transition-transform duration-1000 scale-100 animate-pulse"
            />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-[0.25em] text-white uppercase">
            U3 STORE
          </h1>
          <p className="text-[10px] sm:text-xs tracking-[0.35em] text-[#BFC2C6] uppercase font-bold">
            LIVE YOURS.
          </p>
        </div>

        {/* Minimal Progress Line */}
        <div className="w-36 sm:w-44 h-[2px] bg-[#292B2E] rounded-full overflow-hidden mt-4">
          <div className="h-full bg-white rounded-full animate-[progress_1.4s_ease-in-out_infinite]" />
        </div>

        {/* Quick tap-to-skip hint */}
        <span className="text-[10px] text-[#73777D] tracking-wider uppercase pt-2">
          Tap anywhere to enter
        </span>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 20%;
          }
          100% {
            width: 100%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}

