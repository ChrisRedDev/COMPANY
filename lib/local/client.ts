"use client";
export async function localRequest(
  wid: string,
  path: string,
  init: RequestInit = {},
) {
  const r = await fetch(
    `/api/local/workspaces/${encodeURIComponent(wid)}/${path}`,
    {
      ...init,
      cache: "no-store",
      headers: { ...init.headers, "Content-Type": "application/json" },
    },
  );
  const result = await r.json();
  if (!r.ok) throw Error(result.error || "Nie udało się wykonać operacji.");
  return result;
}
export async function localDownload(path: string, name: string) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) {
    const data = await r.json();
    throw Error(data.error || "Nie udało się pobrać kopii.");
  }
  const url = URL.createObjectURL(await r.blob()),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
