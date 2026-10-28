import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canUseFilmCertLocalPasswordLogin,
  filmCertLocalDatabaseReason,
  isFilmCertLocalBrowserRequest,
} from "@/server/auth/film-cert-local-auth";

const certUrl = "postgresql://sergioarrias@127.0.0.1:5432/homecheff_film_cert_2u";
const disposableUrl = "postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test";

function env(patch: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return patch as NodeJS.ProcessEnv;
}

const open = {
  DATABASE_URL: certUrl,
  STUDIO_FILM_CERT_LOCAL_AUTH: "true",
  VERCEL: undefined,
  VERCEL_ENV: undefined,
  VERCEL_URL: undefined,
};

test("film-cert local auth stays off without the explicit flag", () => {
  const flags = env({ ...open, STUDIO_FILM_CERT_LOCAL_AUTH: undefined });
  assert.equal(filmCertLocalDatabaseReason(flags), null);
  assert.equal(canUseFilmCertLocalPasswordLogin(flags), false);
});

test("film-cert local auth rejects other databases and protected targets", () => {
  assert.equal(filmCertLocalDatabaseReason(env({ ...open, DATABASE_URL: disposableUrl })), "database_name");
  assert.equal(
    filmCertLocalDatabaseReason(env({ ...open, DATABASE_URL: "postgresql://u:p@ep-wild-morning-alynrf2i.eu-central-1.aws.neon.tech/neondb" })),
    "protected_target",
  );
  assert.equal(
    filmCertLocalDatabaseReason(env({ ...open, DATABASE_URL: "postgresql://u:p@ep-purple-moon-al3mm1i3.eu-central-1.aws.neon.tech/neondb" })),
    "protected_target",
  );
  assert.equal(
    filmCertLocalDatabaseReason(env({ ...open, DATABASE_URL: "postgresql://u:p@ep-withered-moon-bapvy24i.eu-central-1.aws.neon.tech/neondb" })),
    "protected_target",
  );
  assert.equal(filmCertLocalDatabaseReason(env({ ...open, VERCEL_ENV: "preview" })), "vercel_environment");
  assert.equal(canUseFilmCertLocalPasswordLogin(env(open)), true);
});

test("film-cert local login accepts only the matching local https origin", () => {
  const flags = env(open);
  const headers = (values: Record<string, string>) => ({
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  });
  assert.equal(
    isFilmCertLocalBrowserRequest({ headers: headers({ host: "127.0.0.1:3456", origin: "https://127.0.0.1:3456" }) }, flags),
    true,
  );
  assert.equal(
    isFilmCertLocalBrowserRequest({ headers: headers({ host: "127.0.0.1:3456", origin: "http://127.0.0.1:3456" }) }, flags),
    false,
  );
  assert.equal(
    isFilmCertLocalBrowserRequest({ headers: headers({ host: "127.0.0.1:3462", origin: "http://127.0.0.1:3462" }) }, flags),
    false,
  );
  assert.equal(
    isFilmCertLocalBrowserRequest({ headers: headers({ host: "127.0.0.1:3456", origin: "https://studio.homecheff.eu" }) }, flags),
    false,
  );
  assert.equal(
    isFilmCertLocalBrowserRequest({ headers: headers({ host: "studio.homecheff.eu", origin: "https://studio.homecheff.eu" }) }, flags),
    false,
  );
  assert.equal(
    isFilmCertLocalBrowserRequest({ headers: headers({ host: "127.0.0.1:3456" }) }, flags),
    false,
  );
});

test("password form posts so a pre-hydration submit cannot put the password in the URL", () => {
  const form = readFileSync(new URL("../../components/auth/auth-form.tsx", import.meta.url), "utf8");
  assert.match(form, /<form method="post" onSubmit=\{handleSubmit\}/);
});
