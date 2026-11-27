"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { modelForIndex, OFFICE_MODELS } from "@/lib/office-models";
import {
  carRoutesFor,
  pedestrianRoutesFor,
  sampleLoop,
  streetBounds,
  type CarRoute,
  type PedestrianRoute,
  type StreetBounds,
} from "@/lib/office-street";
import {
  OFFICE_ROOMS,
  ROOM_DESK_SPOTS,
  ROOM_GEOMETRY,
  gridFor,
  localToRoom,
  roomOrigin,
  spotToWorld,
  type OfficeDeskOwner,
  type OfficeEmployee,
  type OfficeLayoutName,
  type OfficeMovement,
  type OfficeRoom,
  type OfficeSpot,
} from "./office-types";

const FIGURE_HEIGHT = 1.55;
const WALK_SPEED = 6.4;
const PI = Math.PI;

function useOfficeLayout(): OfficeLayoutName {
  const width = useThree((state) => state.size.width);
  return width < 640 ? "tall" : "wide";
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
 * fase terhadap pinggul dan diangkat saat melangkah maju. `uWalk` membuat
 * ayunan benar-benar berhenti saat karakter duduk/berdiri diam.
 */
function patchWalkingMaterial(
  material: THREE.Material,
  bounds: THREE.Box3,
  phase: { value: number },
  walk: { value: number },
): THREE.Material {
  const patched = material.clone();
  patched.onBeforeCompile = (shader) => {
    shader.uniforms.uPhase = phase;
    shader.uniforms.uWalk = walk;
    shader.uniforms.uMin = { value: bounds.min.clone() };
    shader.uniforms.uMax = { value: bounds.max.clone() };
    shader.vertexShader = `
      uniform float uPhase;
      uniform float uWalk;
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
      float legMask = 1.0 - smoothstep(hip - 0.07, hip + 0.05, norm.y);

      float legPhase = uPhase + (side < 0.0 ? 0.0 : ${PI.toFixed(8)});
      float swing = sin(legPhase) * 0.62 * uWalk;
      float lift = max(0.0, sin(legPhase)) * 0.13 * uWalk;
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

      float armMask = smoothstep(0.58, 0.68, norm.y)
        * (1.0 - smoothstep(0.78, 0.88, norm.y))
        * smoothstep(0.16, 0.28, abs(side));
      float armPhase = uPhase + (side < 0.0 ? ${PI.toFixed(8)} : 0.0);
      float armSwing = sin(armPhase) * 0.34 * uWalk;
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
      transformed = mix(transformed, uMin + posed * span, max(legMask, armMask) * uWalk);
      `,
    );
  };
  patched.customProgramCacheKey = () => "office-walk-step-v3";
  return patched;
}

/** Model generik dipakai ulang untuk karyawan di dalam dan pejalan kaki di luar. */
function useWalkingFigure(index: number, dim: boolean) {
  const asset = modelForIndex(index);
  const { scene } = useGLTF(asset.file);
  const phase = useRef({ value: index * 0.83 });
  const walk = useRef({ value: 0 });

  const clone = useMemo(() => {
    const object = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(object);
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const prepare = (material: THREE.Material): THREE.Material => {
        const color = (material as THREE.MeshStandardMaterial).color;
        if (color instanceof THREE.Color) material.userData.officeBaseColor = color.clone();
        return patchWalkingMaterial(material, bounds, phase.current, walk.current);
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(prepare)
        : prepare(child.material);
    });
    const size = bounds.getSize(new THREE.Vector3());
    const scale = FIGURE_HEIGHT / Math.max(size.y, 0.0001);
    return { object, scale, floorOffset: -bounds.min.y * scale };
  }, [scene]);

  useEffect(() => {
    clone.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        const base = material.userData.officeBaseColor as THREE.Color | undefined;
        const color = (material as THREE.MeshStandardMaterial).color;
        if (base && color instanceof THREE.Color) color.copy(base).multiplyScalar(dim ? 0.45 : 1);
      });
    });
  }, [clone, dim]);

  useEffect(() => () => {
    clone.object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }, [clone]);

  return { ...clone, phase, walk };
}

interface WorkerProps {
  employee: OfficeEmployee;
  index: number;
  movement: OfficeMovement;
  message?: string;
  frozen: boolean;
  dim: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function Worker({ employee, index, movement, message, frozen, dim, selected, onSelect, onHover }: WorkerProps) {
  const layout = useOfficeLayout();
  const { object, scale, floorOffset, phase, walk } = useWalkingFigure(index, dim);
  const root = useRef<THREE.Group>(null);
  const layoutRef = useRef(layout);
  const target = useMemo(() => {
    const spot: OfficeSpot = { roomIndex: movement.roomIndex, x: movement.x, y: movement.y };
    const point = spotToWorld(spot, layout);
    return new THREE.Vector3(point.x, 0, point.z);
  }, [movement.roomIndex, movement.x, movement.y, layout]);
  const waypoints = useMemo(
    () => [
      ...movement.via.map((spot) => {
        const point = spotToWorld(spot, layout);
        return new THREE.Vector3(point.x, 0, point.z);
      }),
      target.clone(),
    ],
    [movement.via, target, layout],
  );
  const queue = useRef<THREE.Vector3[]>([]);
  const position = useRef(target.clone());

  // Layout seluruhnya 2×2; tetap jaga lompatan saat kanvas berubah ukuran.
  useEffect(() => {
    if (layoutRef.current === layout) return;
    layoutRef.current = layout;
    queue.current = [];
    position.current.copy(target);
    if (root.current) root.current.position.copy(target);
  }, [layout, target]);

  useEffect(() => {
    if (frozen) {
      queue.current = [];
      position.current.copy(target);
      if (root.current) root.current.position.copy(target);
      walk.current.value = 0;
      return;
    }
    queue.current = waypoints.map((point) => point.clone());
  }, [frozen, waypoints, walk]);

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) return;
    if (frozen) {
      group.position.copy(target);
      return;
    }

    const dt = Math.min(delta, 0.05);
    const next = queue.current[0];
    if (next) {
      const offset = next.clone().sub(position.current);
      const distance = offset.length();
      if (distance > 0.02) {
        // Fase langkah mengikuti jarak tempuh, bukan waktu saja, supaya kaki tidak selancar.
        const step = Math.min(distance, WALK_SPEED * dt);
        position.current.addScaledVector(offset.divideScalar(distance), step);
        phase.current.value += step * 6.1;
        walk.current.value = Math.min(1, walk.current.value + dt * 6);
        const heading = Math.atan2(offset.x, offset.z);
        group.rotation.y = angleTowards(group.rotation.y, heading, dt * 5);
      } else {
        queue.current.shift();
      }
    } else {
      walk.current.value = Math.max(0, walk.current.value - dt * 5);
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
      <group scale={scale} position={[0, floorOffset, 0]}>
        <primitive object={object} />
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

function Desk({ roomIndex, x, y, slot, owner, dim, highlight }: {
  roomIndex: number;
  x: number;
  y: number;
  slot: number;
  owner?: OfficeDeskOwner;
  dim: boolean;
  highlight: boolean;
}) {
  const layout = useOfficeLayout();
  const spot = localToRoom(roomIndex, layout, x, y);
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, 0.72, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.08, 0.8]} />
        <meshStandardMaterial color={dim ? "#333b4b" : highlight ? "#5a6f9c" : "#46516a"} roughness={0.7} />
      </mesh>
      {[-0.68, 0.68].map((dx) => (
        <mesh key={dx} position={[dx, 0.35, 0]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.7]} />
          <meshStandardMaterial color={dim ? "#222936" : "#2c3446"} />
        </mesh>
      ))}
      <group position={[0, 0.76, -0.12]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.68, 0.42, 0.05]} />
          <meshStandardMaterial color={dim ? "#151b28" : "#101827"} />
        </mesh>
        <mesh position={[0, 0.35, 0.031]}>
          <planeGeometry args={[0.58, 0.32]} />
          <meshStandardMaterial color={dim ? "#31566b" : "#1e6f8c"} emissive={dim ? "#31566b" : "#1e6f8c"} emissiveIntensity={dim ? 0.15 : highlight ? 1.1 : 0.55} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.12, 0.16, 0.08]} />
          <meshStandardMaterial color={dim ? "#1f2633" : "#283248"} />
        </mesh>
      </group>
      <mesh position={[0, 0.78, 0.24]}>
        <boxGeometry args={[0.56, 0.02, 0.18]} />
        <meshStandardMaterial color={dim ? "#202736" : "#2a3448"} />
      </mesh>
      <mesh position={[0.55, 0.78, 0.2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.11, 12]} />
        <meshStandardMaterial color={dim ? "#8b6b4d" : "#e6a15a"} />
      </mesh>
      <mesh position={[0, 0.28, 0.85]} castShadow>
        <boxGeometry args={[0.52, 0.08, 0.5]} />
        <meshStandardMaterial color={dim ? "#1d2431" : "#252d40"} />
      </mesh>
      <mesh position={[0, 0.58, 1.06]} castShadow>
        <boxGeometry args={[0.52, 0.58, 0.08]} />
        <meshStandardMaterial color={dim ? "#242b3a" : "#303a52"} />
      </mesh>
      {owner && (
        <Html
          position={[slot % 2 === 1 ? 1.6 : 0, 1.06 + (slot % 2) * 0.32, 0.42]}
          center
          distanceFactor={30}
          zIndexRange={[30, 5]}
          calculatePosition={clampBubblePosition}
          style={{ pointerEvents: "none" }}
        >
          <span
            className={dim ? "office-3d-nameplate office-3d-nameplate-dim" : highlight ? "office-3d-nameplate office-3d-nameplate-active" : "office-3d-nameplate"}
          >
            <i style={{ background: owner.avatarColor }} aria-hidden="true" />
            {owner.shortName}
          </span>
        </Html>
      )}
    </group>
  );
}

function CoffeeMachine({ roomIndex, x, y, dim }: { roomIndex: number; x: number; y: number; dim: boolean }) {
  const layout = useOfficeLayout();
  const spot = localToRoom(roomIndex, layout, x, y);
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.1, 0.9, 0.6]} />
        <meshStandardMaterial color={dim ? "#283040" : "#344156"} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.45, 0.31]}>
        <boxGeometry args={[0.62, 0.42, 0.04]} />
        <meshStandardMaterial color={dim ? "#101622" : "#111a2b"} emissive={dim ? "#244457" : "#1d5c79"} emissiveIntensity={dim ? 0.2 : 0.55} />
      </mesh>
      <mesh position={[0, 0.22, 0.34]}>
        <boxGeometry args={[0.3, 0.16, 0.06]} />
        <meshStandardMaterial color={dim ? "#8a6346" : "#c88452"} />
      </mesh>
      <mesh position={[0, 0.93, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.7]} />
        <meshStandardMaterial color={dim ? "#343d4f" : "#4b5870"} />
      </mesh>
      {!dim && <pointLight position={[0, 1.2, 0]} color="#7dd3fc" intensity={0.55} distance={2} />}
    </group>
  );
}

function CoffeeCup({ position, dim }: { position: [number, number, number]; dim: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.015, 14]} />
        <meshStandardMaterial color={dim ? "#3d4657" : "#dce6f2"} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.085, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.065, 0.13, 14]} />
        <meshStandardMaterial color={dim ? "#6d5745" : "#f5f1e8"} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.153, 0]}>
        <cylinderGeometry args={[0.064, 0.064, 0.008, 14]} />
        <meshStandardMaterial color={dim ? "#4b382d" : "#7b4a2d"} />
      </mesh>
      <mesh position={[0.088, 0.085, 0]}>
        <torusGeometry args={[0.032, 0.011, 8, 12]} />
        <meshStandardMaterial color={dim ? "#6d5745" : "#f5f1e8"} roughness={0.42} />
      </mesh>
    </group>
  );
}

function CoffeeTable({ roomIndex, x, y, dim }: { roomIndex: number; x: number; y: number; dim: boolean }) {
  const layout = useOfficeLayout();
  const spot = localToRoom(roomIndex, layout, x, y);
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, 0.64, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.08, 0.85]} />
        <meshStandardMaterial color={dim ? "#4b4038" : "#8a6a4e"} roughness={0.66} />
      </mesh>
      {[-0.62, 0.62].flatMap((dx) => [-0.32, 0.32].map((dz) => (
        <mesh key={`${dx}-${dz}`} position={[dx, 0.32, dz]} castShadow>
          <boxGeometry args={[0.07, 0.64, 0.07]} />
          <meshStandardMaterial color={dim ? "#272d39" : "#4d3c2d"} />
        </mesh>
      )))}
      <CoffeeCup position={[-0.32, 0.68, -0.12]} dim={dim} />
      <CoffeeCup position={[0.34, 0.68, 0.14]} dim={dim} />
      {[-1.05, 1.05].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.42, 0.08, 0.42]} />
            <meshStandardMaterial color={dim ? "#262d3c" : "#35415a"} />
          </mesh>
          <mesh position={[dx > 0 ? 0.19 : -0.19, 0.72, 0]} castShadow>
            <boxGeometry args={[0.08, 0.5, 0.42]} />
            <meshStandardMaterial color={dim ? "#2b3343" : "#3d4a64"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ConferenceTable({ roomIndex, x, y, dim }: { roomIndex: number; x: number; y: number; dim: boolean }) {
  const layout = useOfficeLayout();
  const spot = localToRoom(roomIndex, layout, x, y);
  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.1, 1.2]} />
        <meshStandardMaterial color={dim ? "#4d4039" : "#6c513c"} roughness={0.6} />
      </mesh>
      {[-1.35, 1.35].flatMap((dx) => [-0.42, 0.42].map((dz) => (
        <mesh key={`${dx}-${dz}`} position={[dx, 0.35, dz]} castShadow>
          <boxGeometry args={[0.1, 0.7, 0.1]} />
          <meshStandardMaterial color={dim ? "#232936" : "#2b3346"} />
        </mesh>
      )))}
      {[-1, 0, 1].flatMap((dx) => [-1, 1].map((side) => (
        <group key={`${dx}-${side}`} position={[dx, 0, side * 1.02]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.44, 0.09, 0.44]} />
            <meshStandardMaterial color={dim ? "#262d3c" : "#333e56"} />
          </mesh>
          <mesh position={[0, 0.72, side * 0.2]} castShadow>
            <boxGeometry args={[0.44, 0.5, 0.08]} />
            <meshStandardMaterial color={dim ? "#2b3343" : "#3b4760"} />
          </mesh>
        </group>
      )))}
      <mesh position={[0, 0.805, 0]} rotation={[-PI / 2, 0, 0]}>
        <planeGeometry args={[1.05, 0.5]} />
        <meshStandardMaterial color={dim ? "#34445a" : "#d7e5f0"} roughness={0.8} />
      </mesh>
      {!dim && <pointLight position={[0, 1.3, 0]} color="#ffd8a8" intensity={0.6} distance={2.4} />}
    </group>
  );
}

/** TV dipasang di dinding kanan Ruang Meeting yang tidak punya pintu. */
function MeetingTV({ dim }: { dim: boolean }) {
  const screen = dim ? "#203a4d" : "#0f6f8c";
  return (
    <group position={[ROOM_GEOMETRY.width / 2 - 0.08, 1.7, 0]}>
      <mesh>
        <boxGeometry args={[0.1, 1, 1.85]} />
        <meshStandardMaterial color={dim ? "#1b2433" : "#111b2c"} metalness={0.35} roughness={0.5} />
      </mesh>
      <mesh rotation={[0, -PI / 2, 0]} position={[-0.056, 0, 0]}>
        <planeGeometry args={[1.7, 0.86]} />
        <meshStandardMaterial color={screen} emissive={screen} emissiveIntensity={dim ? 0.12 : 0.85} />
      </mesh>
      {[0, 1, 2].map((row) => (
        <mesh key={row} rotation={[0, -PI / 2, 0]} position={[-0.063, 0.23 - row * 0.22, -0.28]}>
          <planeGeometry args={[0.9 - row * 0.14, 0.05]} />
          <meshBasicMaterial color={dim ? "#3c5465" : "#d7f4ff"} transparent opacity={dim ? 0.32 : 0.9} />
        </mesh>
      ))}
      <Html
        position={[-0.18, 0.62, 0]}
        center
        distanceFactor={22}
        zIndexRange={[25, 5]}
        calculatePosition={clampBubblePosition}
        style={{ pointerEvents: "none" }}
      >
        <span className={dim ? "office-3d-tv-label office-3d-tv-label-dim" : "office-3d-tv-label"}>AGENDA RAPAT</span>
      </Html>
    </group>
  );
}

/** Dinding dipecah sesuai pintu: kerja membuka ke depan, kopi/meeting ke belakang dan samping. */
function OfficeRoomShell({ room, index, active, deskOwners, selectedId, hoveredId }: {
  room: OfficeRoom;
  index: number;
  active: boolean;
  deskOwners: OfficeDeskOwner[];
  selectedId: string | null;
  hoveredId: string | null;
}) {
  const layout = useOfficeLayout();
  const origin = roomOrigin(index, layout);
  const dim = !active;
  const doorWidth = 2.4;
  const sideX = (ROOM_GEOMETRY.width - doorWidth) / 2;
  const sideZ = (ROOM_GEOMETRY.depth - doorWidth) / 2;
  const frontDoor = room.kind === "work";
  const backDoor = room.kind === "coffee" || room.kind === "meeting";
  const rightDoor = room.kind === "coffee";
  const leftDoor = room.kind === "meeting";

  return (
    <group position={[origin.x, 0, origin.z]}>
      <mesh rotation={[-PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[ROOM_GEOMETRY.width, ROOM_GEOMETRY.depth]} />
        <meshStandardMaterial color={dim ? "#252c3b" : "#3b4860"} roughness={0.92} />
      </mesh>
      <gridHelper args={[ROOM_GEOMETRY.width, 8, dim ? "#313a4b" : "#4d5d7a", dim ? "#2b3342" : "#414f69"]} position={[0, 0.006, 0]} />

      {/* Dinding sengaja rendah supaya aktivitas tetap terlihat dari kamera. */}
      {backDoor ? [-1, 1].map((side) => (
        <mesh key={`back-${side}`} position={[side * (doorWidth / 2 + sideX / 2), 1.2, -ROOM_GEOMETRY.depth / 2]} receiveShadow>
          <boxGeometry args={[sideX, 2.4, 0.12]} />
          <meshStandardMaterial color={dim ? "#182030" : "#243450"} roughness={0.9} />
        </mesh>
      )) : (
        <mesh position={[0, 1.2, -ROOM_GEOMETRY.depth / 2]} receiveShadow>
          <boxGeometry args={[ROOM_GEOMETRY.width, 2.4, 0.12]} />
          <meshStandardMaterial color={dim ? "#182030" : "#243450"} roughness={0.9} />
        </mesh>
      )}
      {frontDoor ? [-1, 1].map((side) => (
        <mesh key={`front-${side}`} position={[side * (doorWidth / 2 + sideX / 2), 0.5, ROOM_GEOMETRY.depth / 2]} receiveShadow>
          <boxGeometry args={[sideX, 1, 0.12]} />
          <meshStandardMaterial color={dim ? "#1b2433" : "#2b3a56"} transparent opacity={0.72} />
        </mesh>
      )) : (
        <mesh position={[0, 0.5, ROOM_GEOMETRY.depth / 2]} receiveShadow>
          <boxGeometry args={[ROOM_GEOMETRY.width, 1, 0.12]} />
          <meshStandardMaterial color={dim ? "#1b2433" : "#2b3a56"} transparent opacity={0.72} />
        </mesh>
      )}
      {([-1, 1] as const).map((side) => {
        const hasDoor = (side === 1 && rightDoor) || (side === -1 && leftDoor);
        return hasDoor ? [-1, 1].map((end) => (
          <mesh key={`side-${side}-${end}`} position={[(side * ROOM_GEOMETRY.width) / 2, 0.75, end * (doorWidth / 2 + sideZ / 2)]} receiveShadow>
            <boxGeometry args={[0.12, 1.5, sideZ]} />
            <meshStandardMaterial color={dim ? "#1b2433" : "#2b3a56"} transparent opacity={0.78} />
          </mesh>
        )) : (
          <mesh key={`side-${side}`} position={[(side * ROOM_GEOMETRY.width) / 2, 0.75, 0]} receiveShadow>
            <boxGeometry args={[0.12, 1.5, ROOM_GEOMETRY.depth]} />
            <meshStandardMaterial color={dim ? "#1b2433" : "#2b3a56"} transparent opacity={0.78} />
          </mesh>
        );
      })}
      {(frontDoor || backDoor) && [-1, 1].map((side) => (
        <mesh key={`post-${side}`} position={[side * doorWidth / 2, 1.1, frontDoor ? ROOM_GEOMETRY.depth / 2 : -ROOM_GEOMETRY.depth / 2]} castShadow>
          <boxGeometry args={[0.1, 2.2, 0.12]} />
          <meshStandardMaterial color={dim ? "#394355" : "#8fa6c2"} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      <Html position={[0, 2.66, frontDoor ? ROOM_GEOMETRY.depth / 2 + 0.06 : -ROOM_GEOMETRY.depth / 2 - 0.06]} center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <span
          className={dim ? "office-3d-room-sign office-3d-room-sign-dim" : "office-3d-room-sign"}
          style={{ borderColor: room.color, boxShadow: `0 4px 18px ${room.color}55` }}
        >
          {room.label}
        </span>
      </Html>

      {room.kind === "work" && ROOM_DESK_SPOTS.map((spot, slot) => {
        const owner = deskOwners.find((item) => item.roomIndex === index && item.slot === slot);
        return (
          <Desk
            key={slot}
            roomIndex={index}
            x={spot.x}
            y={spot.y}
            slot={slot}
            owner={owner}
            dim={dim}
            highlight={Boolean(owner && (selectedId === owner.id || hoveredId === owner.id))}
          />
        );
      })}
      {room.kind === "coffee" && (
        <>
          <CoffeeMachine roomIndex={index} x={50} y={18} dim={dim} />
          <CoffeeTable roomIndex={index} x={26} y={62} dim={dim} />
          <CoffeeTable roomIndex={index} x={74} y={62} dim={dim} />
        </>
      )}
      {room.kind === "meeting" && (
        <>
          <ConferenceTable roomIndex={index} x={50} y={34} dim={dim} />
          <MeetingTV dim={dim} />
        </>
      )}
    </group>
  );
}

/** Marka jalan memakai instancing supaya puluhan garis tidak jadi puluhan draw call. */
function LaneDashes({ bounds, orientation }: { bounds: StreetBounds; orientation: "x" | "z" }) {
  const marks = useMemo(() => {
    const result: Array<[number, number]> = [];
    if (orientation === "x") {
      [bounds.north, bounds.south].forEach((z) => {
        for (let x = bounds.west + 2; x <= bounds.east - 2; x += 3) {
          if (Math.abs(x - bounds.west) < 2.6 || Math.abs(x - bounds.east) < 2.6) continue;
          result.push([x, z]);
        }
      });
    } else {
      [bounds.west, bounds.east].forEach((x) => {
        for (let z = bounds.north + 2; z <= bounds.south - 2; z += 3) {
          if (Math.abs(z - bounds.north) < 2.6 || Math.abs(z - bounds.south) < 2.6) continue;
          result.push([x, z]);
        }
      });
    }
    return result;
  }, [bounds]);

  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    marks.forEach(([x, z], index) => {
      dummy.position.set(x, 0.014, z);
      dummy.rotation.set(-PI / 2, 0, 0);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(index, dummy.matrix);
    });
    if (ref.current) {
      ref.current.count = marks.length;
      ref.current.instanceMatrix.needsUpdate = true;
    }
  }, [marks]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(marks.length, 1)]}>
      {orientation === "x" ? <planeGeometry args={[1.3, 0.1]} /> : <planeGeometry args={[0.1, 1.3]} />}
      <meshBasicMaterial color="#dedcc6" transparent opacity={0.62} />
    </instancedMesh>
  );
}

function Crosswalk({ x, z }: { x: number; z: number }) {
  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} rotation={[-PI / 2, 0, 0]} position={[x + (index - 3) * 0.55, 0.016, z]}>
          <planeGeometry args={[0.32, 4.8]} />
          <meshBasicMaterial color="#e7e6dc" transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function Building({ position, size, color, rotationY = 0 }: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotationY?: number;
}) {
  const [width, height, depth] = size;
  const columns = Math.max(2, Math.floor(width / 1.8));
  const rows = Math.max(1, Math.floor(height / 2.4));
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, column) => {
          const lit = (row + column) % 3 !== 0;
          return (
            <mesh key={`${row}-${column}`} position={[(column - (columns - 1) / 2) * 1.5, 1.2 + row * 2.2, depth / 2 + 0.012]}>
              <planeGeometry args={[0.62, 0.85]} />
              <meshStandardMaterial
                color={lit ? "#ffdca8" : "#223146"}
                emissive={lit ? "#ffc978" : "#101b2c"}
                emissiveIntensity={lit ? 0.7 : 0.25}
              />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.11, 1.1, 8]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <sphereGeometry args={[0.55, 10, 8]} />
        <meshStandardMaterial color="#3f6b52" roughness={0.9} />
      </mesh>
      <mesh position={[0.32, 1.08, 0.12]} castShadow>
        <sphereGeometry args={[0.36, 10, 8]} />
        <meshStandardMaterial color="#4a7a5d" roughness={0.9} />
      </mesh>
    </group>
  );
}

function StreetLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 3.2, 8]} />
        <meshStandardMaterial color="#5c6779" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh position={[0.28, 3.15, 0]}>
        <boxGeometry args={[0.6, 0.06, 0.06]} />
        <meshStandardMaterial color="#5c6779" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh position={[0.55, 3.05, 0]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color="#ffe6b0" emissive="#ffd28a" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

function spread(min: number, max: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => min + ((index + 0.5) / count) * (max - min));
}

/** Jalan, trotoar, bangkitan kota, dan perlengkapan jalan di luar empat ruangan. */
function Street({ layout }: { layout: OfficeLayoutName }) {
  const bounds = useMemo(() => streetBounds(layout), [layout]);
  const horizontalRoads = [bounds.north, bounds.south];
  const verticalRoads = [bounds.west, bounds.east];
  const northXs = spread(bounds.west + 3, bounds.east - 3, 4);
  const lampXs = spread(bounds.west + 4, bounds.east - 4, 5);
  const sideZs = spread(bounds.north + 3, bounds.south - 3, 3);
  const buildingColors = ["#344359", "#3c4b60", "#2f3d52", "#39485e"];

  return (
    <group>
      <mesh rotation={[-PI / 2, 0, 0]} position={[(bounds.west + bounds.east) / 2, -0.06, (bounds.north + bounds.south) / 2]} receiveShadow>
        <planeGeometry args={[bounds.east - bounds.west + 18, bounds.south - bounds.north + 18]} />
        <meshStandardMaterial color="#3a414b" roughness={1} />
      </mesh>

      {horizontalRoads.map((z) => (
        <mesh key={`road-z-${z}`} rotation={[-PI / 2, 0, 0]} position={[(bounds.west + bounds.east) / 2, 0.002, z]} receiveShadow>
          <planeGeometry args={[bounds.east - bounds.west + 12, 5]} />
          <meshStandardMaterial color="#20252d" roughness={0.96} />
        </mesh>
      ))}
      {verticalRoads.map((x) => (
        <mesh key={`road-x-${x}`} rotation={[-PI / 2, 0, 0]} position={[x, 0.003, (bounds.north + bounds.south) / 2]} receiveShadow>
          <planeGeometry args={[5, bounds.south - bounds.north + 12]} />
          <meshStandardMaterial color="#20252d" roughness={0.96} />
        </mesh>
      ))}

      <LaneDashes bounds={bounds} orientation="x" />
      <LaneDashes bounds={bounds} orientation="z" />
      {horizontalRoads.flatMap((z) => verticalRoads.map((x) => <Crosswalk key={`cross-${x}-${z}`} x={x} z={z} />))}

      {/* Trotoar mengelilingi gedung kantor dan memisahkan ruangan dari jalan. */}
      <mesh rotation={[-PI / 2, 0, 0]} position={[0, 0.008, bounds.south - 2.9]} receiveShadow>
        <planeGeometry args={[bounds.grid.width + 2, 1.5]} />
        <meshStandardMaterial color="#69707b" roughness={0.95} />
      </mesh>
      <mesh rotation={[-PI / 2, 0, 0]} position={[0, 0.008, bounds.north + 2.9]} receiveShadow>
        <planeGeometry args={[bounds.grid.width + 2, 1.5]} />
        <meshStandardMaterial color="#69707b" roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`walk-${side}`} rotation={[-PI / 2, 0, 0]} position={[side * (bounds.grid.width / 2 + 1.3), 0.008, 0]} receiveShadow>
          <planeGeometry args={[1.6, bounds.grid.depth + 2]} />
          <meshStandardMaterial color="#69707b" roughness={0.95} />
        </mesh>
      ))}

      {northXs.map((x, index) => (
        <Building key={`north-${index}`} position={[x, 0, bounds.north - 11]} size={[7 + (index % 2) * 2, 7 + ((index * 3) % 5), 7]} color={buildingColors[index % buildingColors.length]} />
      ))}
      {northXs.map((x, index) => (
        <Building key={`south-${index}`} position={[x, 0, bounds.south + 11]} size={[7 + ((index + 1) % 2) * 2, 8 + ((index * 2) % 4), 7]} color={buildingColors[(index + 1) % buildingColors.length]} rotationY={PI} />
      ))}
      {sideZs.map((z, index) => (
        <Building key={`west-${index}`} position={[bounds.west - 11, 0, z]} size={[8, 7 + index * 2, 8]} color={buildingColors[(index + 2) % buildingColors.length]} rotationY={PI / 2} />
      ))}
      {sideZs.map((z, index) => (
        <Building key={`east-${index}`} position={[bounds.east + 11, 0, z]} size={[8, 9 - index, 8]} color={buildingColors[(index + 3) % buildingColors.length]} rotationY={-PI / 2} />
      ))}

      {lampXs.map((x) => <StreetLamp key={`lamp-n-${x}`} x={x} z={bounds.north + 2.4} />)}
      {lampXs.map((x) => <StreetLamp key={`lamp-s-${x}`} x={x} z={bounds.south - 2.4} />)}
      {spread(bounds.west + 4, bounds.east - 4, 5).map((x) => <Tree key={`tree-s-${x}`} x={x} z={bounds.south - 4.4} scale={0.9} />)}
      {spread(bounds.west + 4, bounds.east - 4, 5).map((x) => <Tree key={`tree-n-${x}`} x={x} z={bounds.north + 4.4} scale={0.8} />)}
    </group>
  );
}

function Car({ route, frozen }: { route: CarRoute; frozen: boolean }) {
  const root = useRef<THREE.Group>(null);
  const wheels = useRef<Array<THREE.Group | null>>([]);
  const distance = useRef(route.start);
  const initial = sampleLoop(route.path, route.start);
  const initialHeading = initial.heading + (route.speed < 0 ? PI : 0);

  useFrame((_, delta) => {
    if (!root.current || frozen) return;
    const dt = Math.min(delta, 0.05);
    const travelled = route.speed * dt;
    distance.current += travelled;
    const point = sampleLoop(route.path, distance.current);
    root.current.position.set(point.x, 0, point.z);
    root.current.rotation.y = angleTowards(
      root.current.rotation.y,
      point.heading + (route.speed < 0 ? PI : 0),
      dt * 5,
    );
    const spin = travelled / 0.23;
    wheels.current.forEach((wheel) => { if (wheel) wheel.rotation.x += spin; });
  });

  return (
    <group ref={root} position={[initial.x, 0, initial.z]} rotation={[0, initialHeading, 0]}>
      <mesh position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[1.35, 0.42, 2.5]} />
        <meshStandardMaterial color={route.color} metalness={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.79, -0.08]} castShadow>
        <boxGeometry args={[1.12, 0.42, 1.3]} />
        <meshStandardMaterial color="#243044" metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.81, 0.59]}>
        <planeGeometry args={[0.96, 0.3]} />
        <meshStandardMaterial color="#8fb8cf" metalness={0.4} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.81, -0.75]} rotation={[0, PI, 0]}>
        <planeGeometry args={[0.96, 0.3]} />
        <meshStandardMaterial color="#8fb8cf" metalness={0.4} roughness={0.2} />
      </mesh>
      {[-0.48, 0.48].map((x) => (
        <mesh key={`head-${x}`} position={[x, 0.46, 1.27]}>
          <boxGeometry args={[0.26, 0.13, 0.05]} />
          <meshStandardMaterial color="#fff4cf" emissive="#ffe6a3" emissiveIntensity={1.7} />
        </mesh>
      ))}
      {[-0.48, 0.48].map((x) => (
        <mesh key={`tail-${x}`} position={[x, 0.46, -1.27]}>
          <boxGeometry args={[0.24, 0.12, 0.05]} />
          <meshStandardMaterial color="#c9433c" emissive="#b52d28" emissiveIntensity={1.1} />
        </mesh>
      ))}
      {([-0.72, 0.72] as const).flatMap((x) =>
        ([-0.82, 0.82] as const).map((z, side) => (
          <group
            key={`wheel-${x}-${z}`}
            ref={(element) => { wheels.current[side + (x > 0 ? 2 : 0)] = element; }}
            position={[x, 0.23, z]}
          >
            <mesh rotation={[0, 0, PI / 2]} castShadow>
              <cylinderGeometry args={[0.23, 0.23, 0.14, 16]} />
              <meshStandardMaterial color="#151922" roughness={0.9} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

function StreetPedestrian({ route, frozen }: { route: PedestrianRoute; frozen: boolean }) {
  const { object, scale, floorOffset, phase, walk } = useWalkingFigure(route.modelIndex, false);
  const root = useRef<THREE.Group>(null);
  const distance = useRef(route.start);
  const initial = sampleLoop(route.path, route.start);
  const initialHeading = initial.heading + (route.speed < 0 ? PI : 0);

  useEffect(() => {
    if (frozen) walk.current.value = 0;
  }, [frozen, walk]);

  useFrame((_, delta) => {
    if (!root.current || frozen) return;
    const dt = Math.min(delta, 0.05);
    const travelled = Math.abs(route.speed) * dt;
    distance.current += route.speed * dt;
    const point = sampleLoop(route.path, distance.current);
    root.current.position.set(point.x, 0, point.z);
    root.current.rotation.y = angleTowards(
      root.current.rotation.y,
      point.heading + (route.speed < 0 ? PI : 0),
      dt * 6,
    );
    phase.current.value += travelled * 6.1;
    walk.current.value = Math.min(1, walk.current.value + dt * 6);
  });

  return (
    <group ref={root} position={[initial.x, 0, initial.z]} rotation={[0, initialHeading, 0]}>
      <group scale={scale} position={[0, floorOffset, 0]}>
        <primitive object={object} />
      </group>
    </group>
  );
}

function CameraRig() {
  const layout = useOfficeLayout();
  const { camera, size, controls } = useThree();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const grid = gridFor(layout);
    const aspect = Math.max(0.55, size.width / Math.max(1, size.height));
    const fitHeight = Math.max(grid.depth + ROOM_GEOMETRY.depth * 1.4, (grid.width + ROOM_GEOMETRY.width) / aspect);
    const distance = fitHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    camera.position.set(0, distance * 0.78, distance * 0.62);
    camera.lookAt(0, 0.6, 0);
    camera.updateProjectionMatrix();

    const orbit = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null;
    if (orbit?.target) {
      orbit.target.set(0, 0.6, 0);
      orbit.update?.();
    }
  }, [camera, controls, layout, size.width, size.height]);

  return null;
}

interface SceneProps {
  employees: OfficeEmployee[];
  deskOwners: OfficeDeskOwner[];
  movements: OfficeMovement[];
  messages: Map<string, string>;
  frozen: boolean;
  focusRoomIndex: number | null;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function Scene({ employees, deskOwners, movements, messages, frozen, focusRoomIndex, selectedId, hoveredId, onSelect, onHover }: SceneProps) {
  const layout = useOfficeLayout();
  const carRoutes = useMemo(() => carRoutesFor(layout), [layout]);
  const pedestrianRoutes = useMemo(() => pedestrianRoutesFor(layout), [layout]);

  return (
    <>
      <color attach="background" args={["#1b2942"]} />
      <fog attach="fog" args={["#1b2942", 42, 120]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#b9d4ff", "#39435b", 0.7]} />
      <directionalLight
        position={[12, 28, 18]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-58}
        shadow-camera-right={58}
        shadow-camera-top={58}
        shadow-camera-bottom={-58}
      />
      <CameraRig />
      <Street layout={layout} />
      {OFFICE_ROOMS.map((room, index) => (
        <OfficeRoomShell
          key={room.name}
          room={room}
          index={index}
          active={room.kind !== "work" || focusRoomIndex === null || focusRoomIndex === index}
          deskOwners={deskOwners}
          selectedId={selectedId}
          hoveredId={hoveredId}
        />
      ))}
      {carRoutes.map((route) => <Car key={route.id} route={route} frozen={frozen} />)}
      {pedestrianRoutes.map((route) => <StreetPedestrian key={route.id} route={route} frozen={frozen} />)}
      {employees.map((employee, index) => (
        <Worker
          key={employee.id}
          employee={employee}
          index={index}
          movement={movements[index]}
          message={messages.get(employee.id)}
          frozen={frozen}
          dim={focusRoomIndex !== null && focusRoomIndex !== movements[index].homeRoomIndex}
          selected={selectedId === employee.id || hoveredId === employee.id}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <OrbitControls
        makeDefault
        target={[0, 0.6, 0]}
        enablePan={false}
        minDistance={10}
        maxDistance={110}
        minPolarAngle={0.3}
        maxPolarAngle={PI / 2.08}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

export function OfficeScene3D(props: SceneProps) {
  useEffect(() => {
    OFFICE_MODELS.forEach((asset) => useGLTF.preload(asset.file));
  }, []);

  return (
    <div className="office-scene-3d" role="img" aria-label="Simulasi kota 3D: dua ruang kerja dengan meja berlabel nama karyawan, Ruang Kopi dengan mesin dan meja kopi, serta Ruang Meeting dengan meja konferensi dan TV agenda. Karyawan berjalan lewat koridor antar ruangan; di luar ada jalan dengan mobil dan pejalan kaki. Ini bukan pemantauan karyawan nyata.">
      <Canvas
        shadows
        dpr={[1, 1.4]}
        camera={{ position: [0, 42, 32], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
      <div className="office-3d-legend">Simulasi visual · meja berlabel · kopi &amp; meeting · mobil &amp; pejalan kaki bergerak · bukan pelacakan karyawan</div>
      <div className="office-3d-hint" aria-hidden="true">Geser untuk memutar · scroll untuk zoom</div>
    </div>
  );
}
