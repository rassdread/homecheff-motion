import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseDisposableLocalPasswordLogin,
  disposableLocalDatabaseReason,
  isDisposableLocalBrowserRequest,
} from "@/server/auth/disposable-local-auth";

const localUrl = "postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test";

function env(patch: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return patch as NodeJS.ProcessEnv;
}

test("disposable local auth stays off without the explicit flag", () => {
  const flags = env({ DATABASE_URL: localUrl, STUDIO_DISPOSABLE_LOCAL_AUTH: undefined, VERCEL: undefined, VERCEL_ENV: undefined, VERCEL_URL: undefined });
  assert.equal(disposableLocalDatabaseReason(flags), null);
  assert.equal(canUseDisposableLocalPasswordLogin(flags), false);
});

test("disposable local auth rejects protected and remote databases", () => {
  const base = { STUDIO_DISPOSABLE_LOCAL_AUTH: "true", VERCEL: undefined, VERCEL_ENV: undefined, VERCEL_URL: undefined };
  assert.equal(
    disposableLocalDatabaseReason(env({ ...base, DATABASE_URL: "postgresql://u:p@ep-wild-morning-alynrf2i.eu-central-1.aws.neon.tech/neondb" })),
    "protected_target",
  );
  assert.equal(
    disposableLocalDatabaseReason(env({ ...base, DATABASE_URL: "postgresql://u:p@ep-purple-moon-al3mm1i3.eu-central-1.aws.neon.tech/neondb" })),
    "protected_target",
  );
  assert.equal(
    disposableLocalDatabaseReason(env({ ...base, DATABASE_URL: "postgresql://u:p@ep-withered-moon-bapvy24i.eu-central-1.aws.neon.tech/neondb" })),
    "protected_target",
  );
  assert.equal(
    disposableLocalDatabaseReason(env({ ...base, DATABASE_URL: "postgresql://sergioarrias@127.0.0.1:5432/homecheff_film_cert_2u" })),
    "database_name",
  );
  assert.equal(
    disposableLocalDatabaseReason(env({ ...base, DATABASE_URL: localUrl, VERCEL_ENV: "preview" })),
    "vercel_environment",
  );
  assert.equal(canUseDisposableLocalPasswordLogin(env({ ...base, DATABASE_URL: localUrl })), true);
});

test("disposable local login accepts only the local http origin", () => {
  const flags = env({
    DATABASE_URL: localUrl,
    STUDIO_DISPOSABLE_LOCAL_AUTH: "true",
    VERCEL: undefined,
    VERCEL_ENV: undefined,
    VERCEL_URL: undefined,
  });
  const headers = (values: Record<string, string>) => ({
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  });
  assert.equal(
    isDisposableLocalBrowserRequest({ headers: headers({ host: "127.0.0.1:3462", origin: "http://127.0.0.1:3462" }) }, flags),
    true,
  );
  assert.equal(
    isDisposableLocalBrowserRequest({ headers: headers({ host: "127.0.0.1:3462", origin: "https://studio.homecheff.eu" }) }, flags),
    false,
  );
  assert.equal(
    isDisposableLocalBrowserRequest({ headers: headers({ host: "studio.homecheff.eu", origin: "https://studio.homecheff.eu" }) }, flags),
    false,
  );
});
