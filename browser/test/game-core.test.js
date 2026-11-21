import test from "node:test";
import assert from "node:assert/strict";
import { buildWebSocketUrl, clamp, parseControlPacket, projectPlaneControl } from "../game-core.js";

test("parses a valid IMU control packet", () => {
  const control = parseControlPacket(
    JSON.stringify({ type: "control", roll: 0.25, pitch: -0.4, fire: 3, sequence: 12 }),
  );
  assert.deepEqual(control, { roll: 0.25, pitch: -0.4, fire: 3, sequence: 12 });
});

test("rejects malformed or non-finite control packets", () => {
  assert.equal(parseControlPacket("not json"), null);
  assert.equal(parseControlPacket(JSON.stringify({ type: "orientation", w: 1 })), null);
  assert.equal(parseControlPacket(JSON.stringify({ type: "control", roll: "x", pitch: 0 })), null);
});

test("clamps physical gamepad input to the flight envelope", () => {
  assert.equal(clamp(3, -1, 1), 1);
  assert.equal(clamp(-3, -1, 1), -1);
  assert.deepEqual(projectPlaneControl({ roll: 2, pitch: -2 }), { roll: 1, pitch: -1 });
});

test("builds a WebSocket URL only from an explicitly configured host", () => {
  assert.equal(buildWebSocketUrl(" 192.168.10.207 "), "ws://192.168.10.207:81/");
  assert.equal(buildWebSocketUrl(""), null);
  assert.equal(buildWebSocketUrl("ws://bad host"), null);
});

test("the local Three.js module resolves all of its local imports", async () => {
  const three = await import("../vendor/three.module.js");
  assert.equal(typeof three.Scene, "function");
});
