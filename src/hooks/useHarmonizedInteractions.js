import { useState, useEffect, useRef } from 'react';

export const useHarmonizedInteractions = () => {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [scroll, setScroll] = useState(0);
  const [isMouseActive, setIsMouseActive] = useState(false);
  
  const smoothMouse = useRef({ x: 0.5, y: 0.5 });
  const smoothScroll = useRef(0);
  const lastUpdateTime = useRef(Date.now());

  useEffect(() => {
    const handleMouseMove = (event) => {
      const x = event.clientX / window.innerWidth;
      const y = 1 - (event.clientY / window.innerHeight);
      
      setMouse({ x, y });
      setIsMouseActive(true);
    };

    const handleMouseLeave = () => {
      setIsMouseActive(false);
    };

    const handleScroll = () => {
      const scrollProgress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setScroll(scrollProgress);
    };

    // Smooth interpolation animation loop
    const updateSmooth = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTime.current) / 1000;
      lastUpdateTime.current = now;

      const lerpFactor = Math.min(deltaTime * 3, 1); // Smooth interpolation

      // Smooth mouse position
      smoothMouse.current.x += (mouse.x - smoothMouse.current.x) * lerpFactor;
      smoothMouse.current.y += (mouse.y - smoothMouse.current.y) * lerpFactor;

      // Smooth scroll
      smoothScroll.current += (scroll - smoothScroll.current) * lerpFactor * 0.5;

      requestAnimationFrame(updateSmooth);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    updateSmooth();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mouse.x, mouse.y, scroll]);

  // Provide different interaction intensities for different components
  return {
    // For 3D model (more responsive)
    model3D: {
      mouse: {
        x: (smoothMouse.current.x - 0.5) * 2, // -1 to 1
        y: (smoothMouse.current.y - 0.5) * 2, // -1 to 1
      },
      scroll: smoothScroll.current * 2 * Math.PI, // Full rotation range
      isActive: isMouseActive,
    },
    
    // For Galaxy background (more subtle)
    galaxy: {
      mouse: {
        x: smoothMouse.current.x,
        y: smoothMouse.current.y,
      },
      scroll: smoothScroll.current * 0.5, // Slower rotation
      isActive: isMouseActive,
    },
    
    // Raw values for other uses
    raw: {
      mouse: smoothMouse.current,
      scroll: smoothScroll.current,
      isActive: isMouseActive,
    }
  };
};