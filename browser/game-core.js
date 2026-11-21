export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function projectPlaneControl({ roll, pitch }) {
  return {
    roll: clamp(roll, -1, 1),
    pitch: clamp(pitch, -1, 1),
  };
}

export function buildWebSocketUrl(hostValue) {
  const candidate = hostValue.trim();
  if (!candidate) {
    return null;
  }
  try {
    const url = new URL(candidate.includes("://") ? candidate : `ws://${candidate}`);
    if ((url.protocol !== "ws:" && url.protocol !== "wss:") || !url.hostname) {
      return null;
    }
    if (!url.port) {
      url.port = "81";
    }
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function parseControlPacket(data) {
  try {
    const packet = JSON.parse(data);
    if (
      packet.type !== "control" ||
      !Number.isFinite(packet.roll) ||
      !Number.isFinite(packet.pitch) ||
      !Number.isInteger(packet.fire) ||
      !Number.isInteger(packet.sequence)
    ) {
      return null;
    }
    return {
      roll: packet.roll,
      pitch: packet.pitch,
      fire: packet.fire,
      sequence: packet.sequence,
    };
  } catch {
    return null;
  }
}
