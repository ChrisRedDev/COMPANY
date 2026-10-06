export function guardLocal(request: Request, oauthCallback = false) {
  if (
    process.env.NEXT_PUBLIC_CRM_MODE !== "sqlite" ||
    process.env.LOCAL_DATABASE_ENABLED !== "1"
  )
    return Response.json(
      { error: "Włącz lokalną bazę SQLite zgodnie z README." },
      { status: 503 },
    );
  const url = new URL(request.url),
    host = request.headers.get("host") || url.host;
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/.test(host)
  )
    return Response.json(
      { error: "Baza lokalna jest dostępna wyłącznie przez localhost." },
      { status: 403 },
    );
  const callback =
    oauthCallback &&
    request.method === "GET" &&
    url.pathname === "/api/local/google/callback";
  const origin = request.headers.get("origin");
  try {
    if (
      !callback &&
      ((origin &&
        new URL(origin).origin !==
          new URL(`${url.protocol}//${host}`).origin) ||
        request.headers.get("sec-fetch-site") === "cross-site")
    )
      return Response.json(
        { error: "Niedozwolone pochodzenie żądania." },
        { status: 403 },
      );
  } catch {
    return Response.json(
      { error: "Nieprawidłowe pochodzenie żądania." },
      { status: 403 },
    );
  }
  return null;
}
