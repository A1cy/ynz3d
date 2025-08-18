import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

export const useScrollNavigation = () => {
  const [currentSection, setCurrentSection] = useState('hero');
  const [sectionProgress, setSectionProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const observerRef = useRef(null);
  const sectionsRef = useRef({});
  const previousSectionRef = useRef('hero');
  
  // Section configuration with rotation angles
  const sectionConfig = {
    hero: { rotation: 0, index: 0 },
    serviceSummary: { rotation: 90, index: 1 },
    services: { rotation: 180, index: 2 },
    contactSummary: { rotation: 270, index: 3 },
    contact: { rotation: 360, index: 4 }
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

  // Calculate Phoenix position based on section and scroll
  const getPhoenixPosition = () => {
    const sectionInfo = getSectionInfo();
    const baseY = 0; // Center vertically
    const baseX = 0; // Center horizontally
    
    // Subtle position adjustments per section
    const positionOffsets = {
      hero: { x: 0, y: 0, z: 0 },
      serviceSummary: { x: 0.2, y: 0.1, z: 0.2 },
      services: { x: 0, y: 0.2, z: 0.4 },
      contactSummary: { x: -0.2, y: 0.1, z: 0.2 },
      contact: { x: 0, y: -0.1, z: 0 }
    };
    
    const offset = positionOffsets[currentSection] || { x: 0, y: 0, z: 0 };
    
    return {
      x: baseX + offset.x,
      y: baseY + offset.y,
      z: offset.z
    };
  };

  return {
    currentSection,
    sectionProgress,
    isTransitioning,
    sectionConfig,
    getSectionInfo,
    getPhoenixPosition,
    getCurrentRotation,
    scrollToSection,
    totalSections: Object.keys(sectionConfig).length
  };
};