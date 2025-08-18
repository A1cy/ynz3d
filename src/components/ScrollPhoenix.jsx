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

  // Performance optimization - throttle expensive calculations
  const frameCountRef = useRef(0);
  const lastSectionRef = useRef('hero');

  useFrame((state, delta) => {
    if (!group.current) return;
    
    frameCountRef.current++;
    const shouldUpdateExpensive = frameCountRef.current % 3 === 0; // Update every 3rd frame
    
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
    
    const positionSpeed = isActive ? 4 : 3;
    group.current.position.x += (targetPositionRef.current.x - group.current.position.x) * deltaFactor * positionSpeed;
    group.current.position.y += (targetPositionRef.current.y - group.current.position.y) * deltaFactor * positionSpeed;
    group.current.position.z += (targetPositionRef.current.z - group.current.position.z) * deltaFactor * 2;
    
    // OPTIMIZED SCALE (only during transitions or every 5th frame)
    if (scrollNav.isTransitioning || frameCountRef.current % 5 === 0) {
      const baseScale = 1;
      const transitionScale = scrollNav.isTransitioning ? 0.9 : 1;
      const targetScale = baseScale * transitionScale;
      
      const currentScale = group.current.scale.x;
      group.current.scale.setScalar(currentScale + (targetScale - currentScale) * deltaFactor * 3);
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
  
  // Enhanced responsive sizing with more breakpoints
  const getCanvasSize = () => {
    if (isMobile) return { width: '90vw', height: '60vh', maxWidth: '400px', maxHeight: '300px' };
    if (isTablet) return { width: '80vw', height: '70vh', maxWidth: '600px', maxHeight: '450px' };
    if (isLaptop) return { width: '70vw', height: '70vh', maxWidth: '800px', maxHeight: '600px' };
    return { width: '60vw', height: '70vh', maxWidth: '900px', maxHeight: '650px' };
  };
  
  const getPhoenixScale = () => {
    if (isMobile) return 0.5;
    if (isTablet) return 0.65;
    if (isLaptop) return 0.85;
    return 1;
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

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-10"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          maxWidth: canvasSize.maxWidth,
          maxHeight: canvasSize.maxHeight
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