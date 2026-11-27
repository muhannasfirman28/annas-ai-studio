/**
 * Geometri rute untuk jalanan di luar ruangan Kantor Virtual.
 * Modul ini murni matematika 2D (sumbu X/Z three.js) supaya bisa diuji
 * tanpa WebGL. Seluruh rute adalah simulasi visual, bukan data lokasi nyata.
 */
import { gridFor, type OfficeLayoutName } from "../components/plugins/office-types";

export interface StreetPoint {
  x: number;
  z: number;
}

export interface LoopPath {
  id: string;
  points: StreetPoint[];
  /** Panjang tiap ruas, sejajar dengan `points`. */
  lengths: number[];
  /** Keliling lintasan. */
  total: number;
}

export interface LoopSample {
  x: number;
  z: number;
  /** Rotasi Y three.js untuk badan yang menghadap +Z saat `heading` = 0. */
  heading: number;
}

export function createLoop(id: string, points: StreetPoint[]): LoopPath {
  const lengths = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.hypot(next.x - point.x, next.z - point.z);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return { id, points, lengths, total: Math.max(total, 0.0001) };
}

/** Persegi panjang dengan inset positif menghasilkan laur dalam, negatif laur luar. */
export function rectangleLoop(
  id: string,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  inset = 0,
): LoopPath {
  return createLoop(id, [
    { x: minX + inset, z: minZ + inset },
    { x: maxX - inset, z: minZ + inset },
    { x: maxX - inset, z: maxZ - inset },
    { x: minX + inset, z: maxZ - inset },
  ]);
}

/** Jarak boleh negatif atau melebihi keliling; keduanya dibungkus. */
export function sampleLoop(path: LoopPath, distance: number): LoopSample {
  let remaining = distance % path.total;
  if (remaining < 0) remaining += path.total;

  for (let index = 0; index < path.points.length; index += 1) {
    const length = path.lengths[index];
    // Tepat di sudut, ruas berikutnya yang menentukan arah hadap.
    if (remaining >= length && index < path.points.length - 1) {
      remaining -= length;
      continue;
    }
    const from = path.points[index];
    const to = path.points[(index + 1) % path.points.length];
    const t = length === 0 ? 0 : Math.min(1, Math.max(0, remaining / length));
    return {
      x: from.x + (to.x - from.x) * t,
      z: from.z + (to.z - from.z) * t,
      heading: Math.atan2(to.x - from.x, to.z - from.z),
    };
  }

  const first = path.points[0];
  return { x: first.x, z: first.z, heading: 0 };
}

export interface CarRoute {
  id: string;
  path: LoopPath;
  start: number;
  /** Negatif berarti melawan arah `path`, jadi laur berlawanan. */
  speed: number;
  color: string;
}

export interface PedestrianRoute {
  id: string;
  path: LoopPath;
  start: number;
  speed: number;
  modelIndex: number;
}

export interface StreetBounds {
  layout: OfficeLayoutName;
  /** Garis tengah jalan utara, selatan, barat, dan timur. */
  north: number;
  south: number;
  west: number;
  east: number;
  grid: ReturnType<typeof gridFor>;
}

/** Jalan selalu diletakkan di luar grid 2×2 empat ruangan. */
export function streetBounds(layout: OfficeLayoutName = "wide"): StreetBounds {
  const grid = gridFor(layout);
  const marginX = 8;
  const marginZ = 7;
  return {
    layout,
    north: -grid.depth / 2 - marginZ,
    south: grid.depth / 2 + marginZ,
    west: -grid.width / 2 - marginX,
    east: grid.width / 2 + marginX,
    grid,
  };
}

const CAR_COLORS = ["#dce6ef", "#e0503f", "#2f7fc4", "#f0b544", "#344054", "#48a88a"];

/** Dua blok jalan, masing-masing dua laur arah dan tiga mobil per laur. */
export function carRoutesFor(layout: OfficeLayoutName = "wide"): CarRoute[] {
  const bounds = streetBounds(layout);
  const blocks = [
    { id: "utara", minX: bounds.west, minZ: bounds.north - 4, maxX: bounds.east, maxZ: bounds.north + 4 },
    { id: "selatan", minX: bounds.west, minZ: bounds.south - 4, maxX: bounds.east, maxZ: bounds.south + 4 },
  ] as const;

  return blocks.flatMap((block, blockIndex) =>
    [1, -1].flatMap((direction, laneIndex) => {
      const path = rectangleLoop(
        `mobil-${block.id}-${direction > 0 ? "maju" : "mundur"}`,
        block.minX,
        block.minZ,
        block.maxX,
        block.maxZ,
        direction * 1.15,
      );
      return Array.from({ length: 3 }, (_, carIndex) => ({
        id: `${path.id}-${carIndex}`,
        path,
        start: ((carIndex / 3 + blockIndex * 0.17 + laneIndex * 0.09) % 1) * path.total,
        speed: direction * (3.5 + ((carIndex + blockIndex + laneIndex) % 3) * 0.85),
        color: CAR_COLORS[(carIndex + blockIndex * 2 + laneIndex) % CAR_COLORS.length],
      }));
    }),
  );
}

/** Orang lewat di trotoar dan menyeberang di depan kantor. */
export function pedestrianRoutesFor(layout: OfficeLayoutName = "wide"): PedestrianRoute[] {
  const bounds = streetBounds(layout);
  const halfWidth = bounds.grid.width / 2;
  const halfDepth = bounds.grid.depth / 2;
  const blocks = [
    { id: "depan", minX: -halfWidth + 0.6, minZ: halfDepth + 1, maxX: halfWidth - 0.6, maxZ: bounds.south - 2.8, count: 4 },
    { id: "kiri", minX: bounds.west + 2.8, minZ: -halfDepth + 0.5, maxX: -halfWidth - 1, maxZ: halfDepth - 0.5, count: 2 },
    { id: "kanan", minX: halfWidth + 1, minZ: -halfDepth + 0.5, maxX: bounds.east - 2.8, maxZ: halfDepth - 0.5, count: 2 },
    { id: "belakang", minX: -halfWidth + 0.6, minZ: bounds.north + 2.8, maxX: halfWidth - 0.6, maxZ: -halfDepth - 1, count: 3 },
  ] as const;

  return blocks.flatMap((block, blockIndex) => {
    const path = rectangleLoop(`orang-${block.id}`, block.minX, block.minZ, block.maxX, block.maxZ);
    return Array.from({ length: block.count }, (_, index) => ({
      id: `${path.id}-${index}`,
      path,
      start: ((index / block.count + blockIndex * 0.11) % 1) * path.total,
      speed: (index % 2 === 0 ? 1 : -1) * (1.25 + ((index + blockIndex) % 3) * 0.28),
      modelIndex: (index + blockIndex * 3) % 8,
    }));
  });
}

/** Default kompatibel untuk pemakai lama; scene memakai versi per-layout. */
export const CAR_ROUTES = carRoutesFor("wide");
export const PEDESTRIAN_ROUTES = pedestrianRoutesFor("wide");
