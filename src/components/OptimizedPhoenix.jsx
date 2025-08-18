/**
 * Optimized Phoenix Component
 * Unified, highly optimized 3D Phoenix model with LOD, performance monitoring, and animation optimization
 */

import React, { useRef, useEffect, useCallback, useState, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { useHarmonizedInteractions } from '../hooks/useHarmonizedInteractions';
import { useScrollNavigation } from '../hooks/useScrollNavigation';
import { useAnimationOptimizer } from '../utils/animationOptimizer';
import { useLOD } from './LODManager';
import { startPerformanceMonitoring } from '../utils/performanceTesting';
import assessDeviceCapabilities from '../utils/deviceDetection';

// Phoenix model path mapping based on quality
const PHOENIX_MODEL_PATHS = {
  'ultra-low': '/models/optimized/phoenix-ultra-low.glb',
  'low': '/models/optimized/phoenix-low.glb',
  'medium': '/models/optimized/phoenix-medium.glb',
  'high': '/models/optimized/phoenix-high.glb'
};

/**
 * Loading fallback optimized for Phoenix
 */
function PhoenixLoadingFallback({ progress = 0, quality = 'loading' }) {
  const fallbackRef = useRef();
  
  useFrame(() => {
    if (fallbackRef.current) {
      fallbackRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group>
      <mesh ref={fallbackRef}>
        <coneGeometry args={[0.5, 2, 8]} />
        <meshStandardMaterial 
          color="#ff4500" 
          emissive="#ff2200" 
          emissiveIntensity={0.2}
          wireframe={quality === 'ultra-low'}
        />
      </mesh>
      {progress > 0 && (
        <mesh position={[0, -1.5, 0]}>
          <planeGeometry args={[3 * (progress / 100), 0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
    </group>
  );
}

/**
 * Core Optimized Phoenix Model
 */
function OptimizedPhoenixModel({ 
  scale = 1, 
  enableScrollInteraction = true, 
  enableMouseInteraction = true,
  animationComplexity = 'auto',
  performanceMode = 'auto',
  onLoadComplete,
  onPerformanceChange,
  ...props 
}) {
  const group = useRef();
  
  // Performance and optimization hooks
  const lodSettings = useLOD();
  const animationOptimizer = useAnimationOptimizer();
  const interactions = useHarmonizedInteractions();
  const scrollNav = useScrollNavigation();
  
  // State management
  const [deviceAssessment] = useState(() => assessDeviceCapabilities());
  const [currentQuality, setCurrentQuality] = useState(lodSettings.recommendedQuality);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  
  // Performance monitoring
  const [performanceMonitor, setPerformanceMonitor] = useState(null);
  
  // Determine model path based on quality
  const modelPath = useMemo(() => {
    const quality = performanceMode === 'auto' ? currentQuality : performanceMode;
    return PHOENIX_MODEL_PATHS[quality] || PHOENIX_MODEL_PATHS.low;
  }, [currentQuality, performanceMode]);
  
  // Load model with error handling
  const { nodes, materials, animations, scene } = useGLTF(modelPath, true);
  const { actions, mixer } = useAnimations(animations, group);
  
  // Performance-based animation settings
  const animationSettings = useMemo(() => {
    const complexity = animationComplexity === 'auto' ? currentQuality : animationComplexity;
    
    const settings = {
      'ultra-low': {
        enableRotation: false,
        enablePosition: false,
        enableScale: false,
        frameSkip: 3,
        animationSpeed: 0.5
      },
      'low': {
        enableRotation: true,
        enablePosition: false,
        enableScale: false,
        frameSkip: 2,
        animationSpeed: 0.8
      },
      'medium': {
        enableRotation: true,
        enablePosition: true,
        enableScale: false,
        frameSkip: 1,
        animationSpeed: 1.0
      },
      'high': {
        enableRotation: true,
        enablePosition: true,
        enableScale: true,
        frameSkip: 0,
        animationSpeed: 1.2
      }
    };
    
    return settings[complexity] || settings.low;
  }, [animationComplexity, currentQuality]);
  
  // Cached values for performance optimization
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const targetPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const targetScaleRef = useRef(scale);
  const frameCountRef = useRef(0);
  const lastUpdateRef = useRef(0);
  
  // Initialize performance monitoring
  useEffect(() => {
    const monitor = startPerformanceMonitoring();
    setPerformanceMonitor(monitor);
    
    return () => {
      if (monitor && monitor.stopMonitoring) {
        monitor.stopMonitoring();
      }
    };
  }, []);
  
  // Performance monitoring and quality adjustment
  useEffect(() => {
    if (!performanceMonitor) return;
    
    const checkPerformance = setInterval(() => {
      const metrics = performanceMonitor.getReport();
      setPerformanceMetrics(metrics);
      
      // Auto-adjust quality based on performance
      if (performanceMode === 'auto' && metrics.performance.averageFPS < 30) {
        const qualityLevels = ['high', 'medium', 'low', 'ultra-low'];
        const currentIndex = qualityLevels.indexOf(currentQuality);
        
        if (currentIndex < qualityLevels.length - 1) {
          const newQuality = qualityLevels[currentIndex + 1];
          console.warn(`Phoenix performance degraded, switching to ${newQuality} quality`);
          setCurrentQuality(newQuality);
          onPerformanceChange?.(newQuality, metrics);
        }
      }
    }, 3000);
    
    return () => clearInterval(checkPerformance);
  }, [performanceMonitor, currentQuality, performanceMode, onPerformanceChange]);
  
  // Optimized frame update
  useFrame((state, delta) => {
    if (!group.current || loadError) return;
    
    frameCountRef.current++;
    const currentTime = performance.now();
    
    // Performance-based frame skipping
    const shouldUpdate = frameCountRef.current % (animationSettings.frameSkip + 1) === 0;
    if (!shouldUpdate && animationSettings.frameSkip > 0) return;
    
    // Throttle expensive calculations
    const shouldUpdateExpensive = currentTime - lastUpdateRef.current > 16; // ~60fps
    
    const { mouse, scroll, isActive } = interactions.model3D;
    
    // Mouse interaction (if enabled)
    if (enableMouseInteraction && animationSettings.enableRotation) {
      const sensitivity = isActive ? 2.5 : 1.8;
      const mouseInfluence = isActive ? 1.5 : 1.2;
      
      targetRotationRef.current.y = mouse.x * sensitivity * mouseInfluence * 0.5;
      targetRotationRef.current.x = mouse.y * sensitivity * mouseInfluence * 0.4;
      
      // Apply rotation with performance-optimized lerping
      const rotationSpeed = isActive ? 8 : 5;
      const deltaFactor = Math.min(delta, 0.016);
      
      group.current.rotation.y += (targetRotationRef.current.y - group.current.rotation.y) * deltaFactor * rotationSpeed;
      group.current.rotation.x += (targetRotationRef.current.x - group.current.rotation.x) * deltaFactor * rotationSpeed;
    }
    
    // Scroll interaction (if enabled)
    if (enableScrollInteraction && shouldUpdateExpensive) {
      // Scroll-based Z movement
      if (animationSettings.enablePosition) {
        const scrollInfluence = scroll * 0.01;
        const targetZ = scrollInfluence * 2;
        targetPositionRef.current.z = targetZ;
        
        group.current.position.z += (targetPositionRef.current.z - group.current.position.z) * delta * 3;
      }
      
      // Scroll-based tilt
      if (animationSettings.enableRotation) {
        const scrollTilt = scroll * 0.002;
        targetRotationRef.current.z = scrollTilt;
        group.current.rotation.z += (targetRotationRef.current.z - group.current.rotation.z) * delta * 4;
      }
      
      // Scroll-based scale
      if (animationSettings.enableScale) {
        const scrollScale = 1 + (scroll * 0.0001);
        targetScaleRef.current = Math.max(0.8, Math.min(1.2, scrollScale));
        
        const currentScale = group.current.scale.x;
        const newScale = currentScale + (targetScaleRef.current - currentScale) * delta * 2;
        group.current.scale.setScalar(newScale);
      }
      
      lastUpdateRef.current = currentTime;
    }
    
    // Scroll navigation integration (for ScrollPhoenix compatibility)
    if (scrollNav && scrollNav.isTransitioning && shouldUpdateExpensive) {
      const phoenixPosition = scrollNav.getPhoenixPosition();
      const currentScale = scrollNav.getCurrentScale();
      
      if (phoenixPosition && animationSettings.enablePosition) {
        targetPositionRef.current.x = phoenixPosition.x;
        targetPositionRef.current.y = phoenixPosition.y;
        
        group.current.position.x += (targetPositionRef.current.x - group.current.position.x) * delta * 4;
        group.current.position.y += (targetPositionRef.current.y - group.current.position.y) * delta * 4;
      }
      
      if (currentScale && animationSettings.enableScale) {
        targetScaleRef.current = currentScale;
        group.current.scale.setScalar(group.current.scale.x + (targetScaleRef.current - group.current.scale.x) * delta * 3);
      }
    }
    
    // Animation speed control
    if (shouldUpdateExpensive && mixer && actions && animationSettings.animationSpeed !== 1) {
      Object.values(actions).forEach(action => {
        if (action) {
          action.setEffectiveTimeScale(animationSettings.animationSpeed);
        }
      });
    }
  });
  
  // Optimized entrance animation
  useGSAP(() => {
    if (!group.current || loadError) return;
    
    const timeline = animationOptimizer.createTimeline({
      onComplete: () => {
        animationOptimizer.optimizeThreeJSAnimation(group.current, 'entrance');
        setIsLoading(false);
        onLoadComplete?.(group.current, currentQuality);
      }
    });
    
    // Scale entrance animation based on quality
    const duration = currentQuality === 'ultra-low' ? 1.5 : currentQuality === 'low' ? 2 : 2.5;
    const ease = currentQuality === 'ultra-low' ? 'power2.out' : 'back.out(1.7)';
    
    timeline
      .from(group.current.position, {
        y: currentQuality === 'ultra-low' ? 2 : 3,
        duration: duration,
        ease: 'power2.out',
      })
      .from(group.current.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: duration * 0.8,
        ease: ease,
      }, '-=70%');
    
    timeline.play();
    
    // Initialize original animations
    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach(action => {
        if (action) {
          action.reset().play();
          action.setLoop(2201, Infinity);
          action.setEffectiveTimeScale(animationSettings.animationSpeed);
        }
      });
    }
  }, [actions, currentQuality, animationOptimizer, loadError]);
  
  // Error handling
  const handleError = useCallback((error) => {
    console.error('Phoenix model loading error:', error);
    setLoadError(error);
    setIsLoading(false);
  }, []);
  
  // Memory cleanup
  useEffect(() => {
    return () => {
      if (mixer) {
        mixer.stopAllAction();
      }
      if (group.current) {
        animationOptimizer.optimizeThreeJSAnimation(group.current, 'cleanup');
      }
    };
  }, [mixer, animationOptimizer]);
  
  // Use the scene from GLB or fallback
  const sceneObject = scene || nodes.Scene || Object.values(nodes)[0];
  
  if (loadError) {
    return <PhoenixLoadingFallback error={loadError} quality={currentQuality} />;
  }
  
  return (
    <group ref={group} {...props} dispose={null}>
      <group 
        scale={0.004} 
        position={[0, -0.5, 0]} 
        rotation={[0, Math.PI, 0]}
      >
        <primitive object={sceneObject} />
      </group>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && performanceMetrics && (
        <group position={[2, 2, 0]}>
          <mesh>
            <planeGeometry args={[2, 0.5]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.8} />
          </mesh>
          {/* Quality: {currentQuality} | FPS: {performanceMetrics.performance.averageFPS} */}
        </group>
      )}
    </group>
  );
}

/**
 * Main Optimized Phoenix Component with Suspense
 */
export function OptimizedPhoenix(props) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const lodSettings = useLOD();
  
  const handleProgress = useCallback((progress) => {
    setLoadingProgress(progress);
  }, []);
  
  return (
    <Suspense fallback={<PhoenixLoadingFallback progress={loadingProgress} quality={lodSettings.recommendedQuality} />}>
      <OptimizedPhoenixModel {...props} />
    </Suspense>
  );
}

// Preload models based on device capabilities
const deviceCapabilities = assessDeviceCapabilities();
const recommendedModel = PHOENIX_MODEL_PATHS[deviceCapabilities.recommendedQuality];
if (recommendedModel) {
  useGLTF.preload(recommendedModel);
}

// Export optimized version as default
export default OptimizedPhoenix;

/**
 * Utility function to get appropriate Phoenix model path
 */
export function getPhoenixModelPath(quality = 'auto') {
  if (quality === 'auto') {
    const assessment = assessDeviceCapabilities();
    return PHOENIX_MODEL_PATHS[assessment.recommendedQuality] || PHOENIX_MODEL_PATHS.low;
  }
  return PHOENIX_MODEL_PATHS[quality] || PHOENIX_MODEL_PATHS.low;
}

/**
 * Phoenix model preloader utility
 */
export function preloadPhoenixModels(qualities = ['low', 'medium']) {
  qualities.forEach(quality => {
    const path = PHOENIX_MODEL_PATHS[quality];
    if (path) {
      useGLTF.preload(path);
    }
  });
}