import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  readdirSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { databasePath } from "../local/database";
import { IntegrationError } from "./http";
export type GoogleCredential = {
  refreshToken: string;
  scopes: string[];
  connectedAt: string;
  client: string;
  generation: string;
};
export function clientFingerprint() {
  return createHash("sha256")
    .update(
      `${process.env.GOOGLE_OAUTH_CLIENT_ID || ""}\0${process.env.GOOGLE_OAUTH_CLIENT_SECRET || ""}`,
    )
    .digest("hex");
}
function location(wid: string) {
  if (!/^[a-f0-9-]{36}$/i.test(wid))
    throw new IntegrationError("Nieprawidłowa przestrzeń.", 400);
  return {
    folder: `${databasePath()}.google-oauth`,
    file: join(`${databasePath()}.google-oauth`, `${wid}.enc`),
  };
}
function key(folder: string, create: boolean) {
  const file = join(folder, "key");
  if (!existsSync(/* turbopackIgnore: true */ file) && create) {
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    if (
      readdirSync(/* turbopackIgnore: true */ folder).some((f) =>
        f.endsWith(".enc"),
      )
    )
      throw Error("missing-key");
    writeFileSync(file, randomBytes(32), { flag: "wx", mode: 0o600 });
    chmodSync(folder, 0o700);
  }
  const bytes = readFileSync(/* turbopackIgnore: true */ file);
  if (bytes.length !== 32) throw Error("invalid-key");
  return bytes;
}
export function credential(wid: string): GoogleCredential | null {
  const { folder, file } = location(wid);
  if (!existsSync(/* turbopackIgnore: true */ file)) return null;
  try {
    const bytes = readFileSync(/* turbopackIgnore: true */ file);
    if (bytes.length < 29 || bytes.length > 50000) throw Error();
    const cipher = createDecipheriv(
      "aes-256-gcm",
      key(folder, false),
      bytes.subarray(0, 12),
    );
    cipher.setAAD(Buffer.from(wid));
    cipher.setAuthTag(bytes.subarray(12, 28));
    const result = JSON.parse(
      Buffer.concat([
        cipher.update(bytes.subarray(28)),
        cipher.final(),
      ]).toString("utf8"),
    ) as GoogleCredential;
    if (
      !result.refreshToken ||
      !Array.isArray(result.scopes) ||
      !result.generation ||
      !result.connectedAt ||
      result.client !== clientFingerprint()
    )
      throw Error();
    return result;
  } catch {
    throw new IntegrationError(
      "Nie można odczytać połączenia Google. Przywróć skarbiec z kluczem lub odłącz i zaloguj Google ponownie. Zmiana klienta OAuth wymaga ponownego logowania.",
      400,
    );
  }
}
export function storeCredential(wid: string, value: GoogleCredential) {
  const { folder, file } = location(wid);
  try {
    const secret = key(folder, true),
      iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", secret, iv);
    cipher.setAAD(Buffer.from(wid));
    const payload = Buffer.concat([
      cipher.update(JSON.stringify(value)),
      cipher.final(),
    ]);
    const temp = `${file}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      writeFileSync(temp, Buffer.concat([iv, cipher.getAuthTag(), payload]), {
        flag: "wx",
        mode: 0o600,
      });
      renameSync(temp, file);
    } finally {
      if (existsSync(/* turbopackIgnore: true */ temp)) unlinkSync(temp);
    }
  } catch {
    throw new IntegrationError(
      "Nie można zapisać szyfrowanego połączenia Google. Sprawdź uprawnienia katalogu bazy i plik klucza.",
      400,
    );
  }
}
export function removeCredential(wid: string) {
  const { file } = location(wid);
  if (existsSync(/* turbopackIgnore: true */ file)) unlinkSync(file);
}
