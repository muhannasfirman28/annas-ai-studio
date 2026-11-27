import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COFFEE_ROOM_INDEX,
  MEETING_ROOM_INDEX,
  OFFICE_ROOMS,
  ROOM_DESK_SPOTS,
  ROOM_GEOMETRY,
  activityFor,
  deskOwnersFor,
  gridFor,
  localToRoom,
  movementFor,
  movementsFor,
  officeChat,
  officeChatFeed,
  roomIndexFor,
  roomOrigin,
  spotCorridor,
  spotLocal,
  spotToWorld,
  type OfficeEmployee,
  type OfficeSpot,
} from "./office-types";

const person = (availability: string): OfficeEmployee => ({
  id: "1",
  name: "Contoh Orang",
  title: "Staf",
  avatarColor: "#2563eb",
  availability,
});

const team = (): OfficeEmployee[] => [
  { ...person("AVAILABLE"), id: "a", name: "Annas Founder" },
  { ...person("BUSY"), id: "b", name: "Arjun Executive" },
  { ...person("AVAILABLE"), id: "c", name: "Meilin Designer" },
  { ...person("OFFLINE"), id: "d", name: "Wei Offline" },
];

const SEED_DEPARTMENTS = [
  "Executive",
  "Technology",
  "Operations",
  "Software Development",
  "Creative & Design",
  "Artificial Intelligence",
  "Data & Analytics",
  "Quality Assurance & Security",
];

const seededTeam = (): OfficeEmployee[] => SEED_DEPARTMENTS.map((department, index) => ({
  ...person(index === 7 ? "OFFLINE" : "AVAILABLE"),
  id: `seed-${index}`,
  department: { name: department },
}));

test("karyawan tersedia bergantian mengetik dan membaca", () => {
  assert.equal(activityFor(person("AVAILABLE"), 0), "typing");
  assert.equal(activityFor(person("AVAILABLE"), 1), "reading");
  assert.equal(activityFor(person("AVAILABLE"), 2), "typing");
});

test("status asli menentukan mode gerakan simulasi", () => {
  assert.equal(activityFor(person("BUSY"), 0), "focus");
  assert.equal(activityFor(person("AWAY"), 2), "walking");
  assert.equal(activityFor(person("OFFLINE"), 1), "offline");
});

test("obrolan dibuat dari pasangan karyawan aktif saja", () => {
  const chat = officeChat(team(), 0);
  assert.equal(chat.length, 1);
  assert.equal(chat[0].speakerId, "a");
  assert.equal(chat[0].speakerName, "Annas");
  assert.ok(chat[0].text.length > 0);
  assert.ok(chat[0].emoji.length > 0);
});

test("giliran pembicara berganti tiap putaran", () => {
  const people = team();
  assert.equal(officeChat(people, 0)[0].speakerId, "a");
  assert.equal(officeChat(people, 1)[0].speakerId, "b");
});

test("feed obrolan berisi beberapa putaran dan dibatasi", () => {
  const feed = officeChatFeed(team(), 3);
  assert.equal(feed.length, 4);
  assert.equal(feed[0].id, "a:0:0");
  assert.equal(feed[3].id, "b:3:0");
});

test("tanpa pasangan aktif tidak ada obrolan", () => {
  assert.deepEqual(officeChat([person("OFFLINE")], 0), []);
  assert.deepEqual(officeChat([], 0), []);
});

test("empat ruangan terdiri dari dua ruang kerja, kopi, dan meeting", () => {
  assert.equal(OFFICE_ROOMS.length, 4);
  assert.deepEqual(OFFICE_ROOMS.map((room) => room.kind), ["work", "work", "coffee", "meeting"]);
  assert.deepEqual(OFFICE_ROOMS[0].departments, SEED_DEPARTMENTS.slice(0, 4));
  assert.deepEqual(OFFICE_ROOMS[1].departments, SEED_DEPARTMENTS.slice(4));
  assert.deepEqual(OFFICE_ROOMS[2].departments, []);
  assert.deepEqual(OFFICE_ROOMS[3].departments, []);
  assert.equal(new Set(SEED_DEPARTMENTS).size, 8);
});

test("grid selalu 2×2 di desktop dan mobile", () => {
  for (const layout of ["wide", "tall"] as const) {
    const grid = gridFor(layout);
    assert.deepEqual([grid.columns, grid.rows], [2, 2]);
    assert.equal(grid.origins.length, 4);
    assert.ok(grid.width > grid.depth);
  }
  assert.deepEqual(roomOrigin(0, "wide"), { x: -(ROOM_GEOMETRY.width + ROOM_GEOMETRY.gap) / 2, z: -(ROOM_GEOMETRY.depth + ROOM_GEOMETRY.gap) / 2 });
});

test("urutan seed terbagi 4+4 ke dua ruang kerja", () => {
  SEED_DEPARTMENTS.forEach((department, index) => {
    assert.equal(roomIndexFor(department), index < 4 ? 0 : 1, department);
  });

  const plan = movementsFor(seededTeam(), 0);
  assert.equal(plan.filter((item) => item.move.homeRoomIndex === 0).length, 4);
  assert.equal(plan.filter((item) => item.move.homeRoomIndex === 1).length, 4);
  assert.deepEqual(plan.filter((item) => item.move.homeRoomIndex === 0).map((item) => item.move.slot), [0, 1, 2, 3]);
  assert.deepEqual(plan.filter((item) => item.move.homeRoomIndex === 1).map((item) => item.move.slot), [0, 1, 2, 3]);
});

test("setiap meja ruang kerja dipetakan ke satu karyawan secara stabil", () => {
  const owners = deskOwnersFor(seededTeam());
  assert.equal(owners.length, 8);
  assert.deepEqual(owners.map((owner) => [owner.roomIndex, owner.slot]), [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3],
  ]);
  assert.deepEqual(owners.map((owner) => owner.name), seededTeam().map((employee) => employee.name));
  assert.equal(new Set(owners.map((owner) => `${owner.roomIndex}:${owner.slot}`)).size, 8);
  assert.equal(owners[0].avatarColor, "#2563eb");
});

test("divisi tidak dikenal tetap mendapat ruang kerja yang stabil", () => {
  const first = roomIndexFor("Divisi Baru");
  const second = roomIndexFor("divisi baru");
  assert.ok(first === 0 || first === 1);
  assert.equal(first, second);
});

test("rute meja → Ruang Kopi → Ruang Meeting → meja lewat koridor", () => {
  const employee = { ...person("AVAILABLE"), department: { name: "Technology" } };
  const stages = Array.from({ length: 8 }, (_, tick) => movementFor(employee, 0, tick));

  assert.equal(stages[0].roomIndex, 0);
  assert.equal(stages[0].walking, false);
  assert.deepEqual(spotOf(stages[0]), spotLocal(0, ROOM_DESK_SPOTS[0].x, ROOM_DESK_SPOTS[0].y));

  assert.equal(stages[1].roomIndex, 0);
  assert.equal(stages[1].walking, true);

  assert.equal(stages[2].roomIndex, COFFEE_ROOM_INDEX);
  assert.equal(stages[2].walking, true);
  assert.ok(stages[2].via.some((spot) => spot.roomIndex === -1));
  assert.ok(stages[2].via.some((spot) => spot.x === spotLocal(COFFEE_ROOM_INDEX, 50, 4).x));

  assert.equal(stages[3].roomIndex, COFFEE_ROOM_INDEX);
  assert.equal(stages[3].activity, "drinking");
  assert.equal(stages[3].walking, false);

  assert.equal(stages[4].roomIndex, MEETING_ROOM_INDEX);
  assert.equal(stages[4].walking, true);
  assert.ok(stages[4].via.some((spot) => spot.roomIndex === -1 && spot.x === 50));

  assert.equal(stages[5].roomIndex, MEETING_ROOM_INDEX);
  assert.equal(stages[5].activity, "talking");
  assert.equal(stages[5].walking, false);

  assert.equal(stages[6].roomIndex, 0);
  assert.equal(stages[6].walking, true);
  assert.ok(stages[6].via.length >= 4);

  assert.equal(stages[7].roomIndex, 0);
  assert.equal(stages[7].walking, true);
  assert.deepEqual(spotOf(stages[7]), spotOf(stages[0]));
  assert.deepEqual(spotOf(movementFor(employee, 0, 8)), spotOf(stages[0]));
});

function spotOf(move: { roomIndex: number; x: number; y: number }): OfficeSpot {
  return { roomIndex: move.roomIndex, x: move.x, y: move.y };
}

test("setiap langkah lintas ruangan menyentuh koridor lebih dulu", () => {
  const employee = { ...person("AVAILABLE"), department: { name: "Creative & Design" } };
  for (let tick = 0; tick < 16; tick += 1) {
    const move = movementFor(employee, tick, tick, 0);
    const path = [move.from, ...move.via, spotOf(move)];
    path.forEach((spot) => {
      assert.ok(spot.x >= 0 && spot.x <= 100, `x di luar peta: ${spot.x}`);
      assert.ok(spot.y >= 0 && spot.y <= 100, `y di luar peta: ${spot.y}`);
    });
    for (let index = 0; index < path.length - 1; index += 1) {
      const from = path[index];
      const to = path[index + 1];
      assert.ok(
        from.roomIndex === to.roomIndex || from.roomIndex === -1 || to.roomIndex === -1,
        `ruangan ${from.roomIndex} ke ${to.roomIndex} tidak lewat koridor`,
      );
    }
  }
});

test("jadwal tiap karyawan di-offset agar tidak berjalan bersamaan", () => {
  const employee = person("AVAILABLE");
  assert.equal(movementFor(employee, 0, 0).walking, false);
  assert.equal(movementFor(employee, 1, 0).walking, true);
  assert.equal(movementFor(employee, 2, 0).walking, true);
  assert.equal(movementFor(employee, 3, 0).activity, "drinking");
});

test("karyawan offline tetap di meja ruang kerjanya dan tidak berjalan", () => {
  const employee = { ...person("OFFLINE"), department: { name: "Operations" } };
  for (let tick = 0; tick < 12; tick += 1) {
    const move = movementFor(employee, 5, tick);
    assert.deepEqual(spotOf(move), spotLocal(0, ROOM_DESK_SPOTS[1].x, ROOM_DESK_SPOTS[1].y));
    assert.equal(move.homeRoomIndex, 0);
    assert.equal(move.walking, false);
    assert.equal(move.activity, "offline");
    assert.equal(move.action, undefined);
  }
});

test("tik negatif tetap menghasilkan rute yang valid", () => {
  const move = movementFor(person("AVAILABLE"), 0, -1);
  assert.equal(move.walking, true);
  assert.deepEqual(spotOf(move), spotLocal(0, ROOM_DESK_SPOTS[0].x, ROOM_DESK_SPOTS[0].y));
});

test("posisi lokal dan global masih bisa dikonversi ke dunia three.js", () => {
  for (const layout of ["wide", "tall"] as const) {
    for (const roomIndex of [0, 1, COFFEE_ROOM_INDEX, MEETING_ROOM_INDEX]) {
      const local = localToRoom(roomIndex, layout, 50, 50);
      const origin = roomOrigin(roomIndex, layout);
      assert.ok(Math.abs(local.x - origin.x) < 0.001);
      assert.ok(Math.abs(local.z - origin.z) < 0.001);

      const global = spotLocal(roomIndex, 50, 50);
      const world = spotToWorld(global, layout);
      assert.ok(Math.abs(world.x - origin.x) < 0.001);
      assert.ok(Math.abs(world.z - origin.z) < 0.001);
    }
    const corridor = spotToWorld(spotCorridor(50, 50), layout);
    assert.deepEqual(corridor, { x: 0, z: 0 });
  }
});
