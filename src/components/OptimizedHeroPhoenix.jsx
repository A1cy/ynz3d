/**
 * Optimized Hero Phoenix Integration
 * Drop-in replacement for the Hero component with optimized Phoenix model
 */

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, Lightformer } from '@react-three/drei';
import { useMediaQuery } from 'react-responsive';
import AnimatedHeaderSection from './AnimatedHeaderSection';
import OptimizedPhoenix from './OptimizedPhoenix';
import LODManager from './LODManager';

const OptimizedHeroPhoenix = () => {
  const isMobile = useMediaQuery({ maxWidth: 853 });
  const text = `We help growing brands and organizations achieve their marketing and communication goals through integrated solutions that combine creativity, innovation, and expertise`;

  // Handle Phoenix loading completion
  const handlePhoenixLoadComplete = (phoenixRef, quality) => {
    console.log(`✅ Hero Phoenix loaded with ${quality} quality`);
  };

  // Handle performance-based quality changes
  const handlePerformanceChange = (newQuality, metrics) => {
    console.log(`📊 Hero Phoenix quality adjusted to ${newQuality} due to performance`);
  };

  return (
    <section id="home" className="flex flex-col justify-end min-h-screen">
      <AnimatedHeaderSection
        subTitle={'Effective Communication Makes a Difference'}
        title={'YNZ'}
        text={text}
        textColor={'text-white'}
      />
      <figure
        className="absolute inset-0 z-10"
        style={{ width: '100vw', height: '100vh' }}
      >
        <Canvas
          shadows
          camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 100 }}
          style={{ background: 'transparent' }}
          dpr={[1, 2]} // Responsive pixel ratio
          performance={{ min: 0.5 }} // Performance optimization
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          
          <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <LODManager
              modelType="phoenix"
              onLoadingComplete={(data, assessment) => {
                console.log('📦 Hero LOD loading complete:', assessment.recommendedQuality);
              }}
              onQualityChange={(quality) => {
                console.log('🔄 Hero LOD quality changed:', quality);
              }}
            >
              {({ modelData, currentQuality, performanceSettings, isLoading }) => (
                <OptimizedPhoenix
                  scale={isMobile ? 0.7 : 1}
                  enableScrollInteraction={true}
                  enableMouseInteraction={true}
                  animationComplexity="auto"
                  performanceMode="auto"
                  onLoadComplete={handlePhoenixLoadComplete}
                  onPerformanceChange={handlePerformanceChange}
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
      </figure>
    </section>
  );
};

export default OptimizedHeroPhoenix;