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
  const { nodes, materials, animations, scene } = useGLTF('/models/phoenix_bird/scene.gltf');
  const { actions, mixer } = useAnimations(animations, group);
  
  const interactions = useHarmonizedInteractions();
  
  // Debug what animations we actually have
  console.log('🔥 Phoenix Animation Debug:');
  console.log('- Animations count:', animations.length);
  console.log('- Animation names:', animations.map(anim => anim.name));
  console.log('- Available actions:', actions ? Object.keys(actions) : 'None');
  console.log('- Model nodes with bones:', Object.keys(nodes).filter(name => name.includes('B_')));

  useFrame((state, delta) => {
    if (!group.current) return;
    
    const { mouse, scroll, isActive } = interactions.model3D;
    
    // Responsive mouse movement (keeping this)
    const sensitivity = isActive ? 1.2 : 0.6;
    const targetRotationY = mouse.x * sensitivity;
    const targetRotationX = mouse.y * sensitivity * 0.8;
    
    group.current.rotation.y += (targetRotationY - group.current.rotation.y) * delta * 6;
    group.current.rotation.x += (targetRotationX - group.current.rotation.x) * delta * 6;
  });

  useGSAP(() => {
    if (!group.current) return;
    
    // Simple entrance animation
    gsap.from(group.current.position, {
      y: 3,
      duration: 2,
      ease: 'power2.out',
    });

    gsap.from(group.current.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: 'back.out(1.7)',
    });

    // Play ORIGINAL model animations if they exist
    if (actions && Object.keys(actions).length > 0) {
      console.log('✅ Found original animations! Playing:', Object.keys(actions));
      Object.values(actions).forEach(action => {
        if (action) {
          action.reset().play();
          action.setLoop(2201, Infinity);
        }
      });
    } else {
      console.log('❌ No original animations found in model');
    }
  }, [actions]);

  const sceneObject = nodes.Sketchfab_Scene;

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

useGLTF.preload('/models/phoenix_bird/scene.gltf');

export default Ynz;
