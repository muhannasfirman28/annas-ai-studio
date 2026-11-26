"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { modelForIndex, OFFICE_MODELS } from "@/lib/office-models";
import { COFFEE_SPOT, DESK_SPOTS, MEETING_SPOT, type OfficeEmployee, type OfficeMovement } from "./office-types";

const ROOM_WIDTH = 12;
const ROOM_DEPTH = 8;
const FIGURE_HEIGHT = 1.55;
const WALK_SPEED = 3.1;
const PI = Math.PI;

/** Persentase ruangan 2D dipetakan ke lantai 3D (sumbu -Z = belakang ruangan). */
function spotToWorld(x: number, y: number): THREE.Vector3 {
  return new THREE.Vector3((x / 100 - 0.5) * ROOM_WIDTH, 0, (y / 100 - 0.5) * ROOM_DEPTH);
}

function angleTowards(current: number, target: number, amount: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * Math.min(1, amount);
}

/** Menjaga label tetap di dalam kanvas saat layar sempit (mobile 375px). */
function clampBubblePosition(
  el: THREE.Object3D,
  camera: THREE.Camera,
  size: { width: number; height: number },
): number[] {
  const projected = new THREE.Vector3();
  el.getWorldPosition(projected);
  projected.project(camera);
  const marginX = Math.min(48, size.width * 0.18);
  const marginY = Math.min(30, size.height * 0.1);
  return [
    THREE.MathUtils.clamp(projected.x * (size.width / 2) + size.width / 2, marginX, size.width - marginX),
    THREE.MathUtils.clamp(-projected.y * (size.height / 2) + size.height / 2, marginY, size.height - marginY),
  ];
}

/**
 * Melangkah dibuat di vertex shader: kaki kiri/kanan diayunkan berlawanan
 * fase terhadap pinggul dan diangkat saat melangkah maju. Ini bukan body bob.
 */
function patchWalkingMaterial(material: THREE.Material, bounds: THREE.Box3, phase: { value: number }): THREE.Material {
  const patched = material.clone();
  patched.onBeforeCompile = (shader) => {
    shader.uniforms.uPhase = phase;
    shader.uniforms.uMin = { value: bounds.min.clone() };
    shader.uniforms.uMax = { value: bounds.max.clone() };
    shader.vertexShader = `
      uniform float uPhase;
      uniform vec3 uMin;
      uniform vec3 uMax;
    ${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec3 span = max(uMax - uMin, vec3(0.0001));
      vec3 norm = (transformed - uMin) / span;

      float hip = 0.52;
      float side = norm.x - 0.5;
      float legMask = smoothstep(hip + 0.05, hip - 0.07, norm.y);

      float legPhase = uPhase + (side < 0.0 ? 0.0 : ${PI.toFixed(8)});
      float swing = sin(legPhase) * 0.62;
      float lift = max(0.0, sin(legPhase)) * 0.13;
      float pivotY = hip;
      float pivotZ = 0.5;
      float dy = norm.y - pivotY;
      float dz = norm.z - pivotZ;
      float cs = cos(swing);
      float sn = sin(swing);
      vec3 stepped = vec3(
        norm.x,
        pivotY + dy * cs - dz * sn + lift,
        pivotZ + dy * sn + dz * cs
      );

      float armMask = smoothstep(0.58, 0.68, norm.y) * smoothstep(0.88, 0.78, norm.y)
        * smoothstep(0.16, 0.28, abs(side));
      float armPhase = uPhase + (side < 0.0 ? ${PI.toFixed(8)} : 0.0);
      float armSwing = sin(armPhase) * 0.34;
      float aPivotY = 0.78;
      float aPivotZ = 0.5;
      float ady = norm.y - aPivotY;
      float adz = norm.z - aPivotZ;
      float acs = cos(armSwing);
      float asn = sin(armSwing);
      vec3 armed = vec3(
        norm.x,
        aPivotY + ady * acs - adz * asn,
        aPivotZ + ady * asn + adz * acs
      );

      vec3 posed = mix(stepped, armed, armMask);
      transformed = mix(transformed, uMin + posed * span, max(legMask, armMask));
      `,
    );
  };
  patched.customProgramCacheKey = () => "office-walk-step-v2";
  return patched;
}

interface WorkerProps {
  employee: OfficeEmployee;
  index: number;
  movement: OfficeMovement;
  message?: string;
  frozen: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function Worker({ employee, index, movement, message, frozen, selected, onSelect, onHover }: WorkerProps) {
  const asset = modelForIndex(index);
  const { scene } = useGLTF(asset.file);
  const root = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const phase = useRef({ value: index * 0.83 });
  const position = useRef(spotToWorld(movement.x, movement.y));
  const target = useMemo(() => spotToWorld(movement.x, movement.y), [movement.x, movement.y]);

  const clone = useMemo(() => {
    const object = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(object);
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = Array.isArray(child.material)
        ? child.material.map((entry) => patchWalkingMaterial(entry, bounds, phase.current))
        : patchWalkingMaterial(child.material, bounds, phase.current);
    });
    const size = bounds.getSize(new THREE.Vector3());
    const scale = FIGURE_HEIGHT / Math.max(size.y, 0.0001);
    return { object, scale, floorOffset: -bounds.min.y * scale };
  }, [scene]);

  useEffect(() => () => {
    clone.object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }, [clone]);

  useEffect(() => {
    if (frozen) {
      position.current.copy(target);
      if (root.current) root.current.position.copy(target);
    }
  }, [frozen, target]);

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) return;
    if (frozen) {
      group.position.copy(target);
      return;
    }

    const offset = target.clone().sub(position.current);
    const distance = offset.length();
    if (distance > 0.015) {
      const step = Math.min(distance, WALK_SPEED * Math.min(delta, 0.05));
      position.current.addScaledVector(offset.divideScalar(distance), step);
      phase.current.value += delta * 7.4;
      const heading = Math.atan2(offset.x, offset.z);
      group.rotation.y = angleTowards(group.rotation.y, heading, delta * 5);
    } else {
      phase.current.value += delta * 0.9;
    }
    group.position.copy(position.current);
  });

  const showBubble = selected || Boolean(message);

  return (
    <group
      ref={root}
      position={[position.current.x, 0, position.current.z]}
      onClick={(event) => { event.stopPropagation(); onSelect(employee.id); }}
      onPointerOver={(event) => { event.stopPropagation(); onHover(employee.id); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
    >
      <group ref={model} scale={clone.scale} position={[0, clone.floorOffset, 0]}>
        <primitive object={clone.object} />
      </group>
      {selected && <pointLight position={[0, 0.15, 0]} color="#4ea8ff" intensity={1.6} distance={1.5} />}
      {showBubble && (
        <Html position={[0, FIGURE_HEIGHT + 0.32, 0]} center distanceFactor={9} zIndexRange={[40, 10]} calculatePosition={clampBubblePosition} style={{ pointerEvents: "none" }}>
          <div className={selected ? "office-3d-bubble office-3d-bubble-active" : "office-3d-bubble"}>
            <strong>{employee.name.split(/\s+/)[0]}</strong>
            {message && <span>{message}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

function Desk({ x, y, highlight }: { x: number; y: number; highlight: boolean }) {
  const spot = spotToWorld(x, y);
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, 0.72, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.08, 0.8]} />
        <meshStandardMaterial color={highlight ? "#5a6f9c" : "#46516a"} roughness={0.7} />
      </mesh>
      {[-0.68, 0.68].map((dx) => (
        <mesh key={dx} position={[dx, 0.35, 0]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.7]} />
          <meshStandardMaterial color="#2c3446" />
        </mesh>
      ))}
      <group position={[0, 0.76, -0.12]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.68, 0.42, 0.05]} />
          <meshStandardMaterial color="#101827" />
        </mesh>
        <mesh position={[0, 0.35, 0.031]}>
          <planeGeometry args={[0.58, 0.32]} />
          <meshStandardMaterial color="#1e6f8c" emissive="#1e6f8c" emissiveIntensity={highlight ? 1.1 : 0.55} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.12, 0.16, 0.08]} />
          <meshStandardMaterial color="#283248" />
        </mesh>
      </group>
      <mesh position={[0, 0.78, 0.24]}>
        <boxGeometry args={[0.56, 0.02, 0.18]} />
        <meshStandardMaterial color="#2a3448" />
      </mesh>
      <mesh position={[0.55, 0.78, 0.2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.11, 12]} />
        <meshStandardMaterial color="#e6a15a" />
      </mesh>
      <mesh position={[0, 0.28, 0.85]} castShadow>
        <boxGeometry args={[0.52, 0.08, 0.5]} />
        <meshStandardMaterial color="#252d40" />
      </mesh>
      <mesh position={[0, 0.58, 1.06]} castShadow>
        <boxGeometry args={[0.52, 0.58, 0.08]} />
        <meshStandardMaterial color="#303a52" />
      </mesh>
    </group>
  );
}

function CoffeeCorner() {
  const spot = spotToWorld(COFFEE_SPOT.x, COFFEE_SPOT.y);
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.1, 0.9, 0.6]} />
        <meshStandardMaterial color="#344156" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.45, 0.31]}>
        <boxGeometry args={[0.62, 0.42, 0.04]} />
        <meshStandardMaterial color="#111a2b" emissive="#1d5c79" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0, 0.22, 0.34]}>
        <boxGeometry args={[0.3, 0.16, 0.06]} />
        <meshStandardMaterial color="#c88452" />
      </mesh>
      <mesh position={[0, 0.93, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.7]} />
        <meshStandardMaterial color="#4b5870" />
      </mesh>
      <pointLight position={[0, 1.2, 0]} color="#7dd3fc" intensity={0.7} distance={2.4} />
    </group>
  );
}

function MeetingArea() {
  const spot = spotToWorld(MEETING_SPOT.x, MEETING_SPOT.y);
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.05, 0.08, 24]} />
        <meshStandardMaterial color="#5a4b43" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 0.72, 12]} />
        <meshStandardMaterial color="#2b3346" />
      </mesh>
      {[0, 1, 2, 3].map((seat) => {
        const angle = (seat / 4) * Math.PI * 2;
        return (
          <group key={seat} position={[Math.cos(angle) * 1.55, 0, Math.sin(angle) * 1.55]} rotation={[0, -angle + Math.PI / 2, 0]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.5, 0.09, 0.48]} />
              <meshStandardMaterial color="#333e56" />
            </mesh>
            <mesh position={[0, 0.72, 0.22]} castShadow>
              <boxGeometry args={[0.5, 0.52, 0.08]} />
              <meshStandardMaterial color="#3b4760" />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 1.7, 0]}>
        <coneGeometry args={[0.42, 0.42, 16, 1, true]} />
        <meshStandardMaterial color="#d8b26e" emissive="#d8b26e" emissiveIntensity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.45, 0]} color="#ffd8a8" intensity={0.9} distance={3} />
    </group>
  );
}

function Room() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#39445b" roughness={0.92} />
      </mesh>
      <gridHelper args={[ROOM_WIDTH, 12, "#4a5875", "#414d66"]} position={[0, 0.005, 0]} />
      <mesh position={[0, 1.7, -ROOM_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 3.4, 0.12]} />
        <meshStandardMaterial color="#1e2c47" roughness={0.9} />
      </mesh>
      <mesh position={[-ROOM_WIDTH / 2, 1.7, 0]} receiveShadow>
        <boxGeometry args={[0.12, 3.4, ROOM_DEPTH]} />
        <meshStandardMaterial color="#243250" />
      </mesh>
      <mesh position={[ROOM_WIDTH / 2, 1.7, 0]} receiveShadow>
        <boxGeometry args={[0.12, 3.4, ROOM_DEPTH]} />
        <meshStandardMaterial color="#243250" />
      </mesh>
      {[-3.6, -1.2, 1.2, 3.6].map((x) => (
        <group key={x} position={[x, 2.05, -3.93]}>
          <mesh>
            <planeGeometry args={[1.5, 1.25]} />
            <meshStandardMaterial color="#274d78" emissive="#2b6ea5" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.05, 1.25, 0.02]} />
            <meshStandardMaterial color="#172238" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.55, -3.85]}>
        <boxGeometry args={[4.4, 0.9, 0.08]} />
        <meshStandardMaterial color="#15223a" />
      </mesh>
      <mesh position={[0, 0.72, -3.79]}>
        <planeGeometry args={[3.6, 0.36]} />
        <meshStandardMaterial color="#48a0c8" emissive="#48a0c8" emissiveIntensity={0.6} />
      </mesh>
      {DESK_SPOTS.map((spot, index) => <Desk key={index} x={spot.x} y={spot.y} highlight={false} />)}
      <CoffeeCorner />
      <MeetingArea />
    </group>
  );
}

interface SceneProps {
  employees: OfficeEmployee[];
  movements: OfficeMovement[];
  messages: Map<string, string>;
  frozen: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function Scene({ employees, movements, messages, frozen, selectedId, hoveredId, onSelect, onHover }: SceneProps) {
  return (
    <>
      <color attach="background" args={["#131d30"]} />
      <fog attach="fog" args={["#131d30", 13, 26]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#9ec5ff", "#39435b", 0.6]} />
      <directionalLight
        position={[3.5, 7, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <Room />
      {employees.map((employee, index) => (
        <Worker
          key={employee.id}
          employee={employee}
          index={index}
          movement={movements[index]}
          message={messages.get(employee.id)}
          frozen={frozen}
          selected={selectedId === employee.id || hoveredId === employee.id}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </>
  );
}

export function OfficeScene3D(props: SceneProps) {
  useEffect(() => {
    OFFICE_MODELS.forEach((asset) => useGLTF.preload(asset.file));
  }, []);

  return (
    <div className="office-scene-3d" role="img" aria-label="Simulasi ruangan kantor 3D dengan delapan karakter bergerak. Ini bukan pemantauan karyawan nyata.">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, 5.2, 8.6], fov: 48, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
      <div className="office-3d-legend" aria-hidden="true">Simulasi visual · model generik · bukan pelacakan karyawan</div>
    </div>
  );
}
