import React, { useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'novus_intro_seen';
const MAX_DURATION_MS = 4800; // duração real do vídeo (~4s) + margem de segurança

export const hasSeenIntro = () => sessionStorage.getItem(SESSION_KEY) === 'true';
export const markIntroSeen = () => sessionStorage.setItem(SESSION_KEY, 'true');

interface IntroSplashProps {
  onFinish: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ onFinish }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fadingOut, setFadingOut] = useState(false);

  const finish = () => {
    setFadingOut(true);
    window.setTimeout(onFinish, 300);
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onFinish();
      return;
    }

    // Rede lenta constants: se o vídeo não terminar/erro nunca disparar, garante que a
    // tela de login nunca fique presa atrás da animação.
    const fallbackTimer = window.setTimeout(finish, MAX_DURATION_MS);
    return () => window.clearTimeout(fallbackTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-sidebar transition-opacity duration-300 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={finish}
      role="button"
      aria-label="Pular animação de abertura"
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src="/intro.mp4"
          className="w-full h-full object-contain"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={finish}
          onError={finish}
        />
        {/* Gradient overlay nas bordas */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at center, transparent 40%, rgba(10, 25, 48, 0.4) 85%, rgba(10, 25, 48, 0.8) 100%)
            `
          }}
        />
      </div>
      <span className="absolute bottom-6 right-6 text-xs text-white/60 tracking-wide">
        Pular
      </span>
    </div>
  );
};
