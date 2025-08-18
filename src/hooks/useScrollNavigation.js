import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

export const useScrollNavigation = () => {
  const [currentSection, setCurrentSection] = useState('hero');
  const [sectionProgress, setSectionProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const observerRef = useRef(null);
  const sectionsRef = useRef({});
  const previousSectionRef = useRef('hero');
  
  // Enhanced section configuration with cinematic zoom and positioning
  const sectionConfig = {
    hero: { 
      rotation: 0, 
      index: 0,
      scale: 1.5,          // Zoomed IN significantly (larger scale, closer view)
      position: 'center',   // Center alignment 
      offset: { x: 0, y: 0, z: 0 },
      easing: 'power2.out'
    },
    serviceSummary: { 
      rotation: 90, 
      index: 1,
      scale: 2.0,          // Aligned LEFT + zoomed MORE in (even closer view)
      position: 'left',     // Left alignment
      offset: { x: -0.8, y: 0.1, z: 0.2 },
      easing: 'power2.inOut'
    },
    services: { 
      rotation: 180, 
      index: 2,
      scale: 1.8,          // Different positioning and zoom level
      position: 'right',    // Right alignment
      offset: { x: 0.6, y: 0.2, z: 0.4 },
      easing: 'power2.inOut'
    },
    contactSummary: { 
      rotation: 270, 
      index: 3,
      scale: 1.6,          // Progressive positioning changes
      position: 'center-left', // Center-left alignment
      offset: { x: -0.3, y: 0.1, z: 0.2 },
      easing: 'power2.inOut'
    },
    contact: { 
      rotation: 360, 
      index: 4,
      scale: 1.4,          // Final positioning state
      position: 'center',   // Center alignment
      offset: { x: 0, y: -0.1, z: 0 },
      easing: 'power2.in'
    }
  };

  useEffect(() => {
    // Performance optimized intersection observer
    const observerOptions = {
      root: null,
      rootMargin: '-15% 0px -15% 0px', // Optimized trigger area
      threshold: [0, 0.3, 0.6, 1] // Reduced thresholds for better performance
    };

    // Throttle observer callbacks for performance
    let observerTimeout = null;
    
    observerRef.current = new IntersectionObserver((entries) => {
      // Clear previous timeout to prevent excessive updates
      if (observerTimeout) clearTimeout(observerTimeout);
      
      observerTimeout = setTimeout(() => {
        let mostVisibleEntry = null;
        let maxRatio = 0;
        
        // Find the most visible section instead of processing all entries
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });
        
        if (mostVisibleEntry && maxRatio > 0.3) {
          const sectionId = mostVisibleEntry.target.id;
          const sectionKey = sectionId === 'home' ? 'hero' : 
                            sectionId === 'service-summary' ? 'serviceSummary' :
                            sectionId === 'contact-summary' ? 'contactSummary' :
                            sectionId;

          if (sectionKey !== currentSection) {
            setIsTransitioning(true);
            setCurrentSection(sectionKey);
            previousSectionRef.current = sectionKey;
            
            // Optimized transition timing
            gsap.delayedCall(0.6, () => {
              setIsTransitioning(false);
            });
          }
          
          setSectionProgress(maxRatio);
        }
      }, 50); // 50ms throttle for smooth performance
    }, observerOptions);

    // Observe all sections
    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => {
      observerRef.current.observe(section);
      sectionsRef.current[section.id] = section;
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [currentSection]);

  // Smooth scroll to section function
  const scrollToSection = (sectionKey) => {
    const sectionMap = {
      hero: 'home',
      serviceSummary: 'service-summary', 
      services: 'services',
      contactSummary: 'contact-summary',
      contact: 'contact'
    };
    
    const targetElement = document.getElementById(sectionMap[sectionKey]);
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Get rotation angle for current section with smooth interpolation
  const getCurrentRotation = () => {
    const currentConfig = sectionConfig[currentSection];
    const currentRotation = currentConfig ? currentConfig.rotation : 0;
    
    // Smooth interpolation between sections during transitions
    if (isTransitioning) {
      const previousSection = previousSectionRef.current;
      const previousConfig = sectionConfig[previousSection];
      const previousRotation = previousConfig ? previousConfig.rotation : 0;
      
      // Use section progress for smooth interpolation
      const rotationDiff = currentRotation - previousRotation;
      return previousRotation + (rotationDiff * sectionProgress);
    }
    
    return currentRotation;
  };

  // Get section info for positioning and effects
  const getSectionInfo = () => {
    const config = sectionConfig[currentSection];
    return {
      name: currentSection,
      rotation: getCurrentRotation(),
      index: config ? config.index : 0,
      progress: sectionProgress,
      isTransitioning,
      totalSections: Object.keys(sectionConfig).length
    };
  };

  // Calculate Phoenix position based on section configuration and scroll
  const getPhoenixPosition = () => {
    const config = sectionConfig[currentSection];
    const baseY = 0; // Center vertically
    const baseX = 0; // Center horizontally
    
    if (!config) {
      return { x: baseX, y: baseY, z: 0 };
    }
    
    // Use section-specific offset from enhanced configuration
    const offset = config.offset || { x: 0, y: 0, z: 0 };
    
    return {
      x: baseX + offset.x,
      y: baseY + offset.y,
      z: offset.z
    };
  };

  // Get current section's scale for progressive zoom
  const getCurrentScale = () => {
    const config = sectionConfig[currentSection];
    if (!config) return 1;
    
    // Smooth interpolation during transitions
    if (isTransitioning) {
      const previousSection = previousSectionRef.current;
      const previousConfig = sectionConfig[previousSection];
      const currentScale = config.scale;
      const previousScale = previousConfig ? previousConfig.scale : 1;
      
      // Use section progress for smooth scale interpolation
      const scaleDiff = currentScale - previousScale;
      return previousScale + (scaleDiff * sectionProgress);
    }
    
    return config.scale;
  };

  // Get current section's position alignment
  const getCurrentPosition = () => {
    const config = sectionConfig[currentSection];
    return config ? config.position : 'center';
  };

  // Get current section's easing for transitions
  const getCurrentEasing = () => {
    const config = sectionConfig[currentSection];
    return config ? config.easing : 'power2.out';
  };

  return {
    currentSection,
    sectionProgress,
    isTransitioning,
    sectionConfig,
    getSectionInfo,
    getPhoenixPosition,
    getCurrentRotation,
    getCurrentScale,
    getCurrentPosition,
    getCurrentEasing,
    scrollToSection,
    totalSections: Object.keys(sectionConfig).length
  };
};