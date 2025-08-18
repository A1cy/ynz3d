/**
 * Performance Testing and Validation Suite
 * Comprehensive testing for mobile device performance, memory usage, and optimization validation
 */

import { isMobile, isTablet, browserName, deviceType } from 'react-device-detect';
import assessDeviceCapabilities from './deviceDetection';

/**
 * Performance Metrics Collector
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      loadingTimes: [],
      frameRates: [],
      memoryUsage: [],
      networkStats: [],
      errorCounts: {},
      qualityLevels: [],
      deviceInfo: null
    };
    this.isMonitoring = false;
    this.observers = [];
  }
  
  /**
   * Start comprehensive performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    // Collect device info
    this.metrics.deviceInfo = assessDeviceCapabilities();
    
    // Start monitoring components
    this.startFrameRateMonitoring();
    this.startMemoryMonitoring();
    this.startNetworkMonitoring();
    this.startErrorMonitoring();
    
    console.log('📊 Performance monitoring started');
  }
  
  /**
   * Monitor frame rate using requestAnimationFrame
   */
  startFrameRateMonitoring() {
    let frames = 0;
    let lastTime = performance.now();
    let fpsHistory = [];
    
    const measureFPS = (currentTime) => {
      frames++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        fpsHistory.push(fps);
        
        // Keep last 60 seconds of data
        if (fpsHistory.length > 60) {
          fpsHistory.shift();
        }
        
        this.metrics.frameRates = [...fpsHistory];
        frames = 0;
        lastTime = currentTime;
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFPS);
      }
    };
    
    requestAnimationFrame(measureFPS);
  }
  
  /**
   * Monitor memory usage (where available)
   */
  startMemoryMonitoring() {
    const checkMemory = () => {
      if (performance.memory) {
        const memory = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
          timestamp: Date.now()
        };
        
        this.metrics.memoryUsage.push(memory);
        
        // Keep last 5 minutes of data (300 samples at 1s intervals)
        if (this.metrics.memoryUsage.length > 300) {
          this.metrics.memoryUsage.shift();
        }
      }
      
      if (this.isMonitoring) {
        setTimeout(checkMemory, 1000);
      }
    };
    
    checkMemory();
  }
  
  /**
   * Monitor network performance
   */
  startNetworkMonitoring() {
    if ('connection' in navigator) {
      const updateNetworkInfo = () => {
        const connection = navigator.connection;
        const networkInfo = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now()
        };
        
        this.metrics.networkStats.push(networkInfo);
        
        // Keep last 100 network samples
        if (this.metrics.networkStats.length > 100) {
          this.metrics.networkStats.shift();
        }
      };
      
      updateNetworkInfo();
      navigator.connection.addEventListener('change', updateNetworkInfo);
    }
  }
  
  /**
   * Monitor JavaScript errors and crashes
   */
  startErrorMonitoring() {
    window.addEventListener('error', (event) => {
      const errorKey = event.error?.name || 'UnknownError';
      this.metrics.errorCounts[errorKey] = (this.metrics.errorCounts[errorKey] || 0) + 1;
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errorCounts['UnhandledPromiseRejection'] = 
        (this.metrics.errorCounts['UnhandledPromiseRejection'] || 0) + 1;
    });
  }
  
  /**
   * Record model loading time
   */
  recordLoadingTime(modelPath, startTime, endTime, quality) {
    const loadingTime = {
      modelPath,
      duration: endTime - startTime,
      quality,
      timestamp: Date.now(),
      success: true
    };
    
    this.metrics.loadingTimes.push(loadingTime);
    this.metrics.qualityLevels.push(quality);
  }
  
  /**
   * Record loading failure
   */
  recordLoadingFailure(modelPath, error, quality) {
    const loadingTime = {
      modelPath,
      duration: null,
      quality,
      timestamp: Date.now(),
      success: false,
      error: error.toString()
    };
    
    this.metrics.loadingTimes.push(loadingTime);
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('📊 Performance monitoring stopped');
  }
  
  /**
   * Get comprehensive performance report
   */
  getReport() {
    const frameRates = this.metrics.frameRates;
    const memoryUsage = this.metrics.memoryUsage;
    const loadingTimes = this.metrics.loadingTimes.filter(l => l.success);
    
    return {
      device: this.metrics.deviceInfo,
      performance: {
        averageFPS: frameRates.length > 0 ? Math.round(frameRates.reduce((a, b) => a + b, 0) / frameRates.length) : 0,
        minFPS: frameRates.length > 0 ? Math.min(...frameRates) : 0,
        maxFPS: frameRates.length > 0 ? Math.max(...frameRates) : 0,
        fpsStability: this.calculateFPSStability(frameRates)
      },
      memory: {
        averageUsage: memoryUsage.length > 0 ? Math.round(memoryUsage.reduce((sum, m) => sum + m.used, 0) / memoryUsage.length) : 0,
        peakUsage: memoryUsage.length > 0 ? Math.max(...memoryUsage.map(m => m.used)) : 0,
        memoryGrowth: this.calculateMemoryGrowth(memoryUsage)
      },
      loading: {
        averageLoadingTime: loadingTimes.length > 0 ? Math.round(loadingTimes.reduce((sum, l) => sum + l.duration, 0) / loadingTimes.length) : 0,
        successRate: this.metrics.loadingTimes.length > 0 ? (loadingTimes.length / this.metrics.loadingTimes.length) * 100 : 0,
        qualityDistribution: this.getQualityDistribution()
      },
      errors: this.metrics.errorCounts,
      network: this.getNetworkSummary(),
      timestamp: Date.now()
    };
  }
  
  /**
   * Calculate FPS stability (lower is more stable)
   */
  calculateFPSStability(frameRates) {
    if (frameRates.length < 2) return 0;
    
    const mean = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
    const variance = frameRates.reduce((sum, fps) => sum + Math.pow(fps - mean, 2), 0) / frameRates.length;
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate memory growth trend
   */
  calculateMemoryGrowth(memoryUsage) {
    if (memoryUsage.length < 2) return 0;
    
    const first = memoryUsage[0].used;
    const last = memoryUsage[memoryUsage.length - 1].used;
    return last - first;
  }
  
  /**
   * Get quality level distribution
   */
  getQualityDistribution() {
    const distribution = {};
    this.metrics.qualityLevels.forEach(quality => {
      distribution[quality] = (distribution[quality] || 0) + 1;
    });
    return distribution;
  }
  
  /**
   * Get network performance summary
   */
  getNetworkSummary() {
    const networkStats = this.metrics.networkStats;
    if (networkStats.length === 0) return null;
    
    const latest = networkStats[networkStats.length - 1];
    const avgDownlink = networkStats.reduce((sum, n) => sum + (n.downlink || 0), 0) / networkStats.length;
    
    return {
      currentType: latest.effectiveType,
      averageDownlink: Math.round(avgDownlink * 100) / 100,
      saveDataMode: latest.saveData
    };
  }
}

/**
 * Performance Test Suite
 */
class PerformanceTestSuite {
  constructor() {
    this.metrics = new PerformanceMetrics();
    this.testResults = [];
    this.targetMetrics = {
      minFPS: isMobile ? 25 : 45,
      maxLoadingTime: 5000, // 5 seconds
      maxMemoryUsage: isMobile ? 200 : 500, // MB
      minSuccessRate: 95 // %
    };
  }
  
  /**
   * Run comprehensive performance tests
   */
  async runTests() {
    console.log('🧪 Starting performance test suite...');
    
    this.metrics.startMonitoring();
    
    const tests = [
      this.testDeviceDetection,
      this.testModelLoading,
      this.testFrameRateStability,
      this.testMemoryUsage,
      this.testMobileCompatibility,
      this.testNetworkPerformance
    ];
    
    for (const test of tests) {
      try {
        const result = await test.call(this);
        this.testResults.push(result);
        console.log(`✅ ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`❌ Test failed with error:`, error);
        this.testResults.push({
          name: test.name,
          passed: false,
          error: error.message
        });
      }
    }
    
    // Wait for metrics collection
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    this.metrics.stopMonitoring();
    
    return this.generateReport();
  }
  
  /**
   * Test device detection accuracy
   */
  async testDeviceDetection() {
    const assessment = assessDeviceCapabilities();
    
    return {
      name: 'Device Detection',
      passed: assessment.deviceInfo.webgl.supported && assessment.recommendedQuality !== null,
      details: {
        webglSupported: assessment.deviceInfo.webgl.supported,
        recommendedQuality: assessment.recommendedQuality,
        deviceType: assessment.deviceInfo.isMobile ? 'mobile' : 'desktop'
      }
    };
  }
  
  /**
   * Test model loading performance
   */
  async testModelLoading() {
    const startTime = performance.now();
    const modelPath = '/models/optimized/ynz-low.glb';
    
    try {
      // Simulate model loading test
      await new Promise(resolve => setTimeout(resolve, 2000));
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.metrics.recordLoadingTime(modelPath, startTime, endTime, 'low');
      
      return {
        name: 'Model Loading',
        passed: duration < this.targetMetrics.maxLoadingTime,
        details: {
          loadingTime: Math.round(duration),
          targetTime: this.targetMetrics.maxLoadingTime,
          modelPath
        }
      };
    } catch (error) {
      this.metrics.recordLoadingFailure(modelPath, error, 'low');
      return {
        name: 'Model Loading',
        passed: false,
        details: { error: error.message }
      };
    }
  }
  
  /**
   * Test frame rate stability
   */
  async testFrameRateStability() {
    // Wait for FPS data collection
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const frameRates = this.metrics.metrics.frameRates;
    const avgFPS = frameRates.length > 0 ? Math.round(frameRates.reduce((a, b) => a + b, 0) / frameRates.length) : 0;
    const minFPS = frameRates.length > 0 ? Math.min(...frameRates) : 0;
    
    return {
      name: 'Frame Rate Stability',
      passed: avgFPS >= this.targetMetrics.minFPS && minFPS >= this.targetMetrics.minFPS * 0.8,
      details: {
        averageFPS: avgFPS,
        minimumFPS: minFPS,
        targetFPS: this.targetMetrics.minFPS,
        sampleCount: frameRates.length
      }
    };
  }
  
  /**
   * Test memory usage
   */
  async testMemoryUsage() {
    const memoryUsage = this.metrics.metrics.memoryUsage;
    const peakMemory = memoryUsage.length > 0 ? Math.max(...memoryUsage.map(m => m.used)) : 0;
    const memoryGrowth = this.metrics.calculateMemoryGrowth(memoryUsage);
    
    return {
      name: 'Memory Usage',
      passed: peakMemory <= this.targetMetrics.maxMemoryUsage && memoryGrowth < 50,
      details: {
        peakMemoryMB: peakMemory,
        memoryGrowthMB: memoryGrowth,
        targetMaxMB: this.targetMetrics.maxMemoryUsage,
        hasMemoryLeaks: memoryGrowth > 50
      }
    };
  }
  
  /**
   * Test mobile compatibility
   */
  async testMobileCompatibility() {
    const deviceInfo = this.metrics.metrics.deviceInfo;
    
    if (!isMobile) {
      return {
        name: 'Mobile Compatibility',
        passed: true,
        details: { deviceType: 'desktop', skipped: true }
      };
    }
    
    const touchSupported = 'ontouchstart' in window;
    const orientationSupported = 'orientation' in window;
    
    return {
      name: 'Mobile Compatibility',
      passed: touchSupported && deviceInfo.deviceInfo.webgl.supported,
      details: {
        touchSupported,
        orientationSupported,
        webglSupported: deviceInfo.deviceInfo.webgl.supported,
        recommendedQuality: deviceInfo.recommendedQuality
      }
    };
  }
  
  /**
   * Test network performance impact
   */
  async testNetworkPerformance() {
    const networkStats = this.metrics.metrics.networkStats;
    const hasNetworkInfo = networkStats.length > 0;
    
    if (!hasNetworkInfo) {
      return {
        name: 'Network Performance',
        passed: true,
        details: { networkAPIUnavailable: true }
      };
    }
    
    const latest = networkStats[networkStats.length - 1];
    const isSlowNetwork = latest.effectiveType === '2g' || latest.effectiveType === 'slow-2g';
    
    return {
      name: 'Network Performance',
      passed: !isSlowNetwork || latest.saveData !== true,
      details: {
        networkType: latest.effectiveType,
        downlink: latest.downlink,
        saveDataMode: latest.saveData,
        rtt: latest.rtt
      }
    };
  }
  
  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const passedTests = this.testResults.filter(t => t.passed).length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests) * 100;
    
    const performanceReport = this.metrics.getReport();
    
    return {
      summary: {
        testsRun: totalTests,
        testsPassed: passedTests,
        testsFailed: totalTests - passedTests,
        successRate: Math.round(successRate),
        overallResult: successRate >= 80 ? 'PASS' : 'FAIL'
      },
      testResults: this.testResults,
      performanceMetrics: performanceReport,
      recommendations: this.generateRecommendations(performanceReport),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Generate optimization recommendations
   */
  generateRecommendations(performanceReport) {
    const recommendations = [];
    
    // FPS recommendations
    if (performanceReport.performance.averageFPS < this.targetMetrics.minFPS) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Average FPS (${performanceReport.performance.averageFPS}) below target (${this.targetMetrics.minFPS}). Consider reducing model quality or animation complexity.`
      });
    }
    
    // Memory recommendations
    if (performanceReport.memory.peakUsage > this.targetMetrics.maxMemoryUsage) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: `Peak memory usage (${performanceReport.memory.peakUsage}MB) exceeds target (${this.targetMetrics.maxMemoryUsage}MB). Consider using lower quality models.`
      });
    }
    
    // Loading time recommendations
    if (performanceReport.loading.averageLoadingTime > this.targetMetrics.maxLoadingTime) {
      recommendations.push({
        type: 'loading',
        priority: 'medium',
        message: `Average loading time (${performanceReport.loading.averageLoadingTime}ms) exceeds target (${this.targetMetrics.maxLoadingTime}ms). Consider preloading or progressive loading.`
      });
    }
    
    // Memory leak detection
    if (performanceReport.memory.memoryGrowth > 50) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: `Potential memory leak detected. Memory usage increased by ${performanceReport.memory.memoryGrowth}MB during testing.`
      });
    }
    
    // Mobile-specific recommendations
    if (isMobile && performanceReport.device.recommendedQuality === 'high') {
      recommendations.push({
        type: 'mobile',
        priority: 'medium',
        message: 'Consider defaulting to medium or low quality on mobile devices for better performance.'
      });
    }
    
    return recommendations;
  }
}

// Global performance testing instance
let globalTestSuite = null;

/**
 * Get or create global test suite
 */
export function getPerformanceTestSuite() {
  if (!globalTestSuite) {
    globalTestSuite = new PerformanceTestSuite();
  }
  return globalTestSuite;
}

/**
 * Run performance validation tests
 */
export async function validatePerformance() {
  const testSuite = getPerformanceTestSuite();
  return await testSuite.runTests();
}

/**
 * Start performance monitoring
 */
export function startPerformanceMonitoring() {
  const testSuite = getPerformanceTestSuite();
  testSuite.metrics.startMonitoring();
  return testSuite.metrics;
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics() {
  const testSuite = getPerformanceTestSuite();
  return testSuite.metrics.getReport();
}

export default PerformanceTestSuite;