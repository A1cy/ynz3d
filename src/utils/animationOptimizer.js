/**
 * Animation Optimization Utility
 * Adjusts GSAP and Three.js animations based on device performance capabilities
 */

import gsap from 'gsap';
import { isMobile } from 'react-device-detect';
import assessDeviceCapabilities from './deviceDetection';

// Animation performance presets
const ANIMATION_PRESETS = {
  'ultra-low': {
    gsapDefaults: {
      duration: 0.8,
      ease: 'power2.out',
      force3D: false,
      lazy: false
    },
    frameRate: 30,
    particleCount: 0,
    enableComplexAnimations: false,
    enableContinuousAnimations: false,
    morphTargets: false,
    shadowAnimations: false,
    textureAnimations: false
  },
  
  'low': {
    gsapDefaults: {
      duration: 1.2,
      ease: 'power2.out',
      force3D: true,
      lazy: true
    },
    frameRate: 30,
    particleCount: 10,
    enableComplexAnimations: false,
    enableContinuousAnimations: true,
    morphTargets: false,
    shadowAnimations: false,
    textureAnimations: false
  },
  
  'medium': {
    gsapDefaults: {
      duration: 1.8,
      ease: 'circ.out',
      force3D: true,
      lazy: true
    },
    frameRate: 45,
    particleCount: 25,
    enableComplexAnimations: true,
    enableContinuousAnimations: true,
    morphTargets: false,
    shadowAnimations: false,
    textureAnimations: true
  },
  
  'high': {
    gsapDefaults: {
      duration: 2.5,
      ease: 'back.out(1.7)',
      force3D: true,
      lazy: true
    },
    frameRate: 60,
    particleCount: 50,
    enableComplexAnimations: true,
    enableContinuousAnimations: true,
    morphTargets: true,
    shadowAnimations: true,
    textureAnimations: true
  }
};

/**
 * Animation Optimizer Class
 */
class AnimationOptimizer {
  constructor() {
    this.deviceAssessment = assessDeviceCapabilities();
    this.currentPreset = ANIMATION_PRESETS[this.deviceAssessment.recommendedQuality] || ANIMATION_PRESETS.low;
    this.performanceMonitor = new PerformanceMonitor();
    this.activeAnimations = new Set();
    this.animationStats = {
      totalAnimations: 0,
      activeAnimations: 0,
      averageFPS: 60,
      droppedFrames: 0
    };
    
    this.setupGSAPDefaults();
    this.startPerformanceMonitoring();
  }
  
  /**
   * Setup GSAP default settings based on device performance
   */
  setupGSAPDefaults() {
    gsap.defaults(this.currentPreset.gsapDefaults);
    
    // Set GSAP ticker to match target frame rate
    gsap.ticker.fps(this.currentPreset.frameRate);
    
    // Enable/disable GSAP features based on performance
    if (this.currentPreset.frameRate <= 30) {
      gsap.ticker.lagSmoothing(500, 33); // More aggressive lag smoothing
    }
  }
  
  /**
   * Create optimized GSAP timeline
   */
  createTimeline(options = {}) {
    const optimizedOptions = {
      ...options,
      // Force paused start for better control
      paused: true,
      // Add performance callbacks
      onUpdate: () => {
        this.performanceMonitor.recordFrame();
        options.onUpdate?.();
      }
    };
    
    const timeline = gsap.timeline(optimizedOptions);
    this.activeAnimations.add(timeline);
    this.animationStats.totalAnimations++;
    
    // Add cleanup on complete
    timeline.eventCallback('onComplete', () => {
      this.activeAnimations.delete(timeline);
      options.onComplete?.();
    });
    
    return timeline;
  }
  
  /**
   * Create optimized GSAP tween
   */
  createTween(target, vars = {}) {
    const optimizedVars = {
      ...vars,
      // Apply preset defaults
      duration: vars.duration ?? this.currentPreset.gsapDefaults.duration,
      ease: vars.ease ?? this.currentPreset.gsapDefaults.ease,
      force3D: vars.force3D ?? this.currentPreset.gsapDefaults.force3D,
      lazy: vars.lazy ?? this.currentPreset.gsapDefaults.lazy,
      
      // Add performance monitoring
      onUpdate: () => {
        this.performanceMonitor.recordFrame();
        vars.onUpdate?.();
      }
    };
    
    const tween = gsap.to(target, optimizedVars);
    this.activeAnimations.add(tween);
    this.animationStats.totalAnimations++;
    
    // Add cleanup
    tween.eventCallback('onComplete', () => {
      this.activeAnimations.delete(tween);
      vars.onComplete?.();
    });
    
    return tween;
  }
  
  /**
   * Optimize Three.js object animations
   */
  optimizeThreeJSAnimation(object, animationType = 'default') {
    if (!object) return;
    
    // Disable matrix auto update for static objects
    if (!this.currentPreset.morphTargets) {
      object.matrixAutoUpdate = false;
    }
    
    // Set frustum culling
    object.frustumCulled = true;
    
    // Optimize material for animation
    if (object.material) {
      // Disable expensive material features on low-end devices
      if (this.deviceAssessment.recommendedQuality === 'ultra-low') {
        object.material.transparent = false;
        if (object.material.map) {
          object.material.map.generateMipmaps = false;
        }
      }
    }
    
    // Set up performance-based animation constraints
    object.userData.animationConstraints = {
      maxRotationSpeed: this.currentPreset.frameRate === 30 ? 0.5 : 1.0,
      maxPositionDelta: this.currentPreset.frameRate === 30 ? 0.1 : 0.2,
      updateFrequency: this.currentPreset.frameRate === 30 ? 2 : 1 // Update every N frames
    };
  }
  
  /**
   * Create performance-aware animation loop
   */
  createAnimationLoop(callback, priority = 'normal') {
    let frameCount = 0;
    let lastTime = performance.now();
    let accumulated = 0;
    
    const targetInterval = 1000 / this.currentPreset.frameRate;
    
    const animate = (currentTime) => {
      // Frame rate limiting
      accumulated += currentTime - lastTime;
      lastTime = currentTime;
      
      if (accumulated >= targetInterval) {
        const delta = Math.min(accumulated / 1000, 1/15); // Cap delta at 15fps equivalent
        frameCount++;
        
        // Performance monitoring
        this.performanceMonitor.recordFrame();
        
        // Check if we should skip frames on ultra-low quality
        const shouldUpdate = this.currentPreset.frameRate >= 45 || frameCount % 2 === 0;
        
        if (shouldUpdate) {
          callback(delta, currentTime);
        }
        
        accumulated = accumulated % targetInterval;
      }
      
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }
  
  /**
   * Pause all active animations (for performance emergency)
   */
  pauseAllAnimations() {
    this.activeAnimations.forEach(animation => {
      if (animation.pause) {
        animation.pause();
      }
    });
  }
  
  /**
   * Resume all paused animations
   */
  resumeAllAnimations() {
    this.activeAnimations.forEach(animation => {
      if (animation.resume) {
        animation.resume();
      }
    });
  }
  
  /**
   * Kill all active animations (emergency stop)
   */
  killAllAnimations() {
    this.activeAnimations.forEach(animation => {
      if (animation.kill) {
        animation.kill();
      }
    });
    this.activeAnimations.clear();
  }
  
  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      const stats = this.performanceMonitor.getStats();
      this.animationStats.averageFPS = stats.fps;
      this.animationStats.droppedFrames = stats.droppedFrames;
      this.animationStats.activeAnimations = this.activeAnimations.size;
      
      // Automatic quality downgrade if performance is poor
      if (stats.fps < this.currentPreset.frameRate * 0.6 && stats.sampleCount > 60) {
        this.handlePoorPerformance();
      }
    }, 2000); // Check every 2 seconds
  }
  
  /**
   * Handle poor performance by downgrading settings
   */
  handlePoorPerformance() {
    const qualityLevels = ['high', 'medium', 'low', 'ultra-low'];
    const currentIndex = qualityLevels.indexOf(this.deviceAssessment.recommendedQuality);
    
    if (currentIndex < qualityLevels.length - 1) {
      const newQuality = qualityLevels[currentIndex + 1];
      console.warn(`Performance degraded, downgrading animations to ${newQuality}`);
      
      this.deviceAssessment.recommendedQuality = newQuality;
      this.currentPreset = ANIMATION_PRESETS[newQuality];
      this.setupGSAPDefaults();
      
      // Pause complex animations
      if (newQuality === 'ultra-low') {
        this.pauseComplexAnimations();
      }
    }
  }
  
  /**
   * Pause complex animations only
   */
  pauseComplexAnimations() {
    this.activeAnimations.forEach(animation => {
      if (animation.userData?.isComplex) {
        animation.pause();
      }
    });
  }
  
  /**
   * Get current animation statistics
   */
  getStats() {
    return {
      ...this.animationStats,
      currentQuality: this.deviceAssessment.recommendedQuality,
      preset: this.currentPreset,
      performanceStats: this.performanceMonitor.getStats()
    };
  }
}

/**
 * Performance Monitor Class
 */
class PerformanceMonitor {
  constructor() {
    this.frames = [];
    this.lastTime = performance.now();
    this.droppedFrames = 0;
    this.sampleSize = 60; // Monitor last 60 frames
  }
  
  recordFrame() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    this.frames.push(deltaTime);
    
    // Detect dropped frames (>33ms = dropped frame at 30fps)
    if (deltaTime > 33) {
      this.droppedFrames++;
    }
    
    // Keep only recent frames
    if (this.frames.length > this.sampleSize) {
      this.frames.shift();
    }
    
    this.lastTime = currentTime;
  }
  
  getStats() {
    if (this.frames.length === 0) return { fps: 60, droppedFrames: 0, sampleCount: 0 };
    
    const averageDelta = this.frames.reduce((sum, delta) => sum + delta, 0) / this.frames.length;
    const fps = Math.round(1000 / averageDelta);
    
    return {
      fps: Math.min(fps, 60),
      droppedFrames: this.droppedFrames,
      sampleCount: this.frames.length,
      averageDelta
    };
  }
  
  reset() {
    this.frames = [];
    this.droppedFrames = 0;
  }
}

// Global animation optimizer instance
let globalAnimationOptimizer = null;

/**
 * Get or create global animation optimizer
 */
export function getAnimationOptimizer() {
  if (!globalAnimationOptimizer) {
    globalAnimationOptimizer = new AnimationOptimizer();
  }
  return globalAnimationOptimizer;
}

/**
 * React hook for using animation optimizer
 */
export function useAnimationOptimizer() {
  const optimizer = getAnimationOptimizer();
  
  return {
    createTimeline: (options) => optimizer.createTimeline(options),
    createTween: (target, vars) => optimizer.createTween(target, vars),
    optimizeThreeJSAnimation: (object, type) => optimizer.optimizeThreeJSAnimation(object, type),
    createAnimationLoop: (callback, priority) => optimizer.createAnimationLoop(callback, priority),
    getStats: () => optimizer.getStats(),
    pauseAll: () => optimizer.pauseAllAnimations(),
    resumeAll: () => optimizer.resumeAllAnimations(),
    killAll: () => optimizer.killAllAnimations()
  };
}

/**
 * Utility functions for common animation patterns
 */
export const AnimationUtils = {
  /**
   * Create entrance animation optimized for device
   */
  createEntranceAnimation(target, options = {}) {
    const optimizer = getAnimationOptimizer();
    const preset = optimizer.currentPreset;
    
    return optimizer.createTimeline({
      ...options,
      onComplete: () => {
        // Optimize object after entrance
        if (target.type) { // Three.js object
          optimizer.optimizeThreeJSAnimation(target, 'entrance');
        }
        options.onComplete?.();
      }
    });
  },
  
  /**
   * Create continuous rotation animation
   */
  createContinuousRotation(target, axis = 'y', speed = 1) {
    const optimizer = getAnimationOptimizer();
    
    if (!optimizer.currentPreset.enableContinuousAnimations) {
      return null; // Skip on low-end devices
    }
    
    const rotation = target.rotation || target;
    const duration = 10 / speed; // Base duration
    
    return optimizer.createTween(rotation, {
      [axis]: `+=${Math.PI * 2}`,
      duration: duration,
      ease: 'none',
      repeat: -1,
      userData: { isComplex: true } // Mark for potential pausing
    });
  },
  
  /**
   * Create hover animation with performance awareness
   */
  createHoverAnimation(target, hoverVars = {}, restVars = {}) {
    const optimizer = getAnimationOptimizer();
    const preset = optimizer.currentPreset;
    
    // Simplify hover animations on low-end devices
    if (preset.frameRate <= 30) {
      hoverVars = {
        scale: hoverVars.scale || 1.05,
        duration: 0.2,
        ease: 'power2.out'
      };
      restVars = {
        scale: 1,
        duration: 0.2,
        ease: 'power2.out'
      };
    }
    
    return {
      hover: () => optimizer.createTween(target, hoverVars),
      rest: () => optimizer.createTween(target, restVars)
    };
  }
};

export default AnimationOptimizer;