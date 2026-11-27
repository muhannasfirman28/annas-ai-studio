import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEPARTMENT_ROOMS,
  ROOM_COFFEE_SPOT,
  ROOM_DESK_SPOTS,
  ROOM_GEOMETRY,
  ROOM_MEETING_SPOT,
  activityFor,
  gridFor,
  localToRoom,
  movementFor,
  movementsFor,
  officeChat,
  officeChatFeed,
  roomIndexFor,
  roomOrigin,
  type OfficeEmployee,
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

test("delapan departemen punya ruangan unik dan grid 4×2 serta 2×4", () => {
  assert.equal(DEPARTMENT_ROOMS.length, 8);
  assert.equal(new Set(DEPARTMENT_ROOMS.map((room) => room.name)).size, 8);

  const wide = gridFor("wide");
  assert.deepEqual([wide.columns, wide.rows], [4, 2]);
  assert.equal(wide.origins.length, 8);
  assert.ok(wide.width > wide.depth);

  const tall = gridFor("tall");
  assert.deepEqual([tall.columns, tall.rows], [2, 4]);
  assert.equal(tall.origins.length, 8);
  assert.ok(tall.depth > tall.width);
});

test("divisi tidak dikenal tetap mendapat ruangan yang stabil", () => {
  const first = roomIndexFor("Divisi Baru");
  const second = roomIndexFor("divisi baru");
  assert.ok(first >= 0 && first < DEPARTMENT_ROOMS.length);
  assert.equal(first, second);
  assert.equal(roomIndexFor("Technology"), 1);
});

test("rute jalan berputar di dalam satu ruangan: meja → kopi → meeting → meja", () => {
  const employee = { ...person("AVAILABLE"), department: { name: "Technology" } };
  const room = roomIndexFor("Technology");
  const atDesk = movementFor(employee, 0, 0);
  const toCoffee = movementFor(employee, 0, 1);
  const drink = movementFor(employee, 0, 2);
  const toMeeting = movementFor(employee, 0, 3);
  const talk = movementFor(employee, 0, 4);
  const back = movementFor(employee, 0, 5);

  assert.deepEqual({ x: atDesk.x, y: atDesk.y }, ROOM_DESK_SPOTS[0]);
  assert.equal(atDesk.roomIndex, room);
  assert.equal(atDesk.walking, false);
  assert.equal(toCoffee.walking, true);
  assert.deepEqual({ x: toCoffee.x, y: toCoffee.y }, ROOM_COFFEE_SPOT);
  assert.equal(toCoffee.roomIndex, room);
  assert.equal(drink.activity, "drinking");
  assert.equal(drink.walking, false);
  assert.equal(toMeeting.walking, true);
  assert.deepEqual({ x: toMeeting.x, y: toMeeting.y }, ROOM_MEETING_SPOT);
  assert.equal(talk.activity, "talking");
  assert.equal(back.walking, true);
  assert.deepEqual({ x: back.x, y: back.y }, ROOM_DESK_SPOTS[0]);
  assert.equal(movementFor(employee, 0, 6).x, ROOM_DESK_SPOTS[0].x);
});

test("jadwal tiap karyawan di-offset agar tidak berjalan bersamaan", () => {
  const employee = person("AVAILABLE");
  assert.equal(movementFor(employee, 0, 0).walking, false);
  assert.equal(movementFor(employee, 1, 0).walking, true);
  assert.equal(movementFor(employee, 2, 0).activity, "drinking");
  assert.equal(movementFor(employee, 3, 0).walking, true);
});

test("karyawan offline tetap di meja ruangannya dan tidak berjalan", () => {
  const employee = { ...person("OFFLINE"), department: { name: "Operations" } };
  for (let tick = 0; tick < 12; tick += 1) {
    const move = movementFor(employee, 5, tick);
    assert.deepEqual({ x: move.x, y: move.y }, ROOM_DESK_SPOTS[5 % ROOM_DESK_SPOTS.length]);
    assert.equal(move.roomIndex, roomIndexFor("Operations"));
    assert.equal(move.walking, false);
    assert.equal(move.activity, "offline");
    assert.equal(move.action, undefined);
  }
});

test("tik negatif tetap menghasilkan rute yang valid", () => {
  const move = movementFor(person("AVAILABLE"), 0, -1);
  assert.equal(move.walking, true);
  assert.deepEqual({ x: move.x, y: move.y }, ROOM_DESK_SPOTS[0]);
});

test("karyawan satu divisi mendapat kursi berbeda di ruangan yang sama", () => {
  const people: OfficeEmployee[] = [
    { ...person("AVAILABLE"), id: "a", department: { name: "Technology" } },
    { ...person("AVAILABLE"), id: "b", department: { name: "Technology" } },
    { ...person("BUSY"), id: "c", department: { name: "Executive" } },
  ];
  const plan = movementsFor(people, 0);

  assert.equal(plan[0].move.slot, 0);
  assert.equal(plan[1].move.slot, 1);
  assert.equal(plan[0].move.roomIndex, plan[1].move.roomIndex);
  assert.notEqual(plan[0].move.roomIndex, plan[2].move.roomIndex);
  assert.deepEqual({ x: plan[0].move.x, y: plan[0].move.y }, ROOM_DESK_SPOTS[0]);
  assert.deepEqual({ x: plan[1].move.x, y: plan[1].move.y }, ROOM_COFFEE_SPOT);
  assert.deepEqual({ x: movementFor(people[1], 1, -1, 1).x, y: movementFor(people[1], 1, -1, 1).y }, ROOM_DESK_SPOTS[1]);
});

test("seluruh titik rute berada di dalam ruangan departemen yang sama", () => {
  for (const room of DEPARTMENT_ROOMS) {
    const employee = { ...person("AVAILABLE"), department: { name: room.name } };
    const expected = roomIndexFor(room.name);
    for (let tick = 0; tick < 12; tick += 1) {
      const move = movementFor(employee, tick, tick);
      assert.equal(move.roomIndex, expected);
      assert.ok(move.x >= 10 && move.x <= 90);
      assert.ok(move.y >= 10 && move.y <= 90);

      for (const layout of ["wide", "tall"] as const) {
        const point = localToRoom(move.roomIndex, layout, move.x, move.y);
        const origin = roomOrigin(move.roomIndex, layout);
        assert.ok(Math.abs(point.x - origin.x) <= ROOM_GEOMETRY.width / 2 + 0.001);
        assert.ok(Math.abs(point.z - origin.z) <= ROOM_GEOMETRY.depth / 2 + 0.001);
      }
    }
  }
});
