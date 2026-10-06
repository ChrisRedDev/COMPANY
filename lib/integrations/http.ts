import "server-only";
import { setTimeout as delay } from "node:timers/promises";
export class IntegrationError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function apiJson(
  url: URL | string,
  init: RequestInit = {},
  google = false,
  retry = true,
): Promise<unknown> {
  for (let attempt = 0; attempt < (retry ? 2 : 1); attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new IntegrationError(
        "Nie udało się połączyć z API. Sprawdź sieć, proxy i dostęp do domeny dostawcy.",
      );
    }
    if (
      [429, 502, 503, 504].includes(response.status) &&
      attempt === 0 &&
      retry
    ) {
      await response.body?.cancel();
      await delay(300);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      const hint =
        response.status === 401
          ? "Uwierzytelnienie odrzucone. Sprawdź lub odnów dane dostępu."
          : response.status === 403
            ? google
              ? "Brak uprawnień lub wyłączone API. Nadaj dostęp do usługi i włącz właściwe API w projekcie Google Cloud."
              : "Brak uprawnień. Sprawdź zakres klucza i dostęp do projektu."
            : response.status === 429
              ? "Limit API został przekroczony. Spróbuj później."
              : response.status === 400
                ? "API odrzuciło konfigurację. Sprawdź identyfikator usługi, adres witryny i dane uwierzytelnienia."
                : response.status === 404
                  ? "Nie znaleziono usługi. Sprawdź identyfikator i uprawnienia."
                  : "Dostawca jest niedostępny. Spróbuj później.";
      throw new IntegrationError(
        `${google ? "Google" : "Dostawca"}: HTTP ${response.status}. ${hint}`,
        response.status === 401 || response.status === 403 ? 403 : 502,
      );
    }
    const reader = response.body?.getReader();
    if (!reader) throw new IntegrationError("API zwróciło pustą odpowiedź.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new IntegrationError("Odpowiedź API przekracza limit 2 MB.");
      }
      chunks.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new IntegrationError("API zwróciło nieprawidłowy JSON.");
    }
  }
  throw new IntegrationError("Nie udało się odczytać API.");
}
