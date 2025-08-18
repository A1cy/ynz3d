/**
 * Phoenix Integration Test Component
 * Demonstrates the OptimizedPhoenix component with all features working correctly
 */

import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, Lightformer } from '@react-three/drei';
import { useMediaQuery } from 'react-responsive';

import OptimizedPhoenix, { preloadPhoenixModels } from './OptimizedPhoenix';
import LODManager from './LODManager';
import { usePhoenixPerformanceMonitor } from '../utils/phoenixPerformanceMonitor';
import { useModelMemoryManager } from '../utils/modelMemoryManager';
import { useAnimationOptimizer } from '../utils/animationOptimizer';

/**
 * Performance Debug Panel
 */
function PerformanceDebugPanel({ performanceData, memoryStats, isVisible }) {
  if (!isVisible || !performanceData) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-sm font-mono z-50">
      <div className="mb-2 font-bold text-green-400">Phoenix Performance Monitor</div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-yellow-400">Rendering:</div>
          <div>FPS: {performanceData.phoenix?.currentSnapshot?.avgFPS?.toFixed(1) || 'N/A'}</div>
          <div>Render: {performanceData.phoenix?.currentSnapshot?.avgRenderTime?.toFixed(2) || 'N/A'}ms</div>
          <div className="text-yellow-400 mt-2">Memory:</div>
          <div>Model: {memoryStats?.estimatedMemoryMB?.toFixed(2) || 'N/A'}MB</div>
          <div>Cache: {memoryStats?.cacheUtilization?.toFixed(1) || 'N/A'}%</div>
        </div>
        
        <div>
          <div className="text-yellow-400">Quality:</div>
          <div>Current: {performanceData.device?.recommendedQuality || 'auto'}</div>
          <div>Downgrades: {performanceData.phoenix?.qualityDowngrades || 0}</div>
          <div className="text-yellow-400 mt-2">Session:</div>
          <div>Interactions: {performanceData.phoenix?.totalInteractions || 0}</div>
          <div>Warnings: {performanceData.phoenix?.performanceWarnings || 0}</div>
        </div>
      </div>
      
      {performanceData.recommendations?.length > 0 && (
        <div className="mt-2 p-2 bg-red-900 bg-opacity-50 rounded">
          <div className="text-red-400 font-bold">Recommendations:</div>
          {performanceData.recommendations.slice(0, 2).map((rec, index) => (
            <div key={index} className="text-xs text-red-300">
              {rec.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Phoenix Test Controls
 */
function PhoenixTestControls({ onQualityChange, onToggleAnimation, onToggleInteraction, currentSettings }) {
  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-sm z-50">
      <div className="mb-2 font-bold text-blue-400">Phoenix Test Controls</div>
      
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-400">Quality Override:</label>
          <select 
            onChange={(e) => onQualityChange(e.target.value)}
            className="bg-gray-800 text-white px-2 py-1 rounded text-xs"
            defaultValue="auto"
          >
            <option value="auto">Auto</option>
            <option value="ultra-low">Ultra Low</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onToggleAnimation(!currentSettings.enableAnimation)}
            className={`px-2 py-1 text-xs rounded ${
              currentSettings.enableAnimation ? 'bg-green-700' : 'bg-red-700'
            }`}
          >
            Animation: {currentSettings.enableAnimation ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={() => onToggleInteraction(!currentSettings.enableInteraction)}
            className={`px-2 py-1 text-xs rounded ${
              currentSettings.enableInteraction ? 'bg-green-700' : 'bg-red-700'
            }`}
          >
            Interaction: {currentSettings.enableInteraction ? 'ON' : 'OFF'}
          </button>
        </div>
        
        <div className="text-xs text-gray-400 mt-2">
          Mouse: Move for rotation<br/>
          Scroll: Zoom and effects<br/>
          Dev Mode: Check console for logs
        </div>
      </div>
    </div>
  );
}

/**
 * Main Phoenix Integration Test Component
 */
export default function PhoenixIntegrationTest() {
  const isMobile = useMediaQuery({ maxWidth: 853 });
  const canvasRef = useRef();
  
  // Performance monitoring
  const phoenixMonitor = usePhoenixPerformanceMonitor();
  const memoryManager = useModelMemoryManager();
  const animationOptimizer = useAnimationOptimizer();
  
  // Component state
  const [performanceData, setPerformanceData] = useState(null);
  const [memoryStats, setMemoryStats] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(process.env.NODE_ENV === 'development');
  const [phoenixSettings, setPhoenixSettings] = useState({
    qualityOverride: 'auto',
    enableAnimation: true,
    enableInteraction: true,
    enableScrollEffects: true
  });
  const [loadingStatus, setLoadingStatus] = useState({
    isLoading: true,
    progress: 0,
    currentQuality: 'loading'
  });
  
  // Initialize monitoring and preloading
  useEffect(() => {
    console.log('🧪 Phoenix Integration Test initializing...');
    
    // Start performance monitoring
    phoenixMonitor.startMonitoring();
    
    // Preload models
    preloadPhoenixModels().then(() => {
      console.log('✅ Phoenix models preloaded');
    }).catch(error => {
      console.warn('⚠️ Phoenix preload failed:', error);
    });
    
    // Set up performance monitoring callbacks
    const removePerformanceCallback = phoenixMonitor.onPerformanceUpdate((snapshot, recommendations) => {
      const report = phoenixMonitor.getReport();
      setPerformanceData(report);
    });
    
    const removeWarningCallback = phoenixMonitor.onWarning((warning) => {
      console.warn('🦅 Phoenix Performance Warning:', warning);
    });
    
    // Update memory stats periodically
    const memoryInterval = setInterval(() => {
      const stats = memoryManager.getMemoryStats();
      setMemoryStats(stats);
    }, 3000);
    
    return () => {
      phoenixMonitor.stopMonitoring();
      removePerformanceCallback();
      removeWarningCallback();
      clearInterval(memoryInterval);
    };
  }, []);
  
  // Handle Phoenix loading events
  const handlePhoenixLoadComplete = (phoenixRef, quality) => {
    console.log('✅ Phoenix loaded with quality:', quality);
    setLoadingStatus({
      isLoading: false,
      progress: 100,
      currentQuality: quality
    });
  };
  
  const handlePhoenixPerformanceChange = (newQuality, metrics) => {
    console.log('📊 Phoenix quality changed:', newQuality, metrics);
    setLoadingStatus(prev => ({
      ...prev,
      currentQuality: newQuality
    }));
  };
  
  // Control handlers
  const handleQualityChange = (quality) => {
    setPhoenixSettings(prev => ({
      ...prev,
      qualityOverride: quality
    }));
    console.log('🎛️ Quality override changed to:', quality);
  };
  
  const handleToggleAnimation = (enabled) => {
    setPhoenixSettings(prev => ({
      ...prev,
      enableAnimation: enabled
    }));
    console.log('🎭 Animation toggled:', enabled);
  };
  
  const handleToggleInteraction = (enabled) => {
    setPhoenixSettings(prev => ({
      ...prev,
      enableInteraction: enabled
    }));
    console.log('🖱️ Interaction toggled:', enabled);
  };
  
  // Responsive canvas settings
  const getCanvasSettings = () => {
    if (isMobile) {
      return {
        width: '100vw',
        height: '100vh',
        camera: { position: [0, 0, 7], fov: 50 }
      };
    }
    return {
      width: '100vw',
      height: '100vh',
      camera: { position: [0, 0, 5], fov: 45 }
    };
  };
  
  const canvasSettings = getCanvasSettings();
  
  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-blue-900 to-purple-900 overflow-hidden">
      {/* Loading Overlay */}
      {loadingStatus.isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40">
          <div className="text-center">
            <div className="text-white text-xl mb-4">Loading Phoenix...</div>
            <div className="w-64 h-2 bg-gray-700 rounded">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded transition-all duration-300"
                style={{ width: `${loadingStatus.progress}%` }}
              />
            </div>
            <div className="text-gray-400 text-sm mt-2">
              Quality: {loadingStatus.currentQuality}
            </div>
          </div>
        </div>
      )}
      
      {/* Main 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas
          ref={canvasRef}
          shadows
          camera={canvasSettings.camera}
          style={{ 
            width: canvasSettings.width, 
            height: canvasSettings.height,
            background: 'transparent'
          }}
          dpr={[1, 2]}
          performance={{ min: 0.5 }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          
          <Float speed={phoenixSettings.enableAnimation ? 0.5 : 0} rotationIntensity={0.2} floatIntensity={0.5}>
            <LODManager
              modelType="phoenix"
              forceQuality={phoenixSettings.qualityOverride === 'auto' ? null : phoenixSettings.qualityOverride}
              onLoadingComplete={(data, assessment) => {
                console.log('📦 LOD loading complete:', assessment.recommendedQuality);
              }}
              onQualityChange={(quality) => {
                console.log('🔄 LOD quality changed:', quality);
              }}
            >
              {({ modelData, currentQuality, performanceSettings, isLoading }) => (
                <OptimizedPhoenix
                  scale={isMobile ? 0.7 : 1}
                  enableScrollInteraction={phoenixSettings.enableScrollEffects}
                  enableMouseInteraction={phoenixSettings.enableInteraction}
                  animationComplexity={phoenixSettings.qualityOverride === 'auto' ? 'auto' : phoenixSettings.qualityOverride}
                  performanceMode={phoenixSettings.qualityOverride === 'auto' ? 'auto' : phoenixSettings.qualityOverride}
                  onLoadComplete={handlePhoenixLoadComplete}
                  onPerformanceChange={handlePhoenixPerformanceChange}
                  position={[0, 0, 0]}
                />
              )}
            </LODManager>
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
      
      {/* Test Controls */}
      <PhoenixTestControls
        onQualityChange={handleQualityChange}
        onToggleAnimation={handleToggleAnimation}
        onToggleInteraction={handleToggleInteraction}
        currentSettings={phoenixSettings}
      />
      
      {/* Performance Debug Panel */}
      <PerformanceDebugPanel
        performanceData={performanceData}
        memoryStats={memoryStats}
        isVisible={showDebugPanel}
      />
      
      {/* Toggle Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="fixed bottom-4 left-4 bg-gray-800 text-white px-3 py-2 rounded text-sm z-50"
        >
          {showDebugPanel ? 'Hide' : 'Show'} Debug
        </button>
      )}
      
      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white p-4 rounded-lg text-sm max-w-xs">
        <div className="font-bold text-orange-400 mb-2">🦅 Phoenix Test</div>
        <ul className="text-xs space-y-1">
          <li>• Move mouse to rotate Phoenix</li>
          <li>• Scroll to trigger zoom effects</li>
          <li>• Use controls to test different settings</li>
          <li>• Check debug panel for performance</li>
          <li>• Console shows optimization logs</li>
        </ul>
      </div>
    </div>
  );
}