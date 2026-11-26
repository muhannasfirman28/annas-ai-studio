import { test } from "node:test";
import assert from "node:assert/strict";
import { activityFor, type OfficeEmployee } from "./office-types";

const person = (availability: string): OfficeEmployee => ({
  id: "1",
  name: "Contoh",
  title: "Staf",
  avatarColor: "#2563eb",
  availability,
});

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
