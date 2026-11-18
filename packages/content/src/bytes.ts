// Small, dependency-free byte helpers so `@geo/content` works the same in the
// browser, in Node tests and on Android's WebView (07 §4, D107).

export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

export function utf8Decode(bytes: Uint8Array): string {
  let text = '';
  for (let index = 0; index < bytes.length; index += 1) {
    const first = bytes[index];
    if (first === undefined) {
      break;
    }
    if (first <= 0x7f) {
      text += String.fromCodePoint(first);
      continue;
    }
    if (first <= 0xdf) {
      const second = bytes[index + 1] ?? 0;
      index += 1;
      text += String.fromCodePoint(((first & 0x1f) << 6) | (second & 0x3f));
      continue;
    }
    if (first <= 0xef) {
      const second = bytes[index + 1] ?? 0;
      const third = bytes[index + 2] ?? 0;
      index += 2;
      text += String.fromCodePoint(
        ((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f),
      );
      continue;
    }
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const fourth = bytes[index + 3] ?? 0;
    index += 3;
    text += String.fromCodePoint(
      ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f),
    );
  }
  return text;
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64Encode(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += BASE64_ALPHABET[first >> 2] ?? '';
    output += BASE64_ALPHABET[((first & 0x03) << 4) | ((second ?? 0) >> 4)] ?? '';
    output +=
      second === undefined
        ? '='
        : (BASE64_ALPHABET[((second & 0x0f) << 2) | ((third ?? 0) >> 6)] ?? '=');
    output += third === undefined ? '=' : (BASE64_ALPHABET[third & 0x3f] ?? '=');
  }
  return output;
}

export function base64Decode(input: string): Uint8Array {
  const clean = input.replace(/=+$/u, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    const value = BASE64_ALPHABET.indexOf(character);
    if (value < 0) {
      throw new TypeError('invalid base64');
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new TypeError('hex string must have an even length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    const pair = hex.slice(index * 2, index * 2 + 2);
    const value = Number.parseInt(pair, 16);
    if (Number.isNaN(value)) {
      throw new TypeError('invalid hex');
    }
    bytes[index] = value;
  }
  return bytes;
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
