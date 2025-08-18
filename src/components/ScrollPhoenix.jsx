import React, { useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, Float, Lightformer } from '@react-three/drei';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useHarmonizedInteractions } from '../hooks/useHarmonizedInteractions';
import { useScrollNavigation } from '../hooks/useScrollNavigation';
import { useMediaQuery } from 'react-responsive';

// Enhanced Phoenix component with scroll-based navigation
function ScrollPhoenixModel(props) {
  const group = useRef();
  const { nodes, materials, animations, scene } = useGLTF('/models/phoenix_bird.glb');
  const { actions, mixer } = useAnimations(animations, group);
  
  const interactions = useHarmonizedInteractions();
  const scrollNav = useScrollNavigation();
  
  // Track rotation, position, and scale for smooth transitions
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const targetPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const targetScaleRef = useRef(1);
  const previousScaleRef = useRef(1);

  // Enhanced performance optimization for zoom system
  const frameCountRef = useRef(0);
  const lastSectionRef = useRef('hero');
  const scaleTransitionRef = useRef(false);
  const positionTransitionRef = useRef(false);

  useFrame((state, delta) => {
    if (!group.current) return;
    
    frameCountRef.current++;
    // Performance: Update expensive calculations less frequently, except during zoom transitions
    const isZoomTransitioning = scrollNav.isTransitioning && (scaleTransitionRef.current || positionTransitionRef.current);
    const shouldUpdateExpensive = isZoomTransitioning || frameCountRef.current % 3 === 0; // Update every frame during zoom transitions, every 3rd frame otherwise
    
    const { mouse, scroll, isActive } = interactions.model3D;
    
    // Cache section info to avoid recalculation on every frame
    let sectionInfo, phoenixPosition, currentScale, currentPosition, currentEasing;
    if (shouldUpdateExpensive || scrollNav.currentSection !== lastSectionRef.current) {
      sectionInfo = scrollNav.getSectionInfo();
      phoenixPosition = scrollNav.getPhoenixPosition();
      currentScale = scrollNav.getCurrentScale();
      currentPosition = scrollNav.getCurrentPosition();
      currentEasing = scrollNav.getCurrentEasing();
      lastSectionRef.current = scrollNav.currentSection;
    } else {
      // Use cached values for performance
      sectionInfo = { 
        rotation: scrollNav.getCurrentRotation(), 
        index: scrollNav.sectionConfig[scrollNav.currentSection]?.index || 0 
      };
      phoenixPosition = { x: 0, y: 0, z: 0 }; // Simplified for non-update frames
      currentScale = targetScaleRef.current; // Use cached scale
      currentPosition = 'center'; // Default position
      currentEasing = 'power2.out'; // Default easing
    }
    
    // SECTION-BASED ROTATION (Primary rotation based on current section)
    const sectionRotationY = (sectionInfo.rotation * Math.PI) / 180; // Convert to radians
    
    // ENHANCED MOUSE INTERACTION (Secondary rotation layer) - Optimized
    const baseSensitivity = isActive ? 1.5 : 1.0;
    const mouseInfluence = isActive ? 1.2 : 0.8;
    
    const mouseRotationY = mouse.x * baseSensitivity * mouseInfluence * 0.3;
    const mouseRotationX = mouse.y * baseSensitivity * mouseInfluence * 0.4;
    
    // COMBINED ROTATION (Section rotation + mouse interaction)
    targetRotationRef.current.y = sectionRotationY + mouseRotationY;
    targetRotationRef.current.x = mouseRotationX;
    
    // SCROLL-BASED Z ROTATION (Tilt effect)
    const scrollTilt = scroll * 0.15;
    targetRotationRef.current.z = scrollTilt;
    
    // OPTIMIZED SMOOTH ROTATION APPLICATION
    const rotationSpeed = isActive ? 8 : 5;
    const sectionRotationSpeed = scrollNav.isTransitioning ? 3 : 6;
    const deltaFactor = Math.min(delta, 0.016); // Cap delta for consistent performance
    
    group.current.rotation.y += (targetRotationRef.current.y - group.current.rotation.y) * deltaFactor * sectionRotationSpeed;
    group.current.rotation.x += (targetRotationRef.current.x - group.current.rotation.x) * deltaFactor * rotationSpeed;
    group.current.rotation.z += (targetRotationRef.current.z - group.current.rotation.z) * deltaFactor * 4;
    
    // PROGRESSIVE SCALE SYSTEM (Cinematic zoom levels per section)
    if (shouldUpdateExpensive) {
      targetScaleRef.current = currentScale;
    }

    // DYNAMIC POSITIONING SYSTEM (Left, center, right alignments per section)
    const getPositionOffset = (position) => {
      switch (position) {
        case 'left': return { x: -1.2, y: 0 };
        case 'right': return { x: 1.2, y: 0 };
        case 'center-left': return { x: -0.6, y: 0 };
        case 'center':
        default: return { x: 0, y: 0 };
      }
    };

    // OPTIMIZED POSITION APPLICATION (with dynamic alignment)
    if (shouldUpdateExpensive) {
      const positionOffset = getPositionOffset(currentPosition);
      const scaleAdjustedMouseInfluence = mouseInfluence / Math.max(currentScale, 1); // Adjust mouse sensitivity based on scale
      
      targetPositionRef.current.x = phoenixPosition.x + positionOffset.x + (mouse.x * scaleAdjustedMouseInfluence * 0.3);
      targetPositionRef.current.y = phoenixPosition.y + positionOffset.y + (-mouse.y * scaleAdjustedMouseInfluence * 0.2);
      targetPositionRef.current.z = phoenixPosition.z;
    }
    
    // OPTIMIZED POSITION APPLICATION with transition tracking
    const positionDifference = Math.sqrt(
      Math.pow(targetPositionRef.current.x - group.current.position.x, 2) +
      Math.pow(targetPositionRef.current.y - group.current.position.y, 2) +
      Math.pow(targetPositionRef.current.z - group.current.position.z, 2)
    );
    
    positionTransitionRef.current = positionDifference > 0.05;
    
    const positionSpeed = isActive ? 4 : 3;
    const enhancedPositionSpeed = positionTransitionRef.current ? positionSpeed * 1.2 : positionSpeed;
    
    group.current.position.x += (targetPositionRef.current.x - group.current.position.x) * deltaFactor * enhancedPositionSpeed;
    group.current.position.y += (targetPositionRef.current.y - group.current.position.y) * deltaFactor * enhancedPositionSpeed;
    group.current.position.z += (targetPositionRef.current.z - group.current.position.z) * deltaFactor * 2;
    
    // PROGRESSIVE SCALE APPLICATION (Cinematic zoom system with performance optimization)
    if (shouldUpdateExpensive || scrollNav.isTransitioning) {
      const currentScaleValue = group.current.scale.x;
      const targetScaleValue = targetScaleRef.current;
      const scaleDifference = Math.abs(targetScaleValue - currentScaleValue);
      
      // Determine if we're in a scale transition
      scaleTransitionRef.current = scaleDifference > 0.01;
      
      if (scaleTransitionRef.current) {
        const scaleSpeed = scrollNav.isTransitioning ? 3 : 5; // Optimized speeds for smoothness
        const newScale = currentScaleValue + (targetScaleValue - currentScaleValue) * deltaFactor * scaleSpeed;
        group.current.scale.setScalar(newScale);
        
        // Track scale changes for mouse interaction adjustments
        if (Math.abs(targetScaleValue - previousScaleRef.current) > 0.1) {
          previousScaleRef.current = targetScaleValue;
        }
      }
    }
    
    // OPTIMIZED ANIMATION SPEED (update less frequently)
    if (shouldUpdateExpensive && mixer && actions) {
      const activityMultiplier = isActive ? 1.5 : 1;
      const sectionMultiplier = 1 + (sectionInfo.index * 0.1);
      
      Object.values(actions).forEach(action => {
        if (action) {
          const animationSpeed = activityMultiplier * sectionMultiplier;
          action.setEffectiveTimeScale(animationSpeed);
        }
      });
    }
  });

  // GSAP section transitions for cinematic experience
  useGSAP(() => {
    if (!group.current) return;
    
    const currentScale = scrollNav.getCurrentScale();
    const currentPosition = scrollNav.getCurrentPosition();
    const currentEasing = scrollNav.getCurrentEasing();
    
    // Get position offset for dynamic alignment
    const getPositionOffset = (position) => {
      switch (position) {
        case 'left': return { x: -1.2, y: 0 };
        case 'right': return { x: 1.2, y: 0 };
        case 'center-left': return { x: -0.6, y: 0 };
        case 'center':
        default: return { x: 0, y: 0 };
      }
    };
    
    const positionOffset = getPositionOffset(currentPosition);
    const phoenixPos = scrollNav.getPhoenixPosition();
    
    // Smooth GSAP transitions for scale and position when section changes
    if (scrollNav.isTransitioning) {
      gsap.to(targetScaleRef, {
        current: currentScale,
        duration: 0.8,
        ease: currentEasing,
      });
      
      gsap.to(targetPositionRef.current, {
        x: phoenixPos.x + positionOffset.x,
        y: phoenixPos.y + positionOffset.y,
        z: phoenixPos.z,
        duration: 0.8,
        ease: currentEasing,
      });
    }
  }, [scrollNav.currentSection, scrollNav.isTransitioning]);

  useGSAP(() => {
    if (!group.current) return;
    
    // Initial entrance animation
    gsap.from(group.current.position, {
      y: 3,
      duration: 2.5,
      ease: 'power2.out',
    });

    gsap.from(group.current.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 2,
      ease: 'back.out(1.7)',
    });

    // Play original GLB animations
    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach(action => {
        if (action) {
          action.reset().play();
          action.setLoop(2201, Infinity);
        }
      });
    }
  }, [actions]);

  // Use scene from GLB or fallback
  const sceneObject = scene || nodes.Scene || Object.values(nodes)[0];

  return (
    <group ref={group} {...props} dispose={null}>
      <group scale={0.004} position={[0, -0.5, 0]} rotation={[0, Math.PI, 0]}>
        <primitive object={sceneObject} />
      </group>
    </group>
  );
}

// Loading fallback component
function PhoenixLoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial 
        color="#ff4500" 
        emissive="#220000" 
        emissiveIntensity={0.3} 
      />
    </mesh>
  );
}

// Main ScrollPhoenix component
export function ScrollPhoenix() {
  const isMobile = useMediaQuery({ maxWidth: 640 });
  const isTablet = useMediaQuery({ maxWidth: 1024 });
  const isLaptop = useMediaQuery({ maxWidth: 1400 });
  const scrollNav = useScrollNavigation();
  
  // Dynamic z-index based on current section for text overlay effects
  const getDynamicZIndex = () => {
    const section = scrollNav.currentSection;
    switch (section) {
      case 'hero': return 10; // Above content, normal visibility
      case 'serviceSummary': return 5; // Behind text content (section 2)
      case 'services': return 5; // Behind text content (section 3)  
      case 'contactSummary': return 10; // Above content again
      case 'contact': return 10; // Above content
      default: return 10;
    }
  };
  
  // Maximum canvas size to fully contain Phoenix wings at all zoom levels
  const getCanvasSize = () => {
    // Make canvas much larger to fully contain the Phoenix with wings spread
    if (isMobile) return { width: '120vw', height: '100vh', maxWidth: '800px', maxHeight: '600px' };
    if (isTablet) return { width: '120vw', height: '100vh', maxWidth: '1200px', maxHeight: '800px' };
    if (isLaptop) return { width: '130vw', height: '100vh', maxWidth: '1600px', maxHeight: '1000px' };
    return { width: '140vw', height: '100vh', maxWidth: '2000px', maxHeight: '1200px' };
  };
  
  const getPhoenixScale = () => {
    // Base responsive scale that works with progressive zoom system
    if (isMobile) return 0.4; // Reduced for mobile to accommodate larger zoom levels
    if (isTablet) return 0.55; // Slightly reduced for tablet
    if (isLaptop) return 0.75; // Reduced for laptop
    return 0.9; // Slightly reduced for desktop to allow for larger zoom levels
  };

  // Camera settings based on screen size
  const getCameraSettings = () => {
    if (isMobile) return { position: [0, 0, 6], fov: 50 };
    if (isTablet) return { position: [0, 0, 5.5], fov: 47 };
    return { position: [0, 0, 5], fov: 45 };
  };

  const canvasSize = getCanvasSize();
  const phoenixScale = getPhoenixScale();
  const cameraSettings = getCameraSettings();
  const dynamicZIndex = getDynamicZIndex();

  return (
    <div 
      className="fixed inset-0 pointer-events-none transition-all duration-500 ease-in-out"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: dynamicZIndex,
        overflow: 'hidden', // Clip oversized canvas
        clipPath: 'inset(0)' // Ensure clipping works properly
      }}
    >
      <div
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          maxWidth: canvasSize.maxWidth,
          maxHeight: canvasSize.maxHeight,
          position: 'relative',
          overflow: 'hidden',
          margin: '0 auto' // Center the oversized canvas
        }}
      >
        <Canvas
          shadows
          camera={{ 
            position: cameraSettings.position, 
            fov: cameraSettings.fov, 
            near: 0.1, 
            far: 100 
          }}
          style={{ background: 'transparent' }}
          dpr={[1, 2]} // Responsive pixel ratio for performance
          performance={{ min: 0.5 }} // Performance optimization
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          
          <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Suspense fallback={<PhoenixLoadingFallback />}>
              <ScrollPhoenixModel scale={phoenixScale} position={[0, 0, 0]} />
            </Suspense>
          </Float>
          
          <Environment resolution={256}>
            <group rotation={[-Math.PI / 3, 4, 1]}>
              <Lightformer
                form={'circle'}
                intensity={2}
                position={[0, 5, -9]}
                scale={10}
              />
              <Lightformer
                form={'circle'}
                intensity={2}
                position={[0, 3, 1]}
                scale={10}
              />
              <Lightformer
                form={'circle'}
                intensity={2}
                position={[-5, -1, -1]}
                scale={10}
              />
              <Lightformer
                form={'circle'}
                intensity={2}
                position={[10, 1, 0]}
                scale={16}
              />
            </group>
          </Environment>
        </Canvas>
      </div>
    </div>
  );
}

// Preload the GLB model
useGLTF.preload('/models/phoenix_bird.glb');

export default ScrollPhoenix;