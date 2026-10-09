const defaultDeck = {
  description_md: "",
  exile_string: null,
  ignoreDeckLimitSlots: null,
  investigator_code: "01001",
  investigator_name: "Roland Banks",
  meta: "{}",
  name: "OAuth test deck",
  problem: null,
  sideSlots: null,
  slots: { "01006": 1 },
  taboo_id: null,
  tags: "",
  xp_adjustment: 0,
  xp_spent: 0,
  xp: 0,
};

const elements = {
  actionButtons: [...document.querySelectorAll("button")],
  apiBase: document.querySelector("#api-base"),
  clearAuth: document.querySelector("#clear-auth"),
  clientId: document.querySelector("#client-id"),
  clientSecret: document.querySelector("#client-secret"),
  configForm: document.querySelector("#config-form"),
  connect: document.querySelector("#connect"),
  connectionBadge: document.querySelector("#connection-badge"),
  deckCreate: document.querySelector("#deck-create"),
  deckDelete: document.querySelector("#deck-delete"),
  deckId: document.querySelector("#deck-id"),
  deckJson: document.querySelector("#deck-json"),
  deckRead: document.querySelector("#deck-read"),
  deckReplace: document.querySelector("#deck-replace"),
  deckSource: document.querySelector("#deck-source"),
  deckUpgrade: document.querySelector("#deck-upgrade"),
  deleteHistory: document.querySelector("#delete-history"),
  manifest: document.querySelector("#manifest"),
  manifestCount: document.querySelector("#manifest-count"),
  manifestVersion: document.querySelector("#manifest-version"),
  notice: document.querySelector("#notice"),
  operation: document.querySelector("#operation"),
  operationStatus: document.querySelector("#operation-status"),
  profile: document.querySelector("#profile"),
  redirectUri: document.querySelector("#redirect-uri"),
  refresh: document.querySelector("#refresh"),
  revokeAccess: document.querySelector("#revoke-access"),
  revokeRefresh: document.querySelector("#revoke-refresh"),
  scopes: document.querySelector("#scopes"),
  sync: document.querySelector("#sync"),
  syncCount: document.querySelector("#sync-count"),
  syncSource: document.querySelector("#sync-source"),
  tokens: document.querySelector("#tokens"),
};

let session;
elements.deckJson.value = pretty(defaultDeck);
registerEventHandlers();
await loadSession();
showCallbackNotice();

function registerEventHandlers() {
  elements.configForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void runAction("Settings saved", async () => {
      session = await api("/api/config", {
        method: "POST",
        body: {
          apiBase: elements.apiBase.value,
          clientId: elements.clientId.value,
          clientSecret: elements.clientSecret.value,
        },
      });
      renderSession();
    });
  });

  elements.connect.addEventListener("click", () => {
    void runAction("Opening authorization page", async () => {
      const checkedScopes = [
        ...elements.scopes.querySelectorAll("input:checked"),
      ].map((input) => input.value);
      const result = await api("/api/oauth/connect", {
        method: "POST",
        body: { scopes: checkedScopes },
      });
      window.location.assign(result.authorizationUrl);
    });
  });

  elements.profile.addEventListener("click", () => {
    void runOperation("Profile received", "/api/profile");
  });

  elements.refresh.addEventListener("click", () => {
    void refreshTokens();
  });

  elements.revokeAccess.addEventListener("click", () => {
    void revokeToken("access");
  });

  elements.revokeRefresh.addEventListener("click", () => {
    void revokeToken("refresh");
  });

  elements.clearAuth.addEventListener("click", () => {
    void runAction("Local tokens cleared", async () => {
      session = await api("/api/oauth/clear", { method: "POST" });
      renderSession();
      setOperation(null);
    });
  });

  elements.manifest.addEventListener("click", () => {
    void getManifest();
  });

  elements.sync.addEventListener("click", () => {
    void syncDecks();
  });

  elements.deckRead.addEventListener("click", () => {
    void deckAction("read");
  });
  elements.deckCreate.addEventListener("click", () => {
    void deckAction("create");
  });
  elements.deckReplace.addEventListener("click", () => {
    void deckAction("replace");
  });
  elements.deckUpgrade.addEventListener("click", () => {
    void deckAction("upgrade");
  });
  elements.deckDelete.addEventListener("click", () => {
    if (!window.confirm("Delete this deck from the selected provider?")) return;
    void deckAction("delete");
  });
}

async function loadSession() {
  session = await api("/api/session");
  renderSession();
  if (session.lastOperation) setOperation(session.lastOperation);
}

function renderSession() {
  elements.apiBase.value = session.config.apiBase;
  elements.clientId.value = session.config.clientId;
  elements.clientSecret.value = session.config.clientSecret;
  elements.redirectUri.value = session.config.redirectUri;
  elements.tokens.textContent = session.tokens
    ? pretty(session.tokens)
    : "No tokens";

  const connected = typeof session.tokens?.access_token === "string";
  elements.connectionBadge.textContent = connected
    ? `Connected · ${session.tokens.scope ?? "scope unavailable"}`
    : "Not connected";
  elements.connectionBadge.classList.toggle("connected", connected);
}

function showCallbackNotice() {
  const pageUrl = new URL(window.location.href);
  const result = pageUrl.searchParams.get("oauth");
  if (!result) return;

  const messages = {
    connected: "Authorization completed and tokens were received.",
    denied: "The authorization request was denied.",
    error:
      "The authorization flow did not complete. Inspect the response below.",
  };
  showNotice(
    messages[result] ?? `OAuth result: ${result}`,
    result === "connected",
  );
  pageUrl.searchParams.delete("oauth");
  window.history.replaceState({}, "", pageUrl);
}

async function refreshTokens() {
  await runAction("Tokens rotated", async () => {
    const operation = await api("/api/oauth/refresh", { method: "POST" });
    setOperation(operation);
    await loadSession();
    requireSuccessfulOperations(operation);
  });
}

async function revokeToken(tokenType) {
  await runAction(`${capitalize(tokenType)} token revoked`, async () => {
    const operation = await api("/api/oauth/revoke", {
      method: "POST",
      body: { tokenType },
    });
    setOperation(operation);
    await loadSession();
    requireSuccessfulOperations(operation);
  });
}

async function getManifest() {
  await runAction("Manifest received", async () => {
    const query = elements.syncSource.value
      ? `?source=${encodeURIComponent(elements.syncSource.value)}`
      : "";
    const operation = await api(`/api/decks/manifest${query}`);
    setOperation(operation);
    updateManifestMetrics(operation.response.body);
    requireSuccessfulOperations(operation);
  });
}

async function syncDecks() {
  await runAction("Deck synchronization completed", async () => {
    const result = await api("/api/decks/sync", {
      method: "POST",
      body: { source: elements.syncSource.value },
    });
    setOperation(result);
    updateManifestMetrics(result.manifest);
    elements.syncCount.textContent = String(result.decks.length);
    requireSuccessfulOperations(result);
  });
}

async function deckAction(action) {
  await runAction(`Deck ${action} request completed`, async () => {
    const body = {
      action,
      source: elements.deckSource.value,
      id: elements.deckId.value.trim(),
      deleteHistory: elements.deleteHistory.checked,
    };
    if (["create", "replace", "upgrade"].includes(action)) {
      body.deck = parseDeckEditor();
    }

    const operation = await api("/api/decks/action", {
      method: "POST",
      body,
    });
    setOperation(operation);
    copyDeckResponseToEditor(operation);
    requireSuccessfulOperations(operation);
  });
}

async function runOperation(successMessage, path, options) {
  await runAction(successMessage, async () => {
    const operation = await api(path, options);
    setOperation(operation);
    requireSuccessfulOperations(operation);
  });
}

async function runAction(successMessage, action) {
  setBusy(true);
  showNotice("Working…", true);
  try {
    await action();
    showNotice(successMessage, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    showNotice(message, false);
  } finally {
    setBusy(false);
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers:
      options.body === undefined ? {} : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      body.message ?? `Test client returned ${String(response.status)}`,
    );
  }
  return body;
}

function setOperation(value) {
  if (!value) {
    elements.operation.textContent =
      "Run an operation to see its request and response.";
    setStatusBadge("No request", "neutral");
    return;
  }

  elements.operation.textContent = pretty(value);
  const operations = Array.isArray(value.operations)
    ? value.operations
    : [value];
  const failed = operations.find(
    (operation) =>
      operation.response &&
      (operation.response.status < 200 || operation.response.status >= 300),
  );
  if (failed) {
    setStatusBadge(String(failed.response.status), "failed");
    return;
  }

  if (operations.length > 1) {
    setStatusBadge(`${String(operations.length)} requests · OK`, "connected");
    return;
  }

  const status = operations[0]?.response?.status;
  setStatusBadge(status ? `${String(status)} · OK` : "Complete", "connected");
}

function setStatusBadge(label, state) {
  elements.operationStatus.textContent = label;
  elements.operationStatus.className = `badge ${state}`;
}

function requireSuccessfulOperations(value) {
  const operations = Array.isArray(value.operations)
    ? value.operations
    : [value];
  const failed = operations.find(
    (operation) =>
      operation.response &&
      (operation.response.status < 200 || operation.response.status >= 300),
  );
  if (!failed) return;

  const body = failed.response.body;
  const detail = isObject(body)
    ? (body.message ?? body.error_description ?? body.error)
    : body;
  throw new Error(
    `Upstream returned ${String(failed.response.status)}${detail ? `: ${String(detail)}` : ""}`,
  );
}

function updateManifestMetrics(manifest) {
  if (!manifest || !Array.isArray(manifest.decks)) return;
  elements.manifestCount.textContent = String(manifest.decks.length);
  elements.manifestVersion.textContent = manifest.version ?? "—";
}

function copyDeckResponseToEditor(operation) {
  const status = operation.response.status;
  const deck = operation.response.body;
  if (status < 200 || status >= 300 || !isObject(deck) || !deck.id) return;

  elements.deckJson.value = pretty(deck);
  elements.deckId.value = String(deck.id);
  if (deck.source === "account" || deck.source === "arkhamdb") {
    elements.deckSource.value = deck.source;
  }
}

function parseDeckEditor() {
  try {
    const value = JSON.parse(elements.deckJson.value);
    if (!isObject(value)) throw new Error("Deck JSON must be an object");
    return value;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Deck JSON is invalid: ${error.message}`);
    }
    throw error;
  }
}

function setBusy(busy) {
  for (const button of elements.actionButtons) button.disabled = busy;
}

function showNotice(message, successful) {
  elements.notice.textContent = message;
  elements.notice.classList.toggle("success", successful);
  elements.notice.classList.toggle("error", !successful);
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
