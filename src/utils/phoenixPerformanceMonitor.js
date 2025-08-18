/**
 * Phoenix Performance Monitor
 * Specialized performance monitoring for Phoenix 3D model with animation tracking,
 * memory usage analysis, and real-time optimization recommendations
 */

import { getPerformanceTestSuite } from './performanceTesting';
import { getModelMemoryStats } from './modelMemoryManager';
import assessDeviceCapabilities from './deviceDetection';

/**
 * Phoenix Performance Monitor Class
 */
class PhoenixPerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.metrics = {
      phoenix: {
        renderTime: [],
        animationFrames: [],
        interactionLatency: [],
        memoryUsage: [],
        loadingTimes: [],
        qualityDowngrades: 0,
        errorCounts: {},
        lastQualityChange: null
      },
      baseline: {
        fps: 60,
        renderTime: 16.67, // ms for 60fps
        memoryThreshold: 100 // MB
      },
      device: assessDeviceCapabilities(),
      session: {
        startTime: Date.now(),
        totalInteractions: 0,
        criticalErrors: 0,
        performanceWarnings: 0
      }
    };
    
    this.performanceCallbacks = new Set();
    this.warningCallbacks = new Set();
    this.optimizationHistory = [];
    this.baselineTestSuite = getPerformanceTestSuite();
    
    // Performance thresholds based on device type
    this.thresholds = this.calculateThresholds();
  }
  
  /**
   * Calculate performance thresholds based on device capabilities
   */
  calculateThresholds() {
    const { recommendedQuality, deviceInfo } = this.metrics.device;
    
    const baseThresholds = {
      'ultra-low': {
        minFPS: 20,
        maxRenderTime: 50, // ms
        maxMemoryMB: 50,
        maxInteractionLatency: 200 // ms
      },
      'low': {
        minFPS: 25,
        maxRenderTime: 40,
        maxMemoryMB: 100,
        maxInteractionLatency: 150
      },
      'medium': {
        minFPS: 35,
        maxRenderTime: 28,
        maxMemoryMB: 150,
        maxInteractionLatency: 100
      },
      'high': {
        minFPS: 50,
        maxRenderTime: 20,
        maxMemoryMB: 200,
        maxInteractionLatency: 50
      }
    };
    
    return baseThresholds[recommendedQuality] || baseThresholds.low;
  }
  
  /**
   * Start comprehensive Phoenix performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    console.log('🦅 Phoenix Performance Monitor started');
    
    // Start base performance monitoring
    this.baselineTestSuite.metrics.startMonitoring();
    
    // Start Phoenix-specific monitoring
    this.startRenderTimeMonitoring();
    this.startAnimationMonitoring();
    this.startInteractionMonitoring();
    this.startMemoryMonitoring();
    this.startQualityMonitoring();
    
    // Performance analysis interval
    setInterval(() => {
      this.analyzePerformance();
    }, 5000); // Analyze every 5 seconds
  }
  
  /**
   * Monitor Phoenix rendering performance
   */
  startRenderTimeMonitoring() {
    let frameStart = 0;
    
    const measureRenderTime = () => {
      if (!this.isMonitoring) return;
      
      frameStart = performance.now();
      
      requestAnimationFrame(() => {
        const renderTime = performance.now() - frameStart;
        this.recordRenderTime(renderTime);
        measureRenderTime();
      });
    };
    
    measureRenderTime();
  }
  
  /**
   * Monitor Phoenix animation performance
   */
  startAnimationMonitoring() {
    let lastAnimationTime = performance.now();
    let animationFrameCount = 0;
    
    const monitorAnimations = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - lastAnimationTime;
      
      animationFrameCount++;
      
      // Record animation frame data every second
      if (deltaTime >= 1000) {
        this.recordAnimationData({
          fps: animationFrameCount,
          avgDelta: deltaTime / animationFrameCount,
          timestamp: currentTime
        });
        
        animationFrameCount = 0;
        lastAnimationTime = currentTime;
      }
      
      requestAnimationFrame(monitorAnimations);
    };
    
    monitorAnimations();
  }
  
  /**
   * Monitor user interaction latency
   */
  startInteractionMonitoring() {
    let interactionStart = 0;
    
    const interactionEvents = ['mousedown', 'touchstart', 'scroll'];
    
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        interactionStart = performance.now();
      });
      
      document.addEventListener(eventType.replace('start', 'end').replace('down', 'up'), () => {
        if (interactionStart > 0) {
          const latency = performance.now() - interactionStart;
          this.recordInteractionLatency(latency);
          interactionStart = 0;
        }
      });
    });
  }
  
  /**
   * Monitor memory usage specific to Phoenix
   */
  startMemoryMonitoring() {
    const checkMemory = () => {
      if (!this.isMonitoring) return;
      
      try {
        // Get model memory stats
        const modelMemory = getModelMemoryStats();
        
        // Get browser memory (if available)
        const browserMemory = performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : null;
        
        this.recordMemoryUsage({
          modelMemory,
          browserMemory,
          timestamp: Date.now()
        });
        
      } catch (error) {
        console.warn('Memory monitoring failed:', error);
      }
      
      setTimeout(checkMemory, 2000); // Check every 2 seconds
    };
    
    checkMemory();
  }
  
  /**
   * Monitor quality changes and downgrades
   */
  startQualityMonitoring() {
    // Listen for quality change events (would need to be implemented in OptimizedPhoenix)
    document.addEventListener('phoenixQualityChange', (event) => {
      this.recordQualityChange(event.detail);
    });
    
    // Monitor for automatic downgrades
    setInterval(() => {
      const currentPerformance = this.getCurrentPerformanceSnapshot();
      
      if (this.shouldRecommendQualityDowngrade(currentPerformance)) {
        this.recordQualityDowngrade(currentPerformance);
      }
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Record render time measurement
   */
  recordRenderTime(renderTime) {
    this.metrics.phoenix.renderTime.push({
      time: renderTime,
      timestamp: Date.now()
    });
    
    // Keep last 100 samples
    if (this.metrics.phoenix.renderTime.length > 100) {
      this.metrics.phoenix.renderTime.shift();
    }
    
    // Check for performance issues
    if (renderTime > this.thresholds.maxRenderTime) {
      this.triggerPerformanceWarning('High render time', { renderTime });
    }
  }
  
  /**
   * Record animation frame data
   */
  recordAnimationData(data) {
    this.metrics.phoenix.animationFrames.push(data);
    
    // Keep last 60 samples (1 minute)
    if (this.metrics.phoenix.animationFrames.length > 60) {
      this.metrics.phoenix.animationFrames.shift();
    }
    
    // Check FPS threshold
    if (data.fps < this.thresholds.minFPS) {
      this.triggerPerformanceWarning('Low FPS', data);
    }
  }
  
  /**
   * Record interaction latency
   */
  recordInteractionLatency(latency) {
    this.metrics.phoenix.interactionLatency.push({
      latency,
      timestamp: Date.now()
    });
    
    this.metrics.session.totalInteractions++;
    
    // Keep last 50 interactions
    if (this.metrics.phoenix.interactionLatency.length > 50) {
      this.metrics.phoenix.interactionLatency.shift();
    }
    
    // Check latency threshold
    if (latency > this.thresholds.maxInteractionLatency) {
      this.triggerPerformanceWarning('High interaction latency', { latency });
    }
  }
  
  /**
   * Record memory usage
   */
  recordMemoryUsage(memoryData) {
    this.metrics.phoenix.memoryUsage.push(memoryData);
    
    // Keep last 100 samples
    if (this.metrics.phoenix.memoryUsage.length > 100) {
      this.metrics.phoenix.memoryUsage.shift();
    }
    
    // Check memory threshold
    const totalMemory = (memoryData.modelMemory?.estimatedMemoryMB || 0) + 
                       (memoryData.browserMemory?.used || 0);
    
    if (totalMemory > this.thresholds.maxMemoryMB) {
      this.triggerPerformanceWarning('High memory usage', { totalMemory });
    }
  }
  
  /**
   * Record quality change events
   */
  recordQualityChange(qualityData) {
    this.metrics.phoenix.lastQualityChange = {
      ...qualityData,
      timestamp: Date.now()
    };
    
    if (qualityData.direction === 'downgrade') {
      this.metrics.phoenix.qualityDowngrades++;
    }
    
    console.log(`Phoenix quality changed to: ${qualityData.newQuality}`);
  }
  
  /**
   * Record quality downgrade
   */
  recordQualityDowngrade(performanceData) {
    this.metrics.phoenix.qualityDowngrades++;
    
    const downgradeEvent = {
      reason: 'Performance degradation',
      performanceData,
      timestamp: Date.now()
    };
    
    this.optimizationHistory.push(downgradeEvent);
    
    // Dispatch event for Phoenix component to handle
    document.dispatchEvent(new CustomEvent('phoenixPerformanceDowngrade', {
      detail: downgradeEvent
    }));
  }
  
  /**
   * Get current performance snapshot
   */
  getCurrentPerformanceSnapshot() {
    const recentRenderTimes = this.metrics.phoenix.renderTime.slice(-10);
    const recentAnimationFrames = this.metrics.phoenix.animationFrames.slice(-5);
    const recentMemory = this.metrics.phoenix.memoryUsage.slice(-3);
    
    return {
      avgRenderTime: recentRenderTimes.length > 0 ? 
        recentRenderTimes.reduce((sum, r) => sum + r.time, 0) / recentRenderTimes.length : 0,
      avgFPS: recentAnimationFrames.length > 0 ?
        recentAnimationFrames.reduce((sum, f) => sum + f.fps, 0) / recentAnimationFrames.length : 60,
      currentMemory: recentMemory.length > 0 ? recentMemory[recentMemory.length - 1] : null,
      timestamp: Date.now()
    };
  }
  
  /**
   * Check if quality downgrade should be recommended
   */
  shouldRecommendQualityDowngrade(performanceSnapshot) {
    const { avgRenderTime, avgFPS, currentMemory } = performanceSnapshot;
    
    // Multiple performance indicators below threshold
    let issues = 0;
    
    if (avgRenderTime > this.thresholds.maxRenderTime * 1.2) issues++;
    if (avgFPS < this.thresholds.minFPS * 0.8) issues++;
    
    if (currentMemory) {
      const totalMemory = (currentMemory.modelMemory?.estimatedMemoryMB || 0) + 
                         (currentMemory.browserMemory?.used || 0);
      if (totalMemory > this.thresholds.maxMemoryMB * 1.1) issues++;
    }
    
    return issues >= 2; // Require multiple indicators
  }
  
  /**
   * Analyze overall performance and generate recommendations
   */
  analyzePerformance() {
    const snapshot = this.getCurrentPerformanceSnapshot();
    const recommendations = this.generateOptimizationRecommendations(snapshot);
    
    if (recommendations.length > 0) {
      this.performanceCallbacks.forEach(callback => {
        try {
          callback(snapshot, recommendations);
        } catch (error) {
          console.warn('Performance callback failed:', error);
        }
      });
    }
  }
  
  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(snapshot) {
    const recommendations = [];
    
    // Render time recommendations
    if (snapshot.avgRenderTime > this.thresholds.maxRenderTime) {
      recommendations.push({
        type: 'rendering',
        priority: 'high',
        message: `Average render time (${snapshot.avgRenderTime.toFixed(2)}ms) exceeds threshold (${this.thresholds.maxRenderTime}ms)`,
        actions: ['Reduce model quality', 'Disable complex animations', 'Lower texture resolution']
      });
    }
    
    // FPS recommendations
    if (snapshot.avgFPS < this.thresholds.minFPS) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Average FPS (${snapshot.avgFPS.toFixed(1)}) below threshold (${this.thresholds.minFPS})`,
        actions: ['Enable frame skipping', 'Reduce animation complexity', 'Lower quality settings']
      });
    }
    
    // Memory recommendations
    if (snapshot.currentMemory) {
      const totalMemory = (snapshot.currentMemory.modelMemory?.estimatedMemoryMB || 0) + 
                         (snapshot.currentMemory.browserMemory?.used || 0);
      
      if (totalMemory > this.thresholds.maxMemoryMB) {
        recommendations.push({
          type: 'memory',
          priority: 'medium',
          message: `Total memory usage (${totalMemory.toFixed(2)}MB) exceeds threshold (${this.thresholds.maxMemoryMB}MB)`,
          actions: ['Clear model cache', 'Use lower quality textures', 'Optimize geometry']
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * Trigger performance warning
   */
  triggerPerformanceWarning(type, data) {
    this.metrics.session.performanceWarnings++;
    
    const warning = {
      type,
      data,
      timestamp: Date.now(),
      sessionTime: Date.now() - this.metrics.session.startTime
    };
    
    this.warningCallbacks.forEach(callback => {
      try {
        callback(warning);
      } catch (error) {
        console.warn('Warning callback failed:', error);
      }
    });
    
    console.warn(`Phoenix Performance Warning: ${type}`, data);
  }
  
  /**
   * Register performance callback
   */
  onPerformanceUpdate(callback) {
    this.performanceCallbacks.add(callback);
    
    return () => {
      this.performanceCallbacks.delete(callback);
    };
  }
  
  /**
   * Register warning callback
   */
  onPerformanceWarning(callback) {
    this.warningCallbacks.add(callback);
    
    return () => {
      this.warningCallbacks.delete(callback);
    };
  }
  
  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    const snapshot = this.getCurrentPerformanceSnapshot();
    const baselineReport = this.baselineTestSuite.metrics.getReport();
    
    return {
      phoenix: {
        currentSnapshot: snapshot,
        totalInteractions: this.metrics.session.totalInteractions,
        qualityDowngrades: this.metrics.phoenix.qualityDowngrades,
        performanceWarnings: this.metrics.session.performanceWarnings,
        sessionDuration: Date.now() - this.metrics.session.startTime,
        optimizationHistory: this.optimizationHistory.slice(-10) // Last 10 optimizations
      },
      baseline: baselineReport,
      device: this.metrics.device,
      thresholds: this.thresholds,
      recommendations: this.generateOptimizationRecommendations(snapshot),
      timestamp: Date.now()
    };
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.baselineTestSuite.metrics.stopMonitoring();
    console.log('🦅 Phoenix Performance Monitor stopped');
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.phoenix = {
      renderTime: [],
      animationFrames: [],
      interactionLatency: [],
      memoryUsage: [],
      loadingTimes: [],
      qualityDowngrades: 0,
      errorCounts: {},
      lastQualityChange: null
    };
    
    this.metrics.session = {
      startTime: Date.now(),
      totalInteractions: 0,
      criticalErrors: 0,
      performanceWarnings: 0
    };
    
    this.optimizationHistory = [];
  }
}

// Global phoenix performance monitor
let globalPhoenixMonitor = null;

/**
 * Get or create global Phoenix performance monitor
 */
export function getPhoenixPerformanceMonitor() {
  if (!globalPhoenixMonitor) {
    globalPhoenixMonitor = new PhoenixPerformanceMonitor();
  }
  return globalPhoenixMonitor;
}

/**
 * React hook for Phoenix performance monitoring
 */
export function usePhoenixPerformanceMonitor() {
  const monitor = getPhoenixPerformanceMonitor();
  
  return {
    startMonitoring: () => monitor.startMonitoring(),
    stopMonitoring: () => monitor.stopMonitoring(),
    getReport: () => monitor.getPerformanceReport(),
    onPerformanceUpdate: (callback) => monitor.onPerformanceUpdate(callback),
    onWarning: (callback) => monitor.onPerformanceWarning(callback),
    getCurrentSnapshot: () => monitor.getCurrentPerformanceSnapshot()
  };
}

/**
 * Auto-start monitoring for Phoenix
 */
export function startPhoenixPerformanceMonitoring() {
  const monitor = getPhoenixPerformanceMonitor();
  monitor.startMonitoring();
  return monitor;
}

export default PhoenixPerformanceMonitor;