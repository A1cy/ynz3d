/**
 * Level of Detail (LOD) Manager Component
 * Dynamically loads appropriate 3D model quality based on device capabilities
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Suspense } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import assessDeviceCapabilities, { logDeviceAssessment } from '../utils/deviceDetection';

// Loading fallback component
function ModelFallback({ progress = 0, error = null, quality = 'loading' }) {
  return (
    <group>
      {/* Simple loading geometry while model loads */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={error ? '#ff4444' : '#444444'} wireframe />
        {progress > 0 && (
          <mesh position={[0, 1.2, 0]}>
            <planeGeometry args={[2 * (progress / 100), 0.1]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        )}
      </mesh>
      {/* Text showing loading status - visible in dev */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, -1.5, 0]}>
          <planeGeometry args={[3, 0.5]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      )}
    </group>
  );
}

/**
 * Optimized Model Loader with automatic quality selection
 */
function OptimizedModelLoader({ 
  onLoad, 
  onProgress, 
  onError, 
  forceQuality = null,
  performanceSettings,
  modelType = 'ynz'
}) {
  const [deviceAssessment, setDeviceAssessment] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const loadingTimeoutRef = useRef(null);
  
  // Get Three.js context for performance monitoring
  const { gl, camera, scene } = useThree();
  
  // Assess device capabilities on mount
  useEffect(() => {
    const assessment = forceQuality 
      ? { ...assessDeviceCapabilities(), recommendedQuality: forceQuality }
      : assessDeviceCapabilities();
    
    // Add model path based on type and quality
    assessment.modelPath = getModelPath(assessment.recommendedQuality, modelType);
    
    setDeviceAssessment(assessment);
    
    if (process.env.NODE_ENV === 'development') {
      logDeviceAssessment();
    }
    
    // Apply performance settings to renderer
    if (assessment.performanceSettings && gl) {
      const settings = assessment.performanceSettings;
      gl.setPixelRatio(settings.pixelRatio);
      gl.shadowMap.enabled = settings.shadows;
      gl.antialias = settings.antialias;
      
      // Set frustum culling on camera
      if (camera && settings.frustumCulling) {
        camera.frustumCulled = true;
      }
    }
  }, [forceQuality, gl, camera]);
  
  // Dynamic model loading with error handling
  const modelPath = deviceAssessment?.modelPath;
  const loadingStrategy = deviceAssessment?.loadingStrategy;
  
  // Load the model using useGLTF with error handling
  const modelData = useGLTF(
    modelPath || '/models/optimized/ynz-low.glb', // Fallback
    true, // Preload
    (progress) => {
      const percentage = (progress.loaded / progress.total) * 100;
      setLoadingProgress(percentage);
      onProgress?.(percentage);
    }
  );
  
  // Set up loading timeout
  useEffect(() => {
    if (loadingStrategy?.timeout && modelPath) {
      loadingTimeoutRef.current = setTimeout(() => {
        if (loadingProgress < 100) {
          setError('Loading timeout - trying lower quality');
          handleLoadingError('timeout');
        }
      }, loadingStrategy.timeout);
      
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }
  }, [modelPath, loadingStrategy, loadingProgress]);
  
  // Handle loading errors with quality fallback
  const handleLoadingError = useCallback((errorType) => {
    if (retryCount < (loadingStrategy?.retryAttempts || 1)) {
      setRetryCount(prev => prev + 1);
      
      // Try lower quality model
      const qualityLevels = ['high', 'medium', 'low', 'ultra-low'];
      const currentIndex = qualityLevels.indexOf(deviceAssessment?.recommendedQuality || 'low');
      const fallbackQuality = qualityLevels[Math.min(currentIndex + 1, qualityLevels.length - 1)];
      
      setDeviceAssessment(prev => ({
        ...prev,
        recommendedQuality: fallbackQuality,
        modelPath: getModelPath(fallbackQuality, modelType)
      }));
      
      setError(null);
      setLoadingProgress(0);
    } else {
      setError(`Failed to load 3D model: ${errorType}`);
      onError?.(errorType);
    }
  }, [retryCount, loadingStrategy, deviceAssessment, onError]);
  
  // Monitor performance and adjust quality if needed
  useEffect(() => {
    if (!performanceSettings?.maxFPS || !gl) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let lowFPSCount = 0;
    
    const checkPerformance = () => {
      const currentTime = performance.now();
      frameCount++;
      
      if (currentTime - lastTime >= 1000) { // Check every second
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        if (fps < performanceSettings.maxFPS * 0.7) { // 70% of target FPS
          lowFPSCount++;
          if (lowFPSCount >= 3) { // 3 consecutive seconds of low FPS
            // Downgrade quality automatically
            const qualityLevels = ['high', 'medium', 'low', 'ultra-low'];
            const currentIndex = qualityLevels.indexOf(deviceAssessment?.recommendedQuality || 'low');
            if (currentIndex < qualityLevels.length - 1) {
              const lowerQuality = qualityLevels[currentIndex + 1];
              console.warn(`Performance degraded, switching to ${lowerQuality} quality`);
              setDeviceAssessment(prev => ({
                ...prev,
                recommendedQuality: lowerQuality,
                modelPath: getModelPath(lowerQuality, modelType)
              }));
            }
            lowFPSCount = 0;
          }
        } else {
          lowFPSCount = 0;
        }
      }
      
      requestAnimationFrame(checkPerformance);
    };
    
    const animationId = requestAnimationFrame(checkPerformance);
    return () => cancelAnimationFrame(animationId);
  }, [gl, performanceSettings, deviceAssessment]);
  
  // Call onLoad when model is ready
  useEffect(() => {
    if (modelData && loadingProgress >= 100) {
      onLoad?.(modelData, deviceAssessment);
    }
  }, [modelData, loadingProgress, onLoad, deviceAssessment]);
  
  if (error) {
    return <ModelFallback error={error} quality={deviceAssessment?.recommendedQuality} />;
  }
  
  if (!modelData || loadingProgress < 100) {
    return <ModelFallback progress={loadingProgress} quality={deviceAssessment?.recommendedQuality} />;
  }
  
  return modelData;
}

/**
 * Main LOD Manager Component
 */
export default function LODManager({ 
  children, 
  forceQuality = null,
  onQualityChange = null,
  onLoadingComplete = null,
  onError = null,
  modelType = 'ynz'
}) {
  const [modelData, setModelData] = useState(null);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceSettings, setPerformanceSettings] = useState(null);
  
  const handleModelLoad = useCallback((data, assessment) => {
    setModelData(data);
    setCurrentQuality(assessment.recommendedQuality);
    setPerformanceSettings(assessment.performanceSettings);
    setIsLoading(false);
    onLoadingComplete?.(data, assessment);
    onQualityChange?.(assessment.recommendedQuality);
  }, [onLoadingComplete, onQualityChange]);
  
  const handleProgress = useCallback((progress) => {
    // Progress can be used to show loading indicators
  }, []);
  
  const handleError = useCallback((error) => {
    setIsLoading(false);
    onError?.(error);
  }, [onError]);
  
  return (
    <Suspense fallback={<ModelFallback />}>
      <OptimizedModelLoader
        onLoad={handleModelLoad}
        onProgress={handleProgress}
        onError={handleError}
        forceQuality={forceQuality}
        performanceSettings={performanceSettings}
        modelType={modelType}
      />
      
      {/* Pass model data and settings to children */}
      {children && typeof children === 'function' 
        ? children({ modelData, currentQuality, performanceSettings, isLoading })
        : children
      }
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <group position={[0, 3, 0]}>
          <mesh>
            <planeGeometry args={[4, 1]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.7} />
          </mesh>
          {/* Quality indicator - you could add text geometry here */}
        </group>
      )}
    </Suspense>
  );
}

// Helper function for model path mapping
function getModelPath(quality, modelType = 'ynz') {
  const modelPaths = {
    ynz: {
      'ultra-low': '/models/optimized/ynz-ultra-low.glb',
      'low': '/models/optimized/ynz-low.glb',
      'medium': '/models/optimized/ynz-medium.glb',
      'high': '/models/optimized/ynz-high.glb'
    },
    phoenix: {
      'ultra-low': '/models/optimized/phoenix-ultra-low.glb',
      'low': '/models/optimized/phoenix-low.glb',
      'medium': '/models/optimized/phoenix-medium.glb',
      'high': '/models/optimized/phoenix-high.glb'
    }
  };
  
  const paths = modelPaths[modelType] || modelPaths.ynz;
  return paths[quality] || paths['low'];
}

// Hook for accessing LOD system outside of the component
export function useLOD() {
  const [assessment] = useState(() => assessDeviceCapabilities());
  
  return {
    recommendedQuality: assessment.recommendedQuality,
    deviceInfo: assessment.deviceInfo,
    performanceSettings: assessment.performanceSettings,
    modelPath: assessment.modelPath
  };
}