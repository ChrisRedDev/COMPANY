"use client";
import { useCallback, useEffect, useState } from "react";
import { cloudRequest } from "@/lib/supabase/browser";
import { ROLES, type WorkspaceInfo } from "@/lib/growth/model";
import { Field, Modal } from "../crm/ui";
export default function Members({
  workspace,
  onClose,
}: {
  workspace: WorkspaceInfo;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<{ user_id: string; role: string }[]>(
      [],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      cloudRequest(`/${workspace.id}/members`)
        .then((r) => setMembers(r.members))
        .catch(() => setError("Nie udało się odczytać członków.")),
    [workspace.id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const v = new FormData(e.currentTarget);
    try {
      await cloudRequest(`/${workspace.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: v.get("userId"), role: v.get("role") }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Zespół przestrzeni" onClose={onClose}>
      <p className="crm-muted">
        Użytkownik musi najpierw założyć konto. Jego identyfikator znajdziesz w
        panelu konta. Zaproszenia e-mail powstaną w kolejnej fazie.
      </p>
      <ul className="my-5 grid gap-3">
        {members.map((m) => (
          <li key={m.user_id} className="break-all">
            <strong>{m.role}</strong>
            <br />
            {m.user_id}
          </li>
        ))}
      </ul>
      {workspace.role === "owner" && (
        <form onSubmit={submit}>
          <Field label="UUID użytkownika">
            <input name="userId" required maxLength={36} />
          </Field>
          <Field label="Rola">
            <select name="role">
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <button className="crm-button" disabled={busy}>
            Zapisz rolę
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="crm-alert error">
          {error}
        </p>
      )}
    </Modal>
  );
}
