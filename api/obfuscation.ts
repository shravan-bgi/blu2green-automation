/**
 * The application's client-side obfuscation, reimplemented.
 *
 * Two things need it. The bearer token is stored scrambled in
 * `localStorage.auth_token`, so reading it back means undoing this. And
 * `deactivatedivision` takes a scrambled primary key, so calling it means doing
 * it.
 *
 * XOR against a fixed key, then base64 over the percent-encoded result. The key
 * ships in the application's own bundle, in plain sight, to every visitor —
 * nothing here weakens anything, and the application's own comment calls it
 * obfuscation rather than encryption.
 */
// Verified against captured traffic on 2026-09-03: creating a division answered
// `data: "MjAzMTU="` — plain base64 for pk 20315 — and deleting it sent
// `divpk: "UCUwMlRxTQ=="`, which is what `obfuscate(20315)` produces here.
const OBFUSCATION_KEY = 'b2g@xK9#mP2$';

/** This function returns the value XORed against the application's key. */
// The transformation is its own inverse, which is why both directions use it.
function xorWithKey(value: string): string {
  let result = '';

  for (let index = 0; index < value.length; index += 1) {
    result += String.fromCharCode(
      value.charCodeAt(index) ^
        OBFUSCATION_KEY.charCodeAt(index % OBFUSCATION_KEY.length),
    );
  }

  return result;
}

/** This function scrambles a value the way the browser does before sending it. */
// The percent-encoded string is ASCII throughout, so latin1 reproduces what the
// browser's `btoa` sees, one byte per character.
export function obfuscate(value: string | number): string {
  return Buffer.from(encodeURIComponent(xorWithKey(String(value))), 'latin1').toString(
    'base64',
  );
}

/** This function reads back a value the application stored scrambled. */
export function deobfuscate(value: string): string {
  return xorWithKey(decodeURIComponent(Buffer.from(value, 'base64').toString('latin1')));
}
