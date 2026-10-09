import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const port = parsePort(process.env.OAUTH_TEST_CLIENT_PORT ?? "4567");
const redirectUri =
  process.env.OAUTH_REDIRECT_URI ??
  `http://localhost:${String(port)}/oauth/callback`;
const defaultConfig = {
  apiBase: normalizeApiBase(
    process.env.ARKHAM_BUILD_API_BASE ?? "http://localhost:8686",
  ),
  clientId: process.env.OAUTH_CLIENT_ID ?? "",
  clientSecret: process.env.OAUTH_CLIENT_SECRET ?? "",
  redirectUri,
};
const sessionCookieName = "arkham-oauth-test-session";
const sessionMaxIdleMilliseconds = 24 * 60 * 60 * 1000;
const authorizationMaxAgeMilliseconds = 15 * 60 * 1000;
const requestBodyLimitBytes = 1024 * 1024;
const sessions = new Map();
const staticFiles = await loadStaticFiles();

const server = createServer(async (request, response) => {
  try {
    await routeRequest(request, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sendJson(response, 500, { error: "test_client_error", message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.info(
    `OAuth test client is available at http://localhost:${String(port)}`,
  );
  console.info(`Registered callback URI: ${redirectUri}`);
});

async function routeRequest(request, response) {
  const method = request.method ?? "GET";
  const requestUrl = new URL(request.url ?? "/", redirectUri);

  if (method === "GET" && requestUrl.pathname === "/oauth/callback") {
    await handleOAuthCallback(request, response, requestUrl);
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/session") {
    const session = getSession(request, response);
    sendJson(response, 200, sessionView(session));
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/config") {
    const session = getSession(request, response);
    const input = requireObject(await readJsonBody(request));
    session.config = parseClientConfig(input);
    session.tokens = undefined;
    session.pendingAuthorization = undefined;
    session.lastOperation = undefined;
    sendJson(response, 200, sessionView(session));
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/oauth/connect") {
    const session = getSession(request, response);
    requireConfiguredClient(session);
    const input = requireObject(await readJsonBody(request));
    const scopes = parseScopes(input.scopes);
    const state = randomBytes(32).toString("base64url");
    session.pendingAuthorization = { state, createdAt: Date.now() };

    const authorizationUrl = apiUrl(session, "/v2/oauth/authorize");
    authorizationUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: session.config.clientId,
      redirect_uri: session.config.redirectUri,
      scope: scopes.join(" "),
      state,
    }).toString();

    sendJson(response, 200, { authorizationUrl: authorizationUrl.toString() });
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/oauth/refresh") {
    const session = getSession(request, response);
    requireConfiguredClient(session);
    const refreshToken = requireRefreshToken(session);
    const operation = await tokenRequest(session, {
      grant_type: "refresh_token",
      client_id: session.config.clientId,
      client_secret: session.config.clientSecret,
      refresh_token: refreshToken,
    });
    session.lastOperation = operation;
    updateTokensFromOperation(session, operation);
    sendJson(response, 200, operation);
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/oauth/revoke") {
    const session = getSession(request, response);
    requireConfiguredClient(session);
    const input = requireObject(await readJsonBody(request));
    const tokenType = parseTokenType(input.tokenType);
    const token = requireToken(session, tokenType);
    const operation = await formOperation(session, "POST", "/v2/oauth/revoke", {
      client_id: session.config.clientId,
      client_secret: session.config.clientSecret,
      token,
      token_type_hint: `${tokenType}_token`,
    });
    session.lastOperation = operation;

    if (operation.response.status >= 200 && operation.response.status < 300) {
      if (tokenType === "refresh") session.tokens = undefined;
      if (tokenType === "access" && session.tokens) {
        session.tokens = {
          ...session.tokens,
          access_token: undefined,
        };
      }
    }

    sendJson(response, 200, operation);
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/oauth/clear") {
    const session = getSession(request, response);
    session.tokens = undefined;
    session.pendingAuthorization = undefined;
    session.lastOperation = undefined;
    sendJson(response, 200, sessionView(session));
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/profile") {
    const session = getSession(request, response);
    const operation = await bearerOperation(session, "GET", "/v2/user/me");
    session.lastOperation = operation;
    sendJson(response, 200, operation);
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/decks/manifest") {
    const session = getSession(request, response);
    const source = parseOptionalSource(requestUrl.searchParams.get("source"));
    const path = source
      ? `/v2/user/decks/manifest?source=${encodeURIComponent(source)}`
      : "/v2/user/decks/manifest";
    const operation = await bearerOperation(session, "GET", path);
    session.lastOperation = operation;
    sendJson(response, 200, operation);
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/decks/sync") {
    const session = getSession(request, response);
    const input = requireObject(await readJsonBody(request));
    const source = parseOptionalSource(readOptionalString(input, "source"));
    const result = await synchronizeDecks(session, source);
    session.lastOperation = result.operations.at(-1);
    sendJson(response, 200, result);
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/decks/action") {
    const session = getSession(request, response);
    const input = requireObject(await readJsonBody(request));
    const operation = await performDeckAction(session, input);
    session.lastOperation = operation;
    sendJson(response, 200, operation);
    return;
  }

  if (method === "GET" && staticFiles.has(requestUrl.pathname)) {
    const file = staticFiles.get(requestUrl.pathname);
    response.writeHead(200, {
      "Content-Type": file.contentType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(file.content);
    return;
  }

  sendJson(response, 404, {
    error: "not_found",
    message: "Test client route not found",
  });
}

async function handleOAuthCallback(request, response, requestUrl) {
  const session = getSession(request, response);
  const state = requestUrl.searchParams.get("state");
  const pending = session.pendingAuthorization;
  session.pendingAuthorization = undefined;

  if (
    !pending ||
    !state ||
    state !== pending.state ||
    Date.now() - pending.createdAt > authorizationMaxAgeMilliseconds
  ) {
    session.lastOperation = localErrorOperation(
      "OAuth callback",
      "OAuth state is missing, expired, or does not match this browser session",
    );
    redirectToApp(response, "error");
    return;
  }

  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError) {
    session.lastOperation = localErrorOperation(
      "OAuth callback",
      requestUrl.searchParams.get("error_description") ?? oauthError,
    );
    redirectToApp(response, "denied");
    return;
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) {
    session.lastOperation = localErrorOperation(
      "OAuth callback",
      "OAuth callback did not include an authorization code",
    );
    redirectToApp(response, "error");
    return;
  }

  const operation = await tokenRequest(session, {
    grant_type: "authorization_code",
    client_id: session.config.clientId,
    client_secret: session.config.clientSecret,
    code,
    redirect_uri: session.config.redirectUri,
  });
  session.lastOperation = operation;
  const connected = updateTokensFromOperation(session, operation);
  redirectToApp(response, connected ? "connected" : "error");
}

async function synchronizeDecks(session, source) {
  const manifestPath = source
    ? `/v2/user/decks/manifest?source=${encodeURIComponent(source)}`
    : "/v2/user/decks/manifest";
  const manifestOperation = await bearerOperation(session, "GET", manifestPath);
  const operations = [manifestOperation];
  const decks = [];
  if (!isSuccessfulOperation(manifestOperation)) {
    return { manifest: manifestOperation.response.body, decks, operations };
  }

  const manifest = requireObject(manifestOperation.response.body);
  const targets = parseManifestTargets(manifest.decks);
  for (let index = 0; index < targets.length; index += 250) {
    const batchTargets = targets.slice(index, index + 250);
    const batchOperation = await bearerOperation(
      session,
      "POST",
      "/v2/user/decks/batch",
      {
        arkhamdbSyncToken: manifest.arkhamdbSyncToken ?? null,
        decks: batchTargets,
      },
    );
    operations.push(batchOperation);
    if (!isSuccessfulOperation(batchOperation)) break;

    const batch = requireObject(batchOperation.response.body);
    if (!Array.isArray(batch.decks)) {
      throw new Error("Deck batch response does not contain a decks array");
    }
    decks.push(...batch.decks);
  }

  return { manifest, decks, operations };
}

async function performDeckAction(session, input) {
  const action = requireString(input, "action");
  const source = parseSource(requireString(input, "source"));
  const id = readOptionalString(input, "id");

  if (action === "create") {
    return await bearerOperation(
      session,
      "POST",
      `/v2/user/decks/${source}`,
      requireObject(input.deck),
    );
  }

  if (!id) throw new Error(`Deck ID is required for the ${action} action`);
  const targetPath = `/v2/user/decks/${source}/${encodeURIComponent(id)}`;

  if (action === "read") {
    return await bearerOperation(session, "GET", targetPath);
  }

  if (action === "replace") {
    return await bearerOperation(
      session,
      "PUT",
      targetPath,
      requireObject(input.deck),
    );
  }

  if (action === "upgrade") {
    return await bearerOperation(
      session,
      "POST",
      `${targetPath}/upgrade`,
      requireObject(input.deck),
    );
  }

  if (action === "delete") {
    const deleteHistory = input.deleteHistory === true;
    return await bearerOperation(
      session,
      "DELETE",
      `${targetPath}${deleteHistory ? "?all=true" : ""}`,
    );
  }

  throw new Error(`Unknown deck action: ${action}`);
}

async function tokenRequest(session, form) {
  return await formOperation(session, "POST", "/v2/oauth/token", form);
}

async function formOperation(session, method, path, form) {
  const body = new URLSearchParams(form).toString();
  return await requestOperation(session, method, path, {
    body,
    contentType: "application/x-www-form-urlencoded",
    displayBody: redactForm(form),
  });
}

async function bearerOperation(session, method, path, body) {
  const accessToken = requireAccessToken(session);
  return await requestOperation(session, method, path, {
    accessToken,
    ...(body === undefined
      ? {}
      : {
          body: JSON.stringify(body),
          contentType: "application/json",
          displayBody: body,
        }),
  });
}

async function requestOperation(session, method, path, options = {}) {
  const url = apiUrl(session, path);
  const headers = { Accept: "application/json" };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  if (options.contentType) headers["Content-Type"] = options.contentType;

  const upstreamResponse = await fetch(url, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: options.body }),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const responseBody = await readUpstreamBody(upstreamResponse);

  return {
    at: new Date().toISOString(),
    request: {
      method,
      url: url.toString(),
      ...(options.displayBody === undefined
        ? {}
        : { body: options.displayBody }),
    },
    response: {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: Object.fromEntries(upstreamResponse.headers.entries()),
      body: responseBody,
    },
  };
}

function updateTokensFromOperation(session, operation) {
  if (operation.response.status < 200 || operation.response.status >= 300) {
    return false;
  }

  const body = operation.response.body;
  if (!isObject(body)) return false;
  if (typeof body.access_token !== "string") return false;
  if (typeof body.refresh_token !== "string") return false;

  session.tokens = { ...body, receivedAt: new Date().toISOString() };
  return true;
}

function isSuccessfulOperation(operation) {
  return operation.response.status >= 200 && operation.response.status < 300;
}

function parseManifestTargets(value) {
  if (!Array.isArray(value)) {
    throw new Error("Manifest response does not contain a decks array");
  }

  return value.map((item) => {
    const deck = requireObject(item);
    const source = parseSource(requireString(deck, "source"));
    const id = deck.id;
    if (source === "account" && typeof id === "string") return { source, id };
    if (source === "arkhamdb" && Number.isInteger(id) && id > 0) {
      return { source, id };
    }
    throw new Error("Manifest contains an invalid deck target");
  });
}

function getSession(request, response) {
  pruneSessions();
  const cookies = parseCookies(request.headers.cookie ?? "");
  const existingId = cookies.get(sessionCookieName);
  const existingSession = existingId ? sessions.get(existingId) : undefined;

  if (existingSession) {
    existingSession.lastSeenAt = Date.now();
    return existingSession;
  }

  const id = randomUUID();
  const session = {
    config: { ...defaultConfig },
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  };
  sessions.set(id, session);
  response.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=${id}; HttpOnly; SameSite=Lax; Path=/`,
  );
  return session;
}

function sessionView(session) {
  return {
    config: session.config,
    tokens: session.tokens ?? null,
    pendingAuthorization: session.pendingAuthorization != null,
    lastOperation: session.lastOperation ?? null,
  };
}

function parseClientConfig(input) {
  const apiBase = normalizeApiBase(requireString(input, "apiBase"));
  const clientId = requireString(input, "clientId").trim();
  const clientSecret = requireString(input, "clientSecret").trim();
  if (!clientId) throw new Error("Client ID is required");
  if (!clientSecret) throw new Error("Client secret is required");

  return { apiBase, clientId, clientSecret, redirectUri };
}

function requireConfiguredClient(session) {
  if (!session.config.clientId || !session.config.clientSecret) {
    throw new Error("Save a client ID and client secret first");
  }
}

function requireAccessToken(session) {
  const token = session.tokens?.access_token;
  if (typeof token !== "string" || !token) {
    throw new Error("Connect or refresh to get an access token first");
  }
  return token;
}

function requireRefreshToken(session) {
  const token = session.tokens?.refresh_token;
  if (typeof token !== "string" || !token) {
    throw new Error("Connect to get a refresh token first");
  }
  return token;
}

function requireToken(session, type) {
  return type === "access"
    ? requireAccessToken(session)
    : requireRefreshToken(session);
}

function parseScopes(value) {
  if (
    !Array.isArray(value) ||
    value.some((scope) => typeof scope !== "string")
  ) {
    throw new Error("Scopes must be an array of strings");
  }
  const scopes = [...new Set(value)];
  if (!scopes.includes("profile:read")) {
    throw new Error("profile:read is required");
  }
  return scopes;
}

function parseTokenType(value) {
  if (value === "access" || value === "refresh") return value;
  throw new Error("Token type must be access or refresh");
}

function parseOptionalSource(value) {
  if (value == null || value === "") return undefined;
  return parseSource(value);
}

function parseSource(value) {
  if (value === "account" || value === "arkhamdb") return value;
  throw new Error("Deck source must be account or arkhamdb");
}

function normalizeApiBase(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API base URL must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "API base URL cannot contain credentials, a query, or a hash",
    );
  }
  return url.toString().replace(/\/$/, "");
}

function apiUrl(session, path) {
  return new URL(path, `${session.config.apiBase}/`);
}

function redactForm(form) {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
      key,
      ["client_secret", "code", "refresh_token", "token"].includes(key)
        ? "[redacted]"
        : value,
    ]),
  );
}

function localErrorOperation(label, message) {
  return {
    at: new Date().toISOString(),
    request: { method: "GET", url: label },
    response: {
      status: 400,
      statusText: "Local validation error",
      headers: {},
      body: { error: "invalid_callback", message },
    },
  };
}

function redirectToApp(response, result) {
  response.writeHead(303, {
    Location: `/?oauth=${encodeURIComponent(result)}`,
    "Cache-Control": "no-store",
  });
  response.end();
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (declaredLength > requestBodyLimitBytes) {
    throw new Error("Request body exceeds 1 MiB");
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > requestBodyLimitBytes) {
      throw new Error("Request body exceeds 1 MiB");
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Request body must contain valid JSON");
  }
}

async function readUpstreamBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function parseCookies(header) {
  return new Map(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([name, value]) => name && value)
      .map(([name, value]) => [name, decodeURIComponent(value)]),
  );
}

function pruneSessions() {
  const oldestAllowed = Date.now() - sessionMaxIdleMilliseconds;
  for (const [id, session] of sessions) {
    if (session.lastSeenAt < oldestAllowed) sessions.delete(id);
  }
}

function requireObject(value) {
  if (!isObject(value)) throw new Error("Expected a JSON object");
  return value;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(object, key) {
  const value = object[key];
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value;
}

function readOptionalString(object, key) {
  const value = object[key];
  if (value == null) return undefined;
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value;
}

function parsePort(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error("OAUTH_TEST_CLIENT_PORT must be a valid TCP port");
  }
  return parsed;
}

async function loadStaticFiles() {
  const definitions = [
    ["/", "./public/index.html", "text/html; charset=utf-8"],
    ["/app.js", "./public/app.js", "text/javascript; charset=utf-8"],
    ["/styles.css", "./public/styles.css", "text/css; charset=utf-8"],
  ];
  const entries = await Promise.all(
    definitions.map(async ([route, path, contentType]) => [
      route,
      {
        content: await readFile(new URL(path, import.meta.url)),
        contentType,
      },
    ]),
  );
  return new Map(entries);
}
