import React, { useEffect, useRef } from 'react';
import Galaxy from './Galaxy';
import { useHarmonizedInteractions } from '../hooks/useHarmonizedInteractions';

const HarmonizedGalaxy = (props) => {
  const interactions = useHarmonizedInteractions();
  const galaxyRef = useRef();

  // Override Galaxy's mouse interaction with harmonized system
  useEffect(() => {
    if (!galaxyRef.current) return;

    const galaxyContainer = galaxyRef.current;
    
    // Find the galaxy canvas
    const canvas = galaxyContainer.querySelector('canvas');
    if (!canvas) return;

    // Override canvas mouse events to use harmonized interactions
    const handleMouseMove = (e) => {
      e.stopPropagation();
      
      // Create synthetic mouse event with harmonized coordinates
      const rect = canvas.getBoundingClientRect();
      const syntheticEvent = {
        clientX: interactions.galaxy.mouse.x * rect.width,
        clientY: (1 - interactions.galaxy.mouse.y) * rect.height,
      };

      // Trigger Galaxy's internal mouse handling if it exists
      const originalHandler = canvas._originalMouseMove;
      if (originalHandler) {
        originalHandler.call(canvas, {
          ...e,
          clientX: syntheticEvent.clientX + rect.left,
          clientY: syntheticEvent.clientY + rect.top,
        });
      }
    };

    // Store original handler and replace
    if (canvas.onmousemove || canvas._originalMouseMove) {
      canvas._originalMouseMove = canvas.onmousemove || canvas._originalMouseMove;
      canvas.onmousemove = handleMouseMove;
    }

    // Handle mouse active state
    const updateMouseState = () => {
      if (interactions.galaxy.isActive) {
        handleMouseMove({ stopPropagation: () => {} });
      }
      requestAnimationFrame(updateMouseState);
    };
    
    updateMouseState();

  }, [interactions.galaxy.mouse.x, interactions.galaxy.mouse.y, interactions.galaxy.isActive]);

  return (
    <div ref={galaxyRef} style={{ width: '100%', height: '100%' }}>
      <Galaxy 
        {...props}
        // Disable Galaxy's built-in mouse interaction since we're overriding it
        mouseInteraction={false}
        // Add subtle auto-rotation that syncs with scroll
        rotationSpeed={0.02 + interactions.galaxy.scroll * 0.01}
      />
    </div>
  );
};

export default HarmonizedGalaxy;