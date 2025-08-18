import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useHarmonizedInteractions } from '../hooks/useHarmonizedInteractions';

function PhoenixBirdModel(props) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF('/models/phoenix_bird/scene.gltf');
  const { actions } = useAnimations(animations, group);
  
  const interactions = useHarmonizedInteractions();

  useFrame((state, delta) => {
    if (!group.current) return;
    
    const { mouse, scroll, isActive } = interactions.model3D;
    
    const sensitivity = isActive ? 0.3 : 0.1;
    
    const targetRotationX = mouse.y * sensitivity;
    const targetRotationY = mouse.x * sensitivity;
    const targetRotationZ = scroll * 0.2;

    const lerpSpeed = isActive ? 2 : 1;
    
    group.current.rotation.x += (targetRotationX - group.current.rotation.x) * delta * lerpSpeed;
    group.current.rotation.y += (targetRotationY - group.current.rotation.y) * delta * lerpSpeed;
    group.current.rotation.z += (targetRotationZ - group.current.rotation.z) * delta * 1;
  });

  useGSAP(() => {
    if (!group.current) return;
    
    const tl = gsap.timeline();
    
    tl.from(group.current.position, {
      y: 5,
      duration: 3,
      ease: 'circ.out',
    });

    tl.from(
      group.current.scale,
      {
        x: 0,
        y: 0,
        z: 0,
        duration: 2.5,
        ease: 'back.out(1.7)',
      },
      '-=75%'
    );

    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach(action => {
        if (action) {
          action.play();
        }
      });
    }
  }, [actions]);

  const sceneObject = nodes.Sketchfab_Scene;

  return (
    <group ref={group} {...props} dispose={null}>
      {/* Phoenix model with very small scale due to large original size */}
      <group scale={0.003} position={[0, -1, 0]} rotation={[0, 0, 0]}>
        <primitive object={sceneObject} />
      </group>
      
      {/* Test mesh to confirm rendering works */}
      <mesh position={[2, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ff4500" emissive="#ff2200" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ff6600" />
    </mesh>
  );
}

function SimplePhoenix(props) {
  return (
    <mesh {...props}>
      <coneGeometry args={[0.5, 2, 8]} />
      <meshStandardMaterial color="#ff4500" />
    </mesh>
  );
}

function PhoenixWithAnimations(props) {
  const group = useRef();
  const { nodes, materials, animations, scene } = useGLTF('/models/phoenix_bird.glb');
  const { actions, mixer } = useAnimations(animations, group);
  
  const interactions = useHarmonizedInteractions();
  
  // Check for original animations (cleaned up debug)
  const hasAnimations = animations.length > 0;

  useFrame((state, delta) => {
    if (!group.current) return;
    
    const { mouse, scroll, isActive } = interactions.model3D;
    
    // ENHANCED MOUSE INTERACTION - Much more responsive
    const baseSensitivity = isActive ? 2.5 : 1.8; // Increased base sensitivity
    const mouseInfluence = isActive ? 1.5 : 1.2; // Extra influence when active
    
    // Enhanced rotation tracking
    const targetRotationY = mouse.x * baseSensitivity * mouseInfluence;
    const targetRotationX = mouse.y * baseSensitivity * mouseInfluence * 0.8;
    
    // Super responsive rotation with higher lerp speed
    const rotationSpeed = isActive ? 12 : 8; // Much faster response
    group.current.rotation.y += (targetRotationY - group.current.rotation.y) * delta * rotationSpeed;
    group.current.rotation.x += (targetRotationX - group.current.rotation.x) * delta * rotationSpeed;
    
    // ENHANCED POSITION TRACKING - Phoenix follows mouse position
    const mousePositionInfluence = isActive ? 0.8 : 0.4;
    const targetPositionX = mouse.x * mousePositionInfluence;
    const targetPositionY = -mouse.y * mousePositionInfluence * 0.6; // Inverted Y for natural movement
    
    // Smooth position following
    const positionSpeed = isActive ? 3 : 2;
    group.current.position.x += (targetPositionX - group.current.position.x) * delta * positionSpeed;
    group.current.position.y += (targetPositionY - group.current.position.y) * delta * positionSpeed;
    
    // AMAZING SCROLL ANIMATIONS
    const scrollInfluence = scroll * 0.01; // Convert scroll to usable range
    
    // Scroll-based Z movement (Phoenix moves forward/backward with scroll)
    const targetZ = scrollInfluence * 3;
    group.current.position.z += (targetZ - group.current.position.z) * delta * 4;
    
    // Scroll-based tilt (Phoenix tilts based on scroll direction)
    const scrollTilt = scrollInfluence * 0.3;
    group.current.rotation.z += (scrollTilt - group.current.rotation.z) * delta * 5;
    
    // Scroll-based scale (Phoenix grows/shrinks slightly with scroll)
    const scrollScale = 1 + (scrollInfluence * 0.15);
    const currentScale = group.current.scale.x;
    const targetScale = Math.max(0.5, Math.min(1.5, scrollScale)); // Clamp scale
    group.current.scale.setScalar(currentScale + (targetScale - currentScale) * delta * 3);
    
    // Dynamic scroll-based wing intensity (faster flapping when scrolling)
    const scrollSpeed = Math.abs(scroll * 0.1);
    if (mixer && actions) {
      Object.values(actions).forEach(action => {
        if (action) {
          const baseSpeed = 1;
          const scrollSpeedMultiplier = 1 + scrollSpeed;
          action.setEffectiveTimeScale(baseSpeed * scrollSpeedMultiplier);
        }
      });
    }
  });

  useGSAP(() => {
    if (!group.current) return;
    
    // Entrance animation
    gsap.from(group.current.position, {
      y: 5,
      duration: 3,
      ease: 'power2.out',
    });

    gsap.from(group.current.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 2.5,
      ease: 'back.out(1.7)',
    });

    // Play the ORIGINAL animations from the GLB file
    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach(action => {
        if (action) {
          action.reset().play();
          action.setLoop(2201, Infinity); // Loop forever
        }
      });
    }
  }, [actions]);

  // Use the scene from GLB or fallback to first available object
  const sceneObject = scene || nodes.Scene || Object.values(nodes)[0];

  return (
    <group ref={group} {...props} dispose={null}>
      <group scale={0.004} position={[0, -0.5, 0]} rotation={[0, Math.PI, 0]}>
        <primitive object={sceneObject} />
      </group>
    </group>
  );
}

export function Ynz(props) {
  return (
    <Suspense fallback={
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#ff4500" emissive="#220000" emissiveIntensity={0.3} />
      </mesh>
    }>
      <PhoenixWithAnimations {...props} />
    </Suspense>
  );
}

useGLTF.preload('/models/phoenix_bird.glb');

export default Ynz;
