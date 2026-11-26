import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COFFEE_SPOT,
  DESK_SPOTS,
  MEETING_SPOT,
  activityFor,
  movementFor,
  officeChat,
  officeChatFeed,
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

test("rute jalan berputar dari meja ke kopi, meeting, lalu kembali", () => {
  const employee = person("AVAILABLE");
  const atDesk = movementFor(employee, 0, 0);
  const toCoffee = movementFor(employee, 0, 1);
  const drink = movementFor(employee, 0, 2);
  const toMeeting = movementFor(employee, 0, 3);
  const talk = movementFor(employee, 0, 4);
  const back = movementFor(employee, 0, 5);

  assert.deepEqual({ x: atDesk.x, y: atDesk.y }, DESK_SPOTS[0]);
  assert.equal(atDesk.walking, false);
  assert.equal(toCoffee.walking, true);
  assert.deepEqual({ x: toCoffee.x, y: toCoffee.y }, COFFEE_SPOT);
  assert.equal(drink.activity, "drinking");
  assert.equal(drink.walking, false);
  assert.equal(toMeeting.walking, true);
  assert.deepEqual({ x: toMeeting.x, y: toMeeting.y }, MEETING_SPOT);
  assert.equal(talk.activity, "talking");
  assert.equal(back.walking, true);
  assert.deepEqual({ x: back.x, y: back.y }, DESK_SPOTS[0]);
  assert.equal(movementFor(employee, 0, 6).x, DESK_SPOTS[0].x);
});

test("jadwal tiap karyawan di-offset agar tidak berjalan bersamaan", () => {
  const employee = person("AVAILABLE");
  assert.equal(movementFor(employee, 0, 0).walking, false);
  assert.equal(movementFor(employee, 1, 0).walking, true);
  assert.equal(movementFor(employee, 2, 0).activity, "drinking");
  assert.equal(movementFor(employee, 3, 0).walking, true);
});

test("karyawan offline tetap di meja dan tidak berjalan", () => {
  const employee = person("OFFLINE");
  for (let tick = 0; tick < 12; tick += 1) {
    const move = movementFor(employee, 5, tick);
    assert.deepEqual({ x: move.x, y: move.y }, DESK_SPOTS[5]);
    assert.equal(move.walking, false);
    assert.equal(move.activity, "offline");
    assert.equal(move.action, undefined);
  }
});

test("tik negatif tetap menghasilkan rute yang valid", () => {
  const move = movementFor(person("AVAILABLE"), 0, -1);
  assert.equal(move.walking, true);
  assert.deepEqual({ x: move.x, y: move.y }, DESK_SPOTS[0]);
});
