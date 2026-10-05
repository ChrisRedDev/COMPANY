import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LeadError } from "./model";
import type { LeadRepository } from "./repository";
export function cloudLeads(db: SupabaseClient): LeadRepository {
  async function read(wid: string, params: Record<string, unknown>) {
    const { data, error } = await db.rpc("read_lead_hub", { wid, params });
    if (error)
      throw new LeadError(
        error.code === "42501"
          ? "Brak dostępu do Lead Hub tej przestrzeni."
          : "Nie udało się odczytać Lead Hub. Sprawdź migrację bazy.",
        error.code === "42501" ? 403 : 400,
      );
    return data;
  }
  return {
    list: (wid, f) => read(wid, f),
    read: (wid, id) => read(wid, { id }),
    identity: (wid, email_key, phone_key) =>
      read(wid, { identity: true, email_key, phone_key }),
    async write(wid, bundle, expected, create) {
      const { data, error } = await db.rpc("write_lead_hub", {
        wid,
        bundle,
        expected_revision: expected,
        is_create: create,
      });
      if (error) {
        const status =
          error.code === "42501"
            ? 403
            : error.code === "40001" || error.code === "23505"
              ? 409
              : 400;
        throw new LeadError(
          status === 403
            ? "Brak uprawnień do zapisu w tej przestrzeni."
            : status === 409
              ? "Konflikt wersji lub tożsamości leada. Odśwież szczegóły i sprawdź e-mail oraz telefon."
              : "Zapis Lead Hub nie powiódł się. Sprawdź dane i migrację bazy.",
          status,
        );
      }
      return data;
    },
  };
}
