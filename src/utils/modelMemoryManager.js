/**
 * Model Memory Manager
 * Advanced memory management for 3D models with progressive loading, caching, and cleanup
 */

import { useGLTF } from '@react-three/drei';
import assessDeviceCapabilities from './deviceDetection';

/**
 * Model Memory Manager Class
 */
class ModelMemoryManager {
  constructor() {
    this.loadedModels = new Map();
    this.preloadQueue = new Set();
    this.loadingPromises = new Map();
    this.memoryUsage = {
      totalGeometries: 0,
      totalMaterials: 0,
      totalTextures: 0,
      estimatedMemoryMB: 0
    };
    this.cleanupCallbacks = new Set();
    this.deviceCapabilities = assessDeviceCapabilities();
    this.maxCacheSize = this.getMaxCacheSize();
    this.compressionSettings = this.getCompressionSettings();
    
    this.startMemoryMonitoring();
  }
  
  /**
   * Determine maximum cache size based on device capabilities
   */
  getMaxCacheSize() {
    const { deviceInfo } = this.deviceCapabilities;
    
    // Estimate available memory for 3D models
    if (deviceInfo.isMobile) {
      return 50; // 50MB on mobile
    } else if (deviceInfo.webgl.maxTextureSize < 4096) {
      return 100; // 100MB on low-end desktop
    } else {
      return 200; // 200MB on high-end desktop
    }
  }
  
  /**
   * Get compression settings based on device
   */
  getCompressionSettings() {
    const quality = this.deviceCapabilities.recommendedQuality;
    
    return {
      'ultra-low': {
        textureCompressionRatio: 0.25,
        geometryOptimization: true,
        materialSimplification: true,
        enableDraco: false
      },
      'low': {
        textureCompressionRatio: 0.5,
        geometryOptimization: true,
        materialSimplification: true,
        enableDraco: true
      },
      'medium': {
        textureCompressionRatio: 0.75,
        geometryOptimization: false,
        materialSimplification: false,
        enableDraco: true
      },
      'high': {
        textureCompressionRatio: 1.0,
        geometryOptimization: false,
        materialSimplification: false,
        enableDraco: true
      }
    }[quality] || this.getCompressionSettings()['low'];
  }
  
  /**
   * Progressive model loading with memory management
   */
  async loadModelProgressive(modelPath, priority = 'normal', onProgress = null) {
    // Check if already loaded
    if (this.loadedModels.has(modelPath)) {
      const cachedModel = this.loadedModels.get(modelPath);
      cachedModel.lastAccessed = Date.now();
      return cachedModel.data;
    }
    
    // Check if already loading
    if (this.loadingPromises.has(modelPath)) {
      return this.loadingPromises.get(modelPath);
    }
    
    // Start loading
    const loadingPromise = this.loadModelInternal(modelPath, priority, onProgress);
    this.loadingPromises.set(modelPath, loadingPromise);
    
    try {
      const modelData = await loadingPromise;
      this.loadingPromises.delete(modelPath);
      return modelData;
    } catch (error) {
      this.loadingPromises.delete(modelPath);
      throw error;
    }
  }
  
  /**
   * Internal model loading with optimization
   */
  async loadModelInternal(modelPath, priority, onProgress) {
    try {
      // Check memory before loading
      await this.ensureMemoryAvailable();
      
      const startTime = performance.now();
      
      // Load model with useGLTF
      const modelData = await new Promise((resolve, reject) => {
        try {
          const gltf = useGLTF.preload(modelPath);
          gltf.then(resolve).catch(reject);
        } catch (error) {
          reject(error);
        }
      });
      
      const loadTime = performance.now() - startTime;
      
      // Optimize model based on device capabilities
      const optimizedModel = this.optimizeLoadedModel(modelData, modelPath);
      
      // Calculate memory usage
      const memoryUsage = this.calculateModelMemoryUsage(optimizedModel);
      
      // Cache the model
      const cacheEntry = {
        data: optimizedModel,
        path: modelPath,
        memoryUsage: memoryUsage,
        loadTime: loadTime,
        lastAccessed: Date.now(),
        priority: priority,
        compressionApplied: this.compressionSettings
      };
      
      this.loadedModels.set(modelPath, cacheEntry);
      this.updateMemoryUsage();
      
      // Progress callback
      onProgress?.(100);
      
      console.log(`Model loaded: ${modelPath} (${loadTime.toFixed(2)}ms, ${memoryUsage.toFixed(2)}MB)`);
      
      return optimizedModel;
      
    } catch (error) {
      console.error(`Failed to load model: ${modelPath}`, error);
      throw error;
    }
  }
  
  /**
   * Optimize loaded model based on device capabilities
   */
  optimizeLoadedModel(modelData, modelPath) {
    const optimized = { ...modelData };
    const settings = this.compressionSettings;
    
    try {
      // Optimize geometries
      if (settings.geometryOptimization && optimized.nodes) {
        Object.values(optimized.nodes).forEach(node => {
          if (node.geometry) {
            this.optimizeGeometry(node.geometry);
          }
        });
      }
      
      // Optimize materials
      if (settings.materialSimplification && optimized.materials) {
        Object.values(optimized.materials).forEach(material => {
          this.optimizeMaterial(material, settings);
        });
      }
      
      // Optimize textures
      if (optimized.materials) {
        Object.values(optimized.materials).forEach(material => {
          this.optimizeTextures(material, settings.textureCompressionRatio);
        });
      }
      
    } catch (error) {
      console.warn(`Model optimization failed for ${modelPath}:`, error);
    }
    
    return optimized;
  }
  
  /**
   * Optimize geometry for performance
   */
  optimizeGeometry(geometry) {
    if (!geometry) return;
    
    try {
      // Merge vertices if possible
      if (geometry.mergeVertices && typeof geometry.mergeVertices === 'function') {
        geometry.mergeVertices();
      }
      
      // Compute bounding box/sphere for frustum culling
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      if (!geometry.boundingSphere) {
        geometry.computeBoundingSphere();
      }
      
      // Generate vertex normals if missing
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }
      
    } catch (error) {
      console.warn('Geometry optimization failed:', error);
    }
  }
  
  /**
   * Optimize material properties
   */
  optimizeMaterial(material, settings) {
    if (!material) return;
    
    try {
      // Disable expensive features on low-end devices
      if (settings.materialSimplification) {
        // Reduce transparency if not critical
        if (material.transparent && material.opacity > 0.95) {
          material.transparent = false;
          material.opacity = 1.0;
        }
        
        // Disable vertex colors on ultra-low
        if (this.deviceCapabilities.recommendedQuality === 'ultra-low') {
          material.vertexColors = false;
        }
        
        // Simplify shading model
        if (material.type === 'MeshStandardMaterial' && this.deviceCapabilities.recommendedQuality === 'ultra-low') {
          // Keep reference to original for potential restoration
          material.userData.originalType = 'MeshStandardMaterial';
        }
      }
      
      // Force material updates
      material.needsUpdate = true;
      
    } catch (error) {
      console.warn('Material optimization failed:', error);
    }
  }
  
  /**
   * Optimize textures based on compression ratio
   */
  optimizeTextures(material, compressionRatio) {
    if (!material || compressionRatio >= 1.0) return;
    
    const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
    
    textureProperties.forEach(prop => {
      const texture = material[prop];
      if (texture && texture.image) {
        try {
          // Disable mipmaps on low-end devices to save memory
          if (compressionRatio <= 0.5) {
            texture.generateMipmaps = false;
            texture.minFilter = texture.magFilter = 1006; // LinearFilter
          }
          
          // Reduce anisotropy
          if (texture.anisotropy > 1) {
            texture.anisotropy = Math.max(1, Math.floor(texture.anisotropy * compressionRatio));
          }
          
          texture.needsUpdate = true;
          
        } catch (error) {
          console.warn(`Texture optimization failed for ${prop}:`, error);
        }
      }
    });
  }
  
  /**
   * Calculate approximate memory usage of a model
   */
  calculateModelMemoryUsage(modelData) {
    let memoryMB = 0;
    
    try {
      // Calculate geometry memory
      if (modelData.nodes) {
        Object.values(modelData.nodes).forEach(node => {
          if (node.geometry) {
            const geo = node.geometry;
            let geoMemory = 0;
            
            // Vertices
            if (geo.attributes.position) {
              geoMemory += geo.attributes.position.count * geo.attributes.position.itemSize * 4; // 4 bytes per float
            }
            
            // Normals
            if (geo.attributes.normal) {
              geoMemory += geo.attributes.normal.count * geo.attributes.normal.itemSize * 4;
            }
            
            // UVs
            if (geo.attributes.uv) {
              geoMemory += geo.attributes.uv.count * geo.attributes.uv.itemSize * 4;
            }
            
            // Indices
            if (geo.index) {
              geoMemory += geo.index.count * 2; // 2 bytes per index
            }
            
            memoryMB += geoMemory / (1024 * 1024);
          }
        });
      }
      
      // Calculate texture memory (approximate)
      if (modelData.materials) {
        Object.values(modelData.materials).forEach(material => {
          const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
          textureProps.forEach(prop => {
            const texture = material[prop];
            if (texture && texture.image) {
              // Rough estimate: width * height * 4 bytes (RGBA)
              const width = texture.image.width || 512;
              const height = texture.image.height || 512;
              memoryMB += (width * height * 4) / (1024 * 1024);
            }
          });
        });
      }
      
    } catch (error) {
      console.warn('Memory calculation failed:', error);
      memoryMB = 5; // Default estimate
    }
    
    return memoryMB;
  }
  
  /**
   * Ensure sufficient memory is available for new model
   */
  async ensureMemoryAvailable() {
    const currentUsage = this.getCurrentMemoryUsage();
    
    if (currentUsage > this.maxCacheSize * 0.8) {
      await this.performMemoryCleanup();
    }
  }
  
  /**
   * Perform memory cleanup
   */
  async performMemoryCleanup() {
    console.log('Performing memory cleanup...');
    
    // Sort models by last access time and priority
    const sortedModels = Array.from(this.loadedModels.entries())
      .sort((a, b) => {
        const [, modelA] = a;
        const [, modelB] = b;
        
        // Prioritize by priority first, then by last accessed time
        if (modelA.priority !== modelB.priority) {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return priorityOrder[modelB.priority] - priorityOrder[modelA.priority];
        }
        
        return modelA.lastAccessed - modelB.lastAccessed;
      });
    
    // Remove oldest/lowest priority models until under threshold
    const targetUsage = this.maxCacheSize * 0.6; // Target 60% usage
    let currentUsage = this.getCurrentMemoryUsage();
    
    for (const [modelPath, model] of sortedModels) {
      if (currentUsage <= targetUsage) break;
      
      try {
        this.disposeModel(model.data);
        this.loadedModels.delete(modelPath);
        currentUsage -= model.memoryUsage;
        
        console.log(`Cleaned up model: ${modelPath} (${model.memoryUsage.toFixed(2)}MB freed)`);
      } catch (error) {
        console.warn(`Failed to cleanup model ${modelPath}:`, error);
      }
    }
    
    this.updateMemoryUsage();
    
    // Force garbage collection if available
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }
  }
  
  /**
   * Dispose of a model and free its resources
   */
  disposeModel(modelData) {
    if (!modelData) return;
    
    try {
      // Dispose geometries
      if (modelData.nodes) {
        Object.values(modelData.nodes).forEach(node => {
          if (node.geometry && node.geometry.dispose) {
            node.geometry.dispose();
          }
        });
      }
      
      // Dispose materials and textures
      if (modelData.materials) {
        Object.values(modelData.materials).forEach(material => {
          // Dispose textures
          const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
          textureProps.forEach(prop => {
            const texture = material[prop];
            if (texture && texture.dispose) {
              texture.dispose();
            }
          });
          
          // Dispose material
          if (material.dispose) {
            material.dispose();
          }
        });
      }
      
      // Call cleanup callbacks
      this.cleanupCallbacks.forEach(callback => {
        try {
          callback(modelData);
        } catch (error) {
          console.warn('Cleanup callback failed:', error);
        }
      });
      
    } catch (error) {
      console.warn('Model disposal failed:', error);
    }
  }
  
  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    return Array.from(this.loadedModels.values())
      .reduce((total, model) => total + (model.memoryUsage || 0), 0);
  }
  
  /**
   * Update memory usage statistics
   */
  updateMemoryUsage() {
    let totalGeometries = 0;
    let totalMaterials = 0;
    let totalTextures = 0;
    let estimatedMemoryMB = 0;
    
    this.loadedModels.forEach(model => {
      estimatedMemoryMB += model.memoryUsage || 0;
      
      if (model.data.nodes) {
        totalGeometries += Object.keys(model.data.nodes).length;
      }
      if (model.data.materials) {
        totalMaterials += Object.keys(model.data.materials).length;
        
        Object.values(model.data.materials).forEach(material => {
          const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
          textureProps.forEach(prop => {
            if (material[prop]) totalTextures++;
          });
        });
      }
    });
    
    this.memoryUsage = {
      totalGeometries,
      totalMaterials,
      totalTextures,
      estimatedMemoryMB: Math.round(estimatedMemoryMB * 100) / 100
    };
  }
  
  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      this.updateMemoryUsage();
      
      // Auto-cleanup if memory usage is too high
      if (this.memoryUsage.estimatedMemoryMB > this.maxCacheSize) {
        this.performMemoryCleanup();
      }
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Preload models based on priority
   */
  async preloadModels(modelPaths, priority = 'low') {
    const loadPromises = modelPaths.map(path => 
      this.loadModelProgressive(path, priority)
    );
    
    try {
      await Promise.allSettled(loadPromises);
      console.log(`Preloaded ${modelPaths.length} models`);
    } catch (error) {
      console.warn('Model preloading failed:', error);
    }
  }
  
  /**
   * Register cleanup callback
   */
  registerCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);
    
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }
  
  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return {
      ...this.memoryUsage,
      maxCacheSize: this.maxCacheSize,
      cacheUtilization: (this.memoryUsage.estimatedMemoryMB / this.maxCacheSize) * 100,
      loadedModelsCount: this.loadedModels.size,
      deviceCapabilities: this.deviceCapabilities.recommendedQuality
    };
  }
  
  /**
   * Clear all cached models
   */
  clearCache() {
    this.loadedModels.forEach(model => {
      this.disposeModel(model.data);
    });
    this.loadedModels.clear();
    this.preloadQueue.clear();
    this.loadingPromises.clear();
    this.updateMemoryUsage();
    
    console.log('Model cache cleared');
  }
}

// Create global instance
const globalMemoryManager = new ModelMemoryManager();

/**
 * React hook for using memory manager
 */
export function useModelMemoryManager() {
  return globalMemoryManager;
}

/**
 * Preload phoenix models based on device capabilities
 */
export function preloadPhoenixModels() {
  const qualities = ['low', 'medium'];
  const paths = qualities.map(quality => `/models/optimized/phoenix-${quality}.glb`);
  
  return globalMemoryManager.preloadModels(paths, 'normal');
}

/**
 * Load model with memory management
 */
export function loadModelWithMemoryManagement(modelPath, priority = 'normal', onProgress = null) {
  return globalMemoryManager.loadModelProgressive(modelPath, priority, onProgress);
}

/**
 * Get memory statistics
 */
export function getModelMemoryStats() {
  return globalMemoryManager.getMemoryStats();
}

export default globalMemoryManager;