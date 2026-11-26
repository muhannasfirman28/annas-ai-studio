import { test } from "node:test";
import assert from "node:assert/strict";
import { activityFor, officeChat, officeChatFeed, type OfficeEmployee } from "./office-types";

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
