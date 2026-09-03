import fs from 'fs';
import { deobfuscate } from '@api/obfuscation';
import { environment } from '@config/environment';

type StorageState = {
  origins?: { origin: string; localStorage?: { name: string; value: string }[] }[];
};

/** The shape a JSON Web Token takes, for telling one from whatever else came back. */
const JWT = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/;

/**
 * This function returns the Authorization header value the service expects.
 *
 * Derived from the session the `setup` project already saved rather than from a
 * second file of its own: the state on disk holds the token, so anything else
 * would be a copy that can disagree with it.
 */
// The application authenticates by this header alone — the saved state holds no
// cookies at all — so a request context built from `storageState` would be
// anonymous. It stores the token scrambled, so it is unscrambled here.
export function bearerToken(): string {
  if (!fs.existsSync(environment.storageState)) {
    throw new Error(
      `No saved session at ${environment.storageState}. Run the setup project first — ` +
        'a project that calls the API must declare `dependencies: ["setup"]`.',
    );
  }

  const state = JSON.parse(
    fs.readFileSync(environment.storageState, 'utf8'),
  ) as StorageState;

  const application = new URL(environment.baseURL).origin;
  const stored = state.origins
    ?.find((entry) => entry.origin === application)
    ?.localStorage?.find((item) => item.name === 'auth_token')?.value;

  if (!stored) {
    throw new Error(
      `No auth_token stored for ${application} in ${environment.storageState}. ` +
        'The sign-in in setup did not complete, or the application changed where it keeps its token.',
    );
  }

  const token = deobfuscate(stored);

  // Checked rather than trusted: if the application ever changes how it scrambles
  // the token, this says so in one clear sentence instead of surfacing as a run
  // of 401s from every test that seeds data.
  if (!JWT.test(token)) {
    throw new Error(
      'The stored auth_token did not unscramble to a JWT. The application has probably ' +
        'changed how it stores the token — see api/obfuscation.ts.',
    );
  }

  return `Bearer ${token}`;
}

/** The claims the application's own token carries. */
export type TokenClaims = {
  /** The company every service call is scoped to. */
  companyPk: number;
  exp: number;
  iat: number;
};

/** This function returns the claims inside the saved session's token. */
// The service never takes a company as an argument — it reads one from the
// token — so this is the only way a test can know which company it is entitled
// to see, and therefore the only way to assert that it sees no other.
export function tokenClaims(): TokenClaims {
  const payload = bearerToken().replace('Bearer ', '').split('.')[1] ?? '';

  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as TokenClaims;
}

/** This function returns a bearer token whose signature has been corrupted. */
// The header and payload are left intact so that only the signature check can
// reject it. A token that were malformed throughout would prove far less: it
// could be turned away by a parser before authentication was ever attempted.
export function tamperedBearerToken(): string {
  const [header, payload] = bearerToken().replace('Bearer ', '').split('.');

  return `Bearer ${header}.${payload}.not-the-real-signature`;
}
