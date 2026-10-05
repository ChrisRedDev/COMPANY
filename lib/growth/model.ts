import { parseBackup } from "../crm/backup";
import type { WorkspaceData } from "../crm/model";
export const ROLES = ["owner", "admin", "marketer", "viewer"] as const;
export type Role = (typeof ROLES)[number];
export type WorkspaceInfo = { id: string; name: string; role: Role };
export type Preferences = {
  onboarded: boolean;
  sender: string;
  agentEnabled: boolean;
};
export type Snapshot = {
  data: WorkspaceData;
  settings: Preferences;
  revision: number;
};
export const isCloud = () => process.env.NEXT_PUBLIC_CRM_MODE === "cloud";
export function canWrite(role: Role) {
  return role !== "viewer";
}
export function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
export function validateSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== "object") throw Error("Nieprawidłowy zapis.");
  const v = value as Snapshot;
  if (
    !Number.isSafeInteger(v.revision) ||
    v.revision < 0 ||
    !v.settings ||
    typeof v.settings.onboarded !== "boolean" ||
    typeof v.settings.agentEnabled !== "boolean" ||
    typeof v.settings.sender !== "string" ||
    v.settings.sender.length > 200
  )
    throw Error("Nieprawidłowa wersja lub ustawienia.");
  return {
    data: parseBackup(JSON.stringify({ version: 1, data: v.data })),
    settings: v.settings,
    revision: v.revision,
  };
}
export function snapshot(
  state: WorkspaceData & Preferences,
  revision: number,
): Snapshot {
  return {
    revision,
    settings: {
      onboarded: state.onboarded,
      sender: state.sender,
      agentEnabled: state.agentEnabled,
    },
    data: {
      firms: state.firms,
      contacts: state.contacts,
      deals: state.deals,
      tasks: state.tasks,
      mails: state.mails,
    },
  };
}
