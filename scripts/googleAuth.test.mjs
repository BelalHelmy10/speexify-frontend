import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseGoogleAuthOnCurrentOrigin,
  getGoogleClientId,
} from "../lib/googleAuth.js";

const ENV_KEYS = [
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  "NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID",
  "NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST",
  "NEXT_PUBLIC_GOOGLE_AUTH_DISABLED",
];

function withLocalGoogleConfig(config, callback) {
  const previous = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]])
  );
  const previousWindow = globalThis.window;

  Object.assign(process.env, config);
  globalThis.window = { location: { hostname: "localhost" } };

  try {
    return callback();
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test("localhost Google auth stays disabled unless explicitly authorized", () => {
  withLocalGoogleConfig(
    {
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "primary.apps.googleusercontent.com",
      NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID: "",
      NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST: "true",
      NEXT_PUBLIC_GOOGLE_AUTH_DISABLED: "false",
    },
    () => assert.equal(canUseGoogleAuthOnCurrentOrigin(), false)
  );
});

test("localhost uses the dedicated OAuth client when configured and allowed", () => {
  withLocalGoogleConfig(
    {
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "primary.apps.googleusercontent.com",
      NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID: "localhost.apps.googleusercontent.com",
      NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST: "true",
      NEXT_PUBLIC_GOOGLE_AUTH_DISABLED: "false",
    },
    () => {
      assert.equal(getGoogleClientId(), "localhost.apps.googleusercontent.com");
      assert.equal(canUseGoogleAuthOnCurrentOrigin(), true);
    }
  );
});

test("the explicit disable flag wins over an otherwise valid local client", () => {
  withLocalGoogleConfig(
    {
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "primary.apps.googleusercontent.com",
      NEXT_PUBLIC_GOOGLE_LOCAL_CLIENT_ID: "localhost.apps.googleusercontent.com",
      NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST: "true",
      NEXT_PUBLIC_GOOGLE_AUTH_DISABLED: "true",
    },
    () => assert.equal(canUseGoogleAuthOnCurrentOrigin(), false)
  );
});
