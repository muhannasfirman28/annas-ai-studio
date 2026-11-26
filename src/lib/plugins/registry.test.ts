import { test } from "node:test";
import assert from "node:assert/strict";
import { PLUGINS, getPlugin, mergePluginStates, pluginStateMap } from "./registry";

test("plugin kantor virtual terdaftar dengan route yang benar", () => {
  const office = getPlugin("office");
  assert.ok(office, "plugin office harus terdaftar");
  assert.equal(office.route, "/plugins/office");
  assert.equal(office.defaultEnabled, true);
  assert.ok(office.permissions.includes("employees.read"));
  assert.equal(getPlugin("plugin-yang-tidak-ada"), null);
});

test("status tersimpan mengalahkan default, id asing diabaikan", () => {
  const plugins = mergePluginStates({ office: false, unknown: true });
  assert.equal(plugins.length, PLUGINS.length);
  assert.equal(plugins.find((p) => p.id === "office")?.enabled, false);
  assert.equal(plugins.some((p) => p.id === "unknown"), false);
});

test("tanpa status tersimpan, plugin memakai defaultEnabled", () => {
  const plugins = mergePluginStates({});
  assert.equal(plugins.find((p) => p.id === "office")?.enabled, true);
  assert.deepEqual(pluginStateMap(plugins), { office: true });
});
