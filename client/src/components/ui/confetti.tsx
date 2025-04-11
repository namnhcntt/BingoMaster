import { useEffect, useRef } from 'react';

interface ConfettiProps {
  duration?: number;
  particleCount?: number;
  onComplete?: () => void;
}

export function Confetti({ 
  duration = 5000, 
  particleCount = 150, 
  onComplete 
}: ConfettiProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const colors = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#D946EF'];
    const confettiElements: HTMLDivElement[] = [];
    
    // Create confetti particles
    for (let i = 0; i < particleCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'absolute';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.top = '-10px';
      confetti.style.width = `${Math.random() * 8 + 5}px`;
      confetti.style.height = `${Math.random() * 8 + 5}px`;
      confetti.style.position = 'absolute';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      // Random animation
      const animationDuration = Math.random() * 3 + 2;
      const animationDelay = Math.random() * 2;
      
      confetti.style.animation = `fall ${animationDuration}s ease-in ${animationDelay}s forwards`;
      
      // Add CSS for animation
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @keyframes fall {
          0% { top: -10px; transform: translateX(0) rotate(0deg); opacity: 1; }
          100% { top: 100%; transform: translateX(${(Math.random() - 0.5) * 400}px) rotate(${Math.random() * 720}deg); opacity: 0; }
        }
      `;
      document.head.appendChild(styleElement);
      
      container.appendChild(confetti);
      confettiElements.push(confetti);
    }
    
    // Cleanup and call onComplete after duration
    const timeout = setTimeout(() => {
      confettiElements.forEach(element => element.remove());
      if (onComplete) onComplete();
    }, duration);
    
    return () => {
      clearTimeout(timeout);
      confettiElements.forEach(element => element.remove());
    };
  }, [duration, particleCount, onComplete]);
  
  return (
    <div ref={containerRef} className="absolute top-0 left-0 w-full h-full overflow-hidden z-0" />
  );
}

export default Confetti;
