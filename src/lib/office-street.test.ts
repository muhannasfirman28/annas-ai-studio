import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAR_ROUTES,
  PEDESTRIAN_ROUTES,
  carRoutesFor,
  createLoop,
  pedestrianRoutesFor,
  rectangleLoop,
  sampleLoop,
  streetBounds,
} from "./office-street";

test("keliling lintasan dihitung dari semua ruas", () => {
  const path = createLoop("kotak", [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 3 },
    { x: 0, z: 3 },
  ]);
  assert.equal(path.total, 14);
  assert.deepEqual(path.lengths, [4, 3, 4, 3]);
});

test("jarak negatif dan lebih dari keliling dibungkus ke titik yang sama", () => {
  const path = rectangleLoop("kotak", -2, -2, 2, 2);
  const fromStart = sampleLoop(path, 0);
  const wrapped = sampleLoop(path, path.total);
  const reversed = sampleLoop(path, -path.total);

  assert.ok(Math.abs(fromStart.x - wrapped.x) < 1e-9);
  assert.ok(Math.abs(fromStart.z - wrapped.z) < 1e-9);
  assert.ok(Math.abs(fromStart.x - reversed.x) < 1e-9);
  assert.ok(Math.abs(fromStart.z - reversed.z) < 1e-9);
});

test("sampel mengikuti arah ruas dan sudut hadap three.js", () => {
  const path = createLoop("garis", [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
    { x: 0, z: 4 },
  ]);

  const first = sampleLoop(path, 0);
  assert.equal(first.x, 0);
  assert.equal(first.z, 0);
  assert.ok(Math.abs(first.heading - Math.PI / 2) < 1e-9);

  const corner = sampleLoop(path, 4);
  assert.equal(corner.x, 4);
  assert.equal(corner.z, 0);
  assert.ok(Math.abs(corner.heading) < 1e-9);
});

test("inset menghasilkan dua laur di dalam lebar jalan", () => {
  const inner = rectangleLoop("dalam", -14, -10, 14, 8, 1.15);
  const outer = rectangleLoop("luar", -14, -10, 14, 8, -1.15);

  assert.equal(inner.points[0].x, -12.85);
  assert.equal(outer.points[0].x, -15.15);
  assert.ok(inner.points[0].x > outer.points[0].x);
});

test("setiap jalan dan trotoar punya pelaku bergerak", () => {
  assert.equal(CAR_ROUTES.length, 12);
  assert.equal(PEDESTRIAN_ROUTES.length, 11);
  assert.ok(CAR_ROUTES.every((route) => route.speed !== 0 && route.path.total > 0));
  assert.ok(PEDESTRIAN_ROUTES.every((route) => route.speed !== 0 && route.path.total > 0));
  assert.ok(CAR_ROUTES.some((route) => route.speed < 0));
  assert.ok(PEDESTRIAN_ROUTES.some((route) => route.speed < 0));
});

test("rute jalan mengikuti grid 2×2 dan tetap di luar ruangan", () => {
  for (const layout of ["wide", "tall"] as const) {
    const bounds = streetBounds(layout);
    assert.deepEqual([bounds.grid.columns, bounds.grid.rows], [2, 2]);

    const cars = carRoutesFor(layout);
    const pedestrians = pedestrianRoutesFor(layout);
    assert.equal(cars.length, 12);
    assert.equal(pedestrians.length, 11);

    [...cars, ...pedestrians].forEach((route) => {
      route.path.points.forEach((point) => {
        const outsideX = Math.abs(point.x) >= bounds.grid.width / 2;
        const outsideZ = Math.abs(point.z) >= bounds.grid.depth / 2;
        assert.ok(outsideX || outsideZ, `${route.id} masih masuk ke dalam grid ruangan`);
      });
    });
  }
});
