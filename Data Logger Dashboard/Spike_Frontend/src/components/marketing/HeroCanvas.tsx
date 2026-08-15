import { Canvas, useFrame } from "@react-three/fiber";
import { Icosahedron, Points, PointMaterial, Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Lattice() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);

  // Generate a starfield of subtle particles around the lattice.
  const particles = useMemo(() => {
    const count = 400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3.6 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  // Precompute icosahedron edges as line pairs (drei <Line> segments).
  const edges = useMemo(() => {
    const geom = new THREE.IcosahedronGeometry(1.6, 1);
    const wire = new THREE.WireframeGeometry(geom);
    const pos = wire.attributes.position as THREE.BufferAttribute;
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < pos.count; i += 2) {
      segs.push([
        new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)),
        new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)),
      ]);
    }
    geom.dispose();
    wire.dispose();
    return segs;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.15;
      group.current.rotation.x = Math.sin(t * 0.2) * 0.15;
    }
    if (inner.current) {
      inner.current.rotation.y = -t * 0.4;
      inner.current.rotation.z = t * 0.2;
      const s = 0.85 + Math.sin(t * 1.6) * 0.03;
      inner.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={group}>
      {edges.map(([a, b], i) => (
        <Line
          key={i}
          points={[a, b]}
          color="#3ddc97"
          transparent
          opacity={0.55}
          lineWidth={1}
        />
      ))}
      <Icosahedron ref={inner} args={[1.05, 0]}>
        <meshStandardMaterial
          color="#0a1a14"
          emissive="#0f3b2a"
          metalness={0.4}
          roughness={0.35}
          flatShading
        />
      </Icosahedron>
      <Points positions={particles} stride={3}>
        <PointMaterial
          transparent
          color="#7de3b8"
          size={0.018}
          sizeAttenuation
          depthWrite={false}
          opacity={0.7}
        />
      </Points>
    </group>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.4], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 3, 4]} intensity={1.2} color="#7de3b8" />
      <pointLight position={[-4, -2, -3]} intensity={0.6} color="#3b82f6" />
      <Lattice />
    </Canvas>
  );
}