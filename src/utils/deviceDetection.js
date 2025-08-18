/**
 * Device Detection and Performance Assessment Utility
 * Determines the appropriate 3D model quality level based on device capabilities
 */

import { isMobile, isTablet, browserName, browserVersion, osName } from 'react-device-detect';

// GPU performance tiers based on common mobile GPUs
const GPU_PERFORMANCE_TIERS = {
  // High-end mobile GPUs (can handle medium quality)
  HIGH: [
    'Apple A15', 'Apple A16', 'Apple A17', 'Apple M1', 'Apple M2',
    'Adreno 730', 'Adreno 740', 'Adreno 750',
    'Mali-G78', 'Mali-G710', 'Mali-G715',
    'PowerVR GT7600', 'PowerVR GT7800'
  ],
  
  // Mid-range mobile GPUs (low quality recommended)
  MEDIUM: [
    'Apple A12', 'Apple A13', 'Apple A14',
    'Adreno 640', 'Adreno 650', 'Adreno 660',
    'Mali-G76', 'Mali-G77', 'Mali-G68',
    'PowerVR GE8320', 'PowerVR GM9446'
  ],
  
  // Low-end mobile GPUs (ultra-low quality only)
  LOW: [
    'Adreno 530', 'Adreno 540', 'Adreno 618', 'Adreno 619',
    'Mali-G52', 'Mali-G57', 'Mali-G51',
    'PowerVR GE8300', 'PowerVR GE8100'
  ]
};

/**
 * Detect WebGL capabilities and performance characteristics
 */
function getWebGLCapabilities() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) {
    return { supported: false, tier: 'NONE' };
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
  
  // Get max texture size (indicator of GPU capability)
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
  const maxFragmentUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
  
  // WebGL 2.0 support check
  const webgl2 = !!(document.createElement('canvas').getContext('webgl2'));
  
  return {
    supported: true,
    renderer,
    vendor,
    maxTextureSize,
    maxVertexUniforms,
    maxFragmentUniforms,
    webgl2Support: webgl2,
    tier: assessGPUTier(renderer, maxTextureSize, webgl2)
  };
}

/**
 * Assess GPU performance tier based on renderer string and capabilities
 */
function assessGPUTier(renderer, maxTextureSize, webgl2Support) {
  const rendererLower = renderer.toLowerCase();
  
  // Check for high-end GPUs
  for (const gpu of GPU_PERFORMANCE_TIERS.HIGH) {
    if (rendererLower.includes(gpu.toLowerCase())) {
      return 'HIGH';
    }
  }
  
  // Check for medium-end GPUs
  for (const gpu of GPU_PERFORMANCE_TIERS.MEDIUM) {
    if (rendererLower.includes(gpu.toLowerCase())) {
      return 'MEDIUM';
    }
  }
  
  // Check for low-end GPUs
  for (const gpu of GPU_PERFORMANCE_TIERS.LOW) {
    if (rendererLower.includes(gpu.toLowerCase())) {
      return 'LOW';
    }
  }
  
  // Fallback assessment based on capabilities
  if (maxTextureSize >= 4096 && webgl2Support) {
    return 'HIGH';
  } else if (maxTextureSize >= 2048) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Estimate available memory (rough approximation)
 */
function estimateAvailableMemory() {
  // Use navigator.deviceMemory if available (Chrome only)
  if ('deviceMemory' in navigator) {
    return navigator.deviceMemory * 1024; // Convert GB to MB
  }
  
  // Fallback estimates based on device type
  if (isMobile) {
    return isTablet ? 3072 : 2048; // 3GB tablets, 2GB phones
  }
  return 8192; // 8GB desktop default
}

/**
 * Assess network quality for progressive loading decisions
 */
function getNetworkQuality() {
  // Use Network Information API if available
  if ('connection' in navigator) {
    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink;
    
    return {
      effectiveType,
      downlink,
      quality: effectiveType === '4g' && downlink > 10 ? 'FAST' : 
               effectiveType === '4g' || effectiveType === '3g' ? 'MEDIUM' : 'SLOW'
    };
  }
  
  return { quality: 'UNKNOWN' };
}

/**
 * Main device assessment function
 * Returns recommended model quality and loading strategy
 */
export function assessDeviceCapabilities() {
  const webglInfo = getWebGLCapabilities();
  const memoryEstimate = estimateAvailableMemory();
  const networkInfo = getNetworkQuality();
  
  // Device classification
  const deviceInfo = {
    isMobile,
    isTablet,
    browserName,
    browserVersion,
    osName,
    webgl: webglInfo,
    estimatedMemory: memoryEstimate,
    network: networkInfo
  };
  
  // Determine recommended model quality
  let recommendedQuality = 'high';
  
  if (!webglInfo.supported) {
    recommendedQuality = 'none'; // No 3D support
  } else if (isMobile) {
    // Mobile device - be conservative
    if (webglInfo.tier === 'HIGH' && memoryEstimate > 3000) {
      recommendedQuality = 'medium'; // Even high-end mobile gets medium
    } else if (webglInfo.tier === 'MEDIUM' || memoryEstimate > 2000) {
      recommendedQuality = 'low';
    } else {
      recommendedQuality = 'ultra-low';
    }
  } else {
    // Desktop - can handle higher quality
    if (webglInfo.tier === 'HIGH') {
      recommendedQuality = 'high';
    } else if (webglInfo.tier === 'MEDIUM') {
      recommendedQuality = 'medium';
    } else {
      recommendedQuality = 'low';
    }
  }
  
  // Adjust for slow network
  if (networkInfo.quality === 'SLOW') {
    const qualityLevels = ['none', 'ultra-low', 'low', 'medium', 'high'];
    const currentIndex = qualityLevels.indexOf(recommendedQuality);
    if (currentIndex > 1) {
      recommendedQuality = qualityLevels[currentIndex - 1]; // Downgrade one level
    }
  }
  
  return {
    deviceInfo,
    recommendedQuality,
    modelPath: getModelPath(recommendedQuality),
    loadingStrategy: getLoadingStrategy(recommendedQuality, networkInfo.quality),
    performanceSettings: getPerformanceSettings(recommendedQuality)
  };
}

/**
 * Get the appropriate model file path based on quality level
 */
function getModelPath(quality) {
  const modelPaths = {
    'none': null,
    'ultra-low': '/models/optimized/ynz-ultra-low.glb',
    'low': '/models/optimized/ynz-low.glb',
    'medium': '/models/optimized/ynz-medium.glb',
    'high': '/models/optimized/ynz-high.glb',
    'original': '/models/ynz.glb' // Fallback to original if needed
  };
  
  return modelPaths[quality] || modelPaths['low'];
}

/**
 * Get loading strategy based on quality and network
 */
function getLoadingStrategy(quality, networkQuality) {
  return {
    useProgressiveLoading: quality !== 'none',
    showLoadingIndicator: true,
    timeout: networkQuality === 'SLOW' ? 30000 : 15000, // ms
    retryAttempts: networkQuality === 'SLOW' ? 1 : 2,
    preloadTextures: quality === 'high' && networkQuality === 'FAST'
  };
}

/**
 * Get performance settings for Three.js based on quality
 */
function getPerformanceSettings(quality) {
  const settings = {
    'none': null,
    'ultra-low': {
      antialias: false,
      shadows: false,
      pixelRatio: Math.min(window.devicePixelRatio, 1),
      maxFPS: 30,
      frustumCulling: true,
      matrixAutoUpdate: false
    },
    'low': {
      antialias: false,
      shadows: false,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      maxFPS: 30,
      frustumCulling: true,
      matrixAutoUpdate: false
    },
    'medium': {
      antialias: isMobile ? false : true,
      shadows: false,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      maxFPS: isMobile ? 30 : 60,
      frustumCulling: true,
      matrixAutoUpdate: false
    },
    'high': {
      antialias: true,
      shadows: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      maxFPS: 60,
      frustumCulling: true,
      matrixAutoUpdate: true
    }
  };
  
  return settings[quality] || settings['low'];
}

/**
 * Debug function to log device assessment results
 */
export function logDeviceAssessment() {
  const assessment = assessDeviceCapabilities();
  console.group('🔍 Device Performance Assessment');
  console.log('📱 Device Info:', assessment.deviceInfo);
  console.log('🎯 Recommended Quality:', assessment.recommendedQuality);
  console.log('📂 Model Path:', assessment.modelPath);
  console.log('⚡ Loading Strategy:', assessment.loadingStrategy);
  console.log('⚙️ Performance Settings:', assessment.performanceSettings);
  console.groupEnd();
  return assessment;
}

export default assessDeviceCapabilities;