/**
 * Progressive Loading Component for 3D Models
 * Provides visual feedback, loading states, and graceful fallbacks
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

// Loading spinner component
function LoadingSpinner({ size = 1, color = "#ffffff" }) {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 2;
    }
  });
  
  return (
    <group>
      <mesh ref={meshRef}>
        <torusGeometry args={[size, size * 0.1, 8, 16]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  );
}

// Progress bar component
function ProgressBar({ progress = 0, width = 4, height = 0.2, color = "#00ff00" }) {
  const progressWidth = (progress / 100) * width;
  
  return (
    <group>
      {/* Background bar */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.5} />
      </mesh>
      
      {/* Progress fill */}
      {progress > 0 && (
        <mesh position={[-(width - progressWidth) / 2, 0, 0.01]}>
          <boxGeometry args={[progressWidth, height, 0.02]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
      
      {/* Progress text */}
      <Html
        position={[0, height + 0.5, 0]}
        center
        style={{
          color: '#ffffff',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        {Math.round(progress)}%
      </Html>
    </group>
  );
}

// Animated loading dots
function LoadingDots({ count = 3, spacing = 0.3, color = "#ffffff" }) {
  const dotsRef = useRef([]);
  const timeRef = useRef(0);
  
  useFrame((state, delta) => {
    timeRef.current += delta;
    
    dotsRef.current.forEach((dot, index) => {
      if (dot) {
        const phase = (timeRef.current * 2 + index * 0.5) % (Math.PI * 2);
        dot.position.y = Math.sin(phase) * 0.2;
        dot.material.opacity = 0.5 + Math.sin(phase) * 0.5;
      }
    });
  });
  
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          ref={(el) => (dotsRef.current[index] = el)}
          position={[index * spacing - ((count - 1) * spacing) / 2, 0, 0]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={color} transparent />
        </mesh>
      ))}
    </group>
  );
}

// Quality indicator component
function QualityIndicator({ quality, position = [0, 0, 0] }) {
  const qualityColors = {
    'ultra-low': '#ff4444',
    'low': '#ffaa44', 
    'medium': '#ffff44',
    'high': '#44ff44',
    'original': '#4444ff'
  };
  
  const color = qualityColors[quality] || '#ffffff';
  
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.3, 0.1, 0.02]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      <Html
        position={[0, 0.2, 0]}
        center
        style={{
          color: color,
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}
      >
        {quality}
      </Html>
    </group>
  );
}

// Device info display (development only)
function DeviceInfo({ deviceInfo, position = [0, 0, 0] }) {
  if (process.env.NODE_ENV !== 'development') return null;
  
  const info = [
    `Device: ${deviceInfo?.isMobile ? 'Mobile' : 'Desktop'}`,
    `GPU: ${deviceInfo?.webgl?.tier || 'Unknown'}`,
    `Memory: ${deviceInfo?.estimatedMemory || 'Unknown'}MB`,
    `Network: ${deviceInfo?.network?.quality || 'Unknown'}`
  ];
  
  return (
    <Html
      position={position}
      style={{
        color: '#cccccc',
        fontSize: '10px',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.8)',
        padding: '8px',
        borderRadius: '4px',
        pointerEvents: 'none',
        userSelect: 'none',
        lineHeight: '1.4'
      }}
    >
      <div>
        {info.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    </Html>
  );
}

// Error display component
function ErrorDisplay({ error, onRetry, position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Error indicator */}
      <mesh>
        <boxGeometry args={[1, 1, 0.1]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
      
      {/* Error icon (X) */}
      <group>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[1.2, 0.1, 0.05]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[1.2, 0.1, 0.05]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      
      <Html
        position={[0, -1, 0]}
        center
        style={{
          color: '#ff4444',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.8)',
          padding: '10px',
          borderRadius: '5px',
          maxWidth: '200px'
        }}
      >
        <div>
          <div style={{ marginBottom: '8px' }}>Loading Error</div>
          <div style={{ fontSize: '12px', marginBottom: '10px', opacity: 0.8 }}>
            {error}
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Retry
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}

// Main progressive loading component
export default function LoadingProgress({
  progress = 0,
  isLoading = false,
  error = null,
  quality = null,
  deviceInfo = null,
  loadingMessage = "Loading 3D Model...",
  showProgress = true,
  showQuality = true,
  showDeviceInfo = false,
  onRetry = null,
  position = [0, 0, 0],
  scale = 1
}) {
  const [loadingPhase, setLoadingPhase] = useState('initializing');
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Track loading phases
  useEffect(() => {
    if (error) {
      setLoadingPhase('error');
    } else if (progress >= 100) {
      setLoadingPhase('complete');
    } else if (progress > 50) {
      setLoadingPhase('finalizing');
    } else if (progress > 0) {
      setLoadingPhase('loading');
    } else {
      setLoadingPhase('initializing');
    }
  }, [progress, error]);
  
  // Track time elapsed
  useEffect(() => {
    if (!isLoading) return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - startTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const getLoadingMessage = () => {
    switch (loadingPhase) {
      case 'initializing':
        return 'Analyzing device capabilities...';
      case 'loading':
        return `Loading ${quality || 'optimized'} quality model...`;
      case 'finalizing':
        return 'Preparing model for display...';
      case 'complete':
        return 'Model loaded successfully!';
      case 'error':
        return 'Failed to load model';
      default:
        return loadingMessage;
    }
  };
  
  const getProgressColor = () => {
    if (error) return '#ff4444';
    if (progress >= 100) return '#44ff44';
    if (progress > 50) return '#ffff44';
    return '#44aaff';
  };
  
  if (!isLoading && !error && progress >= 100) {
    // Loading complete - show brief success state
    return showQuality && quality ? (
      <group position={position} scale={scale}>
        <QualityIndicator quality={quality} position={[0, 2, 0]} />
        {showDeviceInfo && deviceInfo && (
          <DeviceInfo deviceInfo={deviceInfo} position={[3, 0, 0]} />
        )}
      </group>
    ) : null;
  }
  
  return (
    <group position={position} scale={scale}>
      {/* Error state */}
      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={onRetry}
          position={[0, 0, 0]}
        />
      )}
      
      {/* Loading state */}
      {!error && isLoading && (
        <group>
          {/* Loading spinner */}
          <LoadingSpinner 
            size={0.8} 
            color={getProgressColor()} 
          />
          
          {/* Progress bar */}
          {showProgress && progress > 0 && (
            <ProgressBar 
              progress={progress}
              color={getProgressColor()}
              position={[0, -1.5, 0]}
            />
          )}
          
          {/* Loading dots animation */}
          <group position={[0, -2.5, 0]}>
            <LoadingDots color={getProgressColor()} />
          </group>
          
          {/* Loading message */}
          <Html
            position={[0, -3.5, 0]}
            center
            style={{
              color: '#ffffff',
              fontSize: '16px',
              fontFamily: 'Arial, sans-serif',
              textAlign: 'center',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            {getLoadingMessage()}
          </Html>
          
          {/* Time elapsed (development) */}
          {process.env.NODE_ENV === 'development' && timeElapsed > 0 && (
            <Html
              position={[0, -4.5, 0]}
              center
              style={{
                color: '#999999',
                fontSize: '12px',
                fontFamily: 'monospace',
                textAlign: 'center',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            >
              {Math.round(timeElapsed / 1000)}s elapsed
            </Html>
          )}
        </group>
      )}
      
      {/* Quality indicator */}
      {showQuality && quality && !error && (
        <QualityIndicator 
          quality={quality} 
          position={[0, 1.5, 0]} 
        />
      )}
      
      {/* Device info (development) */}
      {showDeviceInfo && deviceInfo && (
        <DeviceInfo 
          deviceInfo={deviceInfo} 
          position={[4, 0, 0]} 
        />
      )}
    </group>
  );
}

// Hook for managing loading state
export function useLoadingProgress() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const startLoading = () => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
  };
  
  const updateProgress = (value) => {
    setProgress(Math.min(100, Math.max(0, value)));
  };
  
  const completeLoading = () => {
    setProgress(100);
    setTimeout(() => setIsLoading(false), 500); // Brief delay to show completion
  };
  
  const setLoadingError = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  };
  
  const reset = () => {
    setProgress(0);
    setIsLoading(false);
    setError(null);
  };
  
  return {
    progress,
    isLoading,
    error,
    startLoading,
    updateProgress,
    completeLoading,
    setLoadingError,
    reset
  };
}