import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const GameCanvas = ({ currentLocation, discoveredTreasures, onExploreLocation }) => {
  const islandRef = useRef();
  const [hoveredLocation, setHoveredLocation] = useState(null);

  // Treasure locations
  const treasureLocations = [
    { position: [-8, 1, -5], name: "Trump's Bunker", color: 0x696969 },
    { position: [10, 1, 8], name: "Putin's Dig Site", color: 0x8B4513 },
    { position: [-12, 1, 10], name: "Modi's Safe", color: 0xC0C0C0 },
    { position: [5, 1, -12], name: "Xi's Cave", color: 0x2F4F4F },
    { position: [0, 1, 0], name: "Central Command", color: 0xFFD700 }
  ];

  useFrame((state) => {
    if (islandRef.current) {
      islandRef.current.rotation.y += 0.001;
    }
  });

  const handleLocationClick = (index) => {
    if (!discoveredTreasures.includes(index)) {
      onExploreLocation(index);
    }
  };

  return (
    <>
      {/* Island Base */}
      <mesh ref={islandRef} position={[0, -1, 0]} receiveShadow>
        <cylinderGeometry args={[15, 20, 2, 32]} />
        <meshLambertMaterial color={0x8B4513} transparent opacity={0.9} />
      </mesh>

      {/* Grass */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[15, 20, 0.1, 32]} />
        <meshLambertMaterial color={0x228B22} />
      </mesh>

      {/* Treasure Locations */}
      {treasureLocations.map((location, index) => (
        <group key={index}>
          <mesh 
            position={location.position}
            onClick={() => handleLocationClick(index)}
            onPointerOver={() => setHoveredLocation(index)}
            onPointerOut={() => setHoveredLocation(null)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[2, 2, 2]} />
            <meshLambertMaterial 
              color={location.color}
              emissive={discoveredTreasures.includes(index) ? 0xFFD700 : 0x000000}
              emissiveIntensity={discoveredTreasures.includes(index) ? 0.3 : 0}
            />
          </mesh>
          
          {/* Glow effect for undiscovered treasures */}
          {!discoveredTreasures.includes(index) && (
            <mesh position={[location.position[0], location.position[1] + 2, location.position[2]]}>
              <sphereGeometry args={[3, 16, 16]} />
              <meshBasicMaterial 
                color={0xFFD700}
                transparent
                opacity={0.3}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Trees */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 12 + Math.random() * 5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={i} position={[x, 0, z]}>
            {/* Trunk */}
            <mesh castShadow>
              <cylinderGeometry args={[0.3, 0.5, 3]} />
              <meshLambertMaterial color={0x8B4513} />
            </mesh>
            {/* Leaves */}
            <mesh position={[0, 2.5, 0]} castShadow>
              <sphereGeometry args={[2, 8, 6]} />
              <meshLambertMaterial color={0x228B22} />
            </mesh>
          </group>
        );
      })}

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[50, 50, 50]} 
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </>
  );
};

export default GameCanvas;
