// Compare the key on a browser PushSubscription with the key this app subscribes with.
// A missing key is "unknown", not a mismatch: some browsers omit applicationServerKey.

function bytesOf(value) {
  if (value instanceof Uint8Array) return value;
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

export function applicationServerKeysMatch(existing, expected) {
  const left = bytesOf(existing);
  const right = bytesOf(expected);
  if (!left || !right || left.length === 0 || left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

export function subscriptionNeedsRotation(existing, expected) {
  if (existing == null) return false;
  return !applicationServerKeysMatch(existing, expected);
}
