"use client";
import { isSqlite } from "@/lib/growth/model";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Workspace from "../crm/workspace";
import Members from "./members";
import { useCrm } from "@/stores/crm-store";
import { browserSupabase, cloudRequest } from "@/lib/supabase/browser";
import {
  canWrite,
  snapshot,
  validateSnapshot,
  type WorkspaceInfo,
} from "@/lib/growth/model";
import { downloadFile } from "@/lib/crm/backup";
import { emptyAutomation } from "@/lib/automation/model";
import { Field } from "../crm/ui";
export default function CloudWorkspace({ user }: { user: User }) {
  const selectionKey = `growth-os-space:${isSqlite() ? "sqlite" : "cloud"}:${user.id}`;
  const savedLabel = isSqlite() ? "Saved in SQLite" : "Saved in Supabase";
  const [spaces, setSpaces] = useState<WorkspaceInfo[]>([]),
    [selected, setSelected] = useState<WorkspaceInfo | null>(null),
    [loaded, setLoaded] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [sync, setSync] = useState("Choose a workspace"),
    [members, setMembers] = useState(false),
    [createOpen, setCreateOpen] = useState(false),
    [spacesReady, setSpacesReady] = useState(false);
  const pending =
    sync === "Changes waiting to save" ||
    sync === "Saving…" ||
    sync === "Unsaved changes";
  const dirty = useRef(false),
    failure = useRef(false),
    revision = useRef(0);
  const refresh = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    let active = true;
    (async () => {
      let demoId = "";
      if (isSqlite()) {
        const response = await fetch("/api/plumbing/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        demoId = data.id;
      }
      return { ...(await cloudRequest("")), demoId };
    })()
      .then((r) => {
        if (active) {
          setSpaces(r.workspaces);
          if (!r.workspaces.length) setCreateOpen(true);
          let previous = "";
          try {
            previous = sessionStorage.getItem(selectionKey) || "";
          } catch {}
          const returning = isSqlite()
            ? new URLSearchParams(window.location.search).get("googleWorkspace")
            : null;
          setSelected(
            r.workspaces.find((s: WorkspaceInfo) => s.id === returning) ??
              r.workspaces.find((s: WorkspaceInfo) => s.id === previous) ??
              r.workspaces.find((s: WorkspaceInfo) => s.id === r.demoId) ??
              r.workspaces[0] ??
              null,
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setSpacesReady(true);
      });
    return () => {
      active = false;
    };
  }, [selectionKey]);
  useEffect(() => {
    if (!selected) return;
    try {
      sessionStorage.setItem(selectionKey, selected.id);
    } catch {}
    let active = true,
      writing = false,
      hydrating = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    queueMicrotask(() => {
      if (active) {
        setLoaded(false);
        setError("");
        setLoading(true);
      }
    });
    failure.current = false;
    dirty.current = false;
    useCrm.setState({
      firms: [],
      contacts: [],
      deals: [],
      tasks: [],
      mails: [],
      onboarded: false,
      sender: "",
      agentEnabled: false,
      businessMode: "crm",
      automation: emptyAutomation(),
    });
    let unsubscribe = () => {};
    const save = async () => {
      if (!active || writing || !dirty.current || failure.current) return;
      writing = true;
      dirty.current = false;
      setSync("Saving…");
      const payload = snapshot(useCrm.getState(), revision.current);
      try {
        const result = await cloudRequest(`/${selected.id}/data`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (active) {
          revision.current = result.revision;
          setSync(dirty.current ? "Saving…" : savedLabel);
        }
      } catch (e) {
        if (active) {
          failure.current = true;
          dirty.current = true;
          setError(e instanceof Error ? e.message : "Save failed.");
          setSync("Unsaved changes");
        }
      } finally {
        writing = false;
        if (active && dirty.current && !failure.current) void save();
      }
    };
    (async () => {
      if (isSqlite()) {
        const r = await fetch(`/api/plumbing/${selected.id}/brain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!r.ok) throw Error((await r.json()).error);
      }
      return cloudRequest(`/${selected.id}/data`);
    })()
      .then((raw) => {
        if (!active) return;
        const state = validateSnapshot(raw);
        revision.current = state.revision;
        useCrm.setState({ ...state.data, ...state.settings });
        setLoaded(true);
        setSync(savedLabel);
        if (canWrite(selected.role))
          unsubscribe = useCrm.subscribe((next, prev) => {
            if (hydrating) return;
            if (
              JSON.stringify(snapshot(next, 0)) ===
              JSON.stringify(snapshot(prev, 0))
            )
              return;
            dirty.current = true;
            setSync("Changes waiting to save");
            clearTimeout(timer);
            timer = setTimeout(() => void save(), 180);
          });
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setSync("Connection unavailable");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    refresh.current = async () => {
      if (!active || writing || dirty.current || failure.current) return;
      setLoading(true);
      setSync("Loading…");
      try {
        const state = validateSnapshot(
          await cloudRequest(`/${selected.id}/data`),
        );
        if (!active) return;
        revision.current = state.revision;
        hydrating = true;
        try {
          useCrm.setState({ ...state.data, ...state.settings });
        } finally {
          hydrating = false;
        }
        setSync(savedLabel);
      } catch {
        if (active) {
          failure.current = true;
          setError(
            "Could not refresh after the assistant action. Reload the workspace.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.current || writing) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      active = false;
      unsubscribe();
      clearTimeout(timer);
      window.removeEventListener("beforeunload", unload);
    };
  }, [selected, savedLabel, selectionKey]);
  function backup() {
    downloadFile(
      "growth-os-niezapisane-zmiany.json",
      JSON.stringify(
        {
          version: 1,
          data: snapshot(useCrm.getState(), 0).data,
          settings: snapshot(useCrm.getState(), 0).settings,
        },
        null,
        2,
      ),
    );
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dirty.current || pending) return;
    setLoading(true);
    setError("");
    const name = new FormData(event.currentTarget).get("name");
    try {
      const r = await cloudRequest("", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const list = await cloudRequest("");
      setSpaces(list.workspaces);
      setCreateOpen(false);
      setSelected(list.workspaces.find((s: WorkspaceInfo) => s.id === r.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create workspace.");
    } finally {
      setLoading(false);
    }
  }
  async function signOut() {
    if (dirty.current || pending) return;
    try {
      const { error } = await browserSupabase().auth.signOut();
      if (error) throw error;
      useCrm.setState({
        firms: [],
        contacts: [],
        deals: [],
        tasks: [],
        mails: [],
      });
    } catch {
      setError("Could not sign out. Please retry.");
    }
  }
  async function openDemo() {
    if (pending || loading) return;
    setLoading(true);
    try {
      const r = await fetch("/api/plumbing/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      const list = await cloudRequest("");
      setSpaces(list.workspaces);
      setSelected(list.workspaces.find((s: WorkspaceInfo) => s.id === data.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load DEMO.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="crm flex-col [&_.crm-main]:ml-0! [&_.crm-sidebar]:sticky! [&_.crm-sidebar]:top-0 [&_.crm-sidebar]:h-screen [&_.crm-sidebar]:self-start">
      <header className="plumbing-spacebar flex flex-wrap items-center gap-3 p-4">
        <strong>
          Local Plumbing Services{" "}
          <span className="plumbing-chip">Growth OS</span>
        </strong>
        {isSqlite() && (
          <button
            className="crm-button secondary"
            onClick={() => void openDemo()}
            disabled={pending || loading}
          >
            Open ready DEMO
          </button>
        )}
        <label className="flex items-center gap-2">
          Workspace
          <select
            aria-label="Workspace selector"
            className="max-w-[18em] rounded-lg border border-slate-200 p-2"
            value={selected?.id ?? ""}
            disabled={pending || loading}
            onChange={(e) =>
              setSelected(spaces.find((s) => s.id === e.target.value) ?? null)
            }
          >
            {!selected && <option value="">Choose</option>}
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <span role="status" className="crm-muted">
          {sync}
        </span>
        {selected && <span className="crm-muted">Role: {selected.role}</span>}
        <button
          className="crm-button secondary"
          disabled={!selected || pending || loading || isSqlite()}
          onClick={() => setMembers(true)}
        >
          Team
        </button>
        <button
          className="crm-button secondary"
          disabled={pending || loading}
          onClick={() => void signOut()}
          hidden={isSqlite()}
        >
          Sign out
        </button>
        <details className="w-full" open={createOpen}>
          <summary
            aria-disabled={!spacesReady}
            onClick={(e) => {
              e.preventDefault();
              if (spacesReady) setCreateOpen((value) => !value);
            }}
          >
            {isSqlite() ? "New company workspace" : "Account · new workspace"}
          </summary>
          <p className="crm-muted my-3 break-all">
            {user.email} · UUID: {user.id}
          </p>
          <form onSubmit={create} className="flex flex-wrap items-end gap-3">
            <Field label="New workspace name">
              <input
                name="name"
                required
                maxLength={120}
                placeholder="Local Plumbing Services"
              />
            </Field>
            <button
              className="crm-button"
              disabled={!spacesReady || loading || pending}
            >
              Create workspace
            </button>
          </form>
        </details>
      </header>
      {error && (
        <div className="p-4">
          <p role="alert" className="crm-alert error">
            {error} Editing paused to protect unsaved data.
          </p>
          {loaded && (
            <button className="crm-button secondary" onClick={backup}>
              Download unsaved changes
            </button>
          )}
          <button
            className="crm-button secondary"
            onClick={() => {
              if (
                !dirty.current ||
                confirm(
                  "Discard unsaved changes and reload? Download a backup first.",
                )
              ) {
                dirty.current = false;
                if (selected) setSelected({ ...selected });
                else window.location.reload();
              }
            }}
          >
            Reload from database
          </button>
        </div>
      )}
      {selected?.role === "viewer" && (
        <p className="crm-alert m-4">
          Read-only access. A marketer, administrator or owner can edit.
        </p>
      )}
      {loaded && selected ? (
        <div inert={Boolean(error) || loading}>
          <Workspace
            key={selected.id}
            storageBusy={pending || loading}
            reloadDatabase={() => {
              void refresh.current();
            }}
            cloud={{
              id: selected.id,
              storage: isSqlite() ? "sqlite" : "supabase",
              name: selected.name,
              readOnly: selected.role === "viewer",
            }}
          />
        </div>
      ) : (
        !error && (
          <div className="p-8">
            <h1>{loading ? "Loading data…" : "Create your first workspace"}</h1>
            <p className="crm-muted">
              The ready DEMO workspace includes synthetic enquiries, jobs,
              reports and Company Brain. Create a separate workspace for real
              customers.
            </p>
          </div>
        )
      )}
      {members && selected && (
        <Members
          workspace={selected}
          onClose={() => {
            setMembers(false);
            void cloudRequest("")
              .then((r) => {
                setSpaces(r.workspaces);
                const current = r.workspaces.find(
                  (w: WorkspaceInfo) => w.id === selected.id,
                );
                if (current && current.role !== selected.role)
                  setSelected(current);
              })
              .catch(() =>
                setError("Could not refresh workspace permissions."),
              );
          }}
        />
      )}
    </div>
  );
}
