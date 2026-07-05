import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  CardTagsState,
  CompleteProfileResponse,
} from "@arkham-build/shared";
import { expect, type Page, test } from "@playwright/test";
import { getDatabase } from "../../../backend/src/db/db.ts";
import { importDeckFromFile, upgradeDeck } from "../../e2e/tests/actions.ts";
import { waitForAccountSync } from "../lib/account-sync.ts";
import { authorizeArkhamDbOAuth, createArkhamDbUser } from "../lib/arkhamdb.ts";
import { login } from "../lib/auth.ts";
import { apiUrl, databaseUrl } from "../lib/env.ts";
import { waitForEmailVerificationUrl } from "../lib/mailcrab.ts";

const password = "SecurePassword123!";
const archiveFolderId = "archive";

type PersistedDeck = {
  id: string;
  name: string;
  next_deck: string | null;
  previous_deck: string | null;
};

type AccountDeckRow = {
  id: string;
  name: string;
  next_deck: string | null;
  prev_deck: string | null;
};

type PersistedAppState = {
  state?: {
    data?: {
      decks?: Record<
        string,
        {
          id?: number | string;
          name?: string;
          next_deck?: number | string | null;
          previous_deck?: number | string | null;
        }
      >;
    };
    cardTags?: Partial<CardTagsState>;
    settings?: {
      defaultEnvironment?: string;
    };
  };
};

test.describe("signup onboarding", () => {
  test("connects ArkhamDB while completing an email signup", async ({
    page,
  }) => {
    const email = testEmail();
    const username = testUsername();
    const arkhamDbUser = await createArkhamDbUser();

    await signupAndOpenCompleteProfile(page, email);
    await page.getByRole("link", { name: "Connect" }).click();
    await authorizeArkhamDbOAuth(page, arkhamDbUser);

    await expect(page).toHaveURL(/\/auth\/signup\/complete$/);
    await completeProfile(page, username);

    await openAccountSettings(page);
    await expect(page.getByTestId("connection-status")).toHaveText("Connected");
  });

  test("uploads local decks and remaps conflicting deck ids", async ({
    page,
  }) => {
    const email = testEmail();
    const username = testUsername();
    const conflictingDeck = await importLocalDeck(page, "hunch_deck.json", {
      navigate: "view",
    });
    const conflictingChain = await upgradeCurrentDeckTwice(
      page,
      conflictingDeck.name,
    );
    const otherDeck = await importLocalDeck(page, "ythian.json", {
      navigate: "view",
    });
    const otherChain = await upgradeCurrentDeckTwice(page, otherDeck.name);
    const conflictingDeckId = conflictingChain[1].id;

    await createConflictingAccountDeck(conflictingDeckId);
    await signupAndOpenCompleteProfile(page, email);

    const response = await completeProfile(page, username);
    const deckIdMap = response.uploads?.deckIdMap ?? {};
    const remappedId = deckIdMap[conflictingDeckId];

    expect(remappedId).toBeDefined();
    expect(remappedId).not.toBe(conflictingDeckId);

    const decks = await getAccountDecks(email);
    expect(decks).toHaveLength(6);
    expectUploadedChain(decks, conflictingChain, deckIdMap);
    expectUploadedChain(decks, otherChain, deckIdMap);
  });

  test("does not upload local decks when the deck upload option is unchecked", async ({
    page,
  }) => {
    const email = testEmail();
    const username = testUsername();
    const deck = await importLocalDeck(page, "deck_size_all_specials.json");

    await signupAndOpenCompleteProfile(page, email);
    await page.getByTestId("upload-decks").click();
    await completeProfile(page, username);

    await expect(
      page.getByTestId(`collection-deck-${deck.name}`),
    ).toBeVisible();
    await expectAccountDeckCount(email, 0);
  });

  test("uploads settings while completing signup", async ({ page }) => {
    const email = testEmail();
    const username = testUsername();

    await page.goto("/settings");
    await page
      .getByTestId("settings-default-environment")
      .selectOption("current");
    await page.getByTestId("settings-save").click();
    await waitForPersistedDefaultEnvironment(page, "current");

    await signupAndOpenCompleteProfile(page, email);
    await completeProfile(page, username);

    const settings = await getAccountSettings(email);
    expect(settings).toMatchObject({ defaultEnvironment: "current" });
  });

  test("uploads card tags while completing signup", async ({ page }) => {
    const email = testEmail();
    const username = testUsername();
    const tagName = "Onboarding Tag";

    await page.goto("/card/01020");
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await createCardTag(page, tagName);
    await signupAndOpenCompleteProfile(page, email);
    await completeProfile(page, username);
    const cardTagState = await getAccountCardTagState(email);

    expect(cardTagState.tags).toContain(tagName);
    expect(cardTagState.cardTags["01020"]).toContain(tagName);
  });

  test("uploads archive folder state while completing signup", async ({
    page,
  }) => {
    const email = testEmail();
    const username = testUsername();
    const deck = await importLocalDeck(page, "xp_required.json", {
      navigate: "view",
    });

    await toggleArchiveStatus(page);
    await signupAndOpenCompleteProfile(page, email);
    await completeProfile(page, username);

    await waitForAccountSync(page);
    await expectDeckInFolder(page, deck.name, "Archive");

    const folderState = await getAccountFolderState(email);
    expect(folderState.deckFolders[String(deck.id)]).toBe(archiveFolderId);
  });

  test("remaps folder membership when an uploaded deck id changes", async ({
    page,
  }) => {
    const email = testEmail();
    const username = testUsername();
    const deck = await importLocalDeck(page, "bonded.json", {
      navigate: "view",
    });

    await toggleArchiveStatus(page);
    await createConflictingAccountDeck(String(deck.id));
    await signupAndOpenCompleteProfile(page, email);

    const response = await completeProfile(page, username);
    const remappedId = response.uploads?.deckIdMap?.[String(deck.id)];

    expect(remappedId).toBeDefined();
    expect(remappedId).not.toBe(String(deck.id));

    await waitForAccountSync(page);
    await expectDeckInFolder(page, deck.name, "Archive");

    const folderState = await getAccountFolderState(email);
    const remappedDeckId = remappedId as string;
    expect(folderState.deckFolders[String(deck.id)]).toBeUndefined();
    expect(folderState.deckFolders[remappedDeckId]).toBe(archiveFolderId);
  });
});

async function signupAndOpenCompleteProfile(page: Page, email: string) {
  await page.goto("/auth/signup");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#confirm-password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(
    page.getByText(
      "Signed up successfully! Please check your email to verify your account. You'll choose a username after your first login.",
    ),
  ).toBeVisible();

  const verificationUrl = await waitForEmailVerificationUrl(email);
  await page.goto(verificationUrl);
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);

  await login(page, email, password);
  await expect(page).toHaveURL(/\/auth\/signup\/complete$/);
}

async function completeProfile(page: Page, username: string) {
  await page.locator("#username").fill(username);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/v2/account/auth/complete-profile` &&
      response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Complete your profile" }).click();

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as CompleteProfileResponse;

  await expect(page).toHaveURL(/\/$/);

  return body;
}

async function importLocalDeck(
  page: Page,
  deckPath: string,
  options: { navigate?: "view" | "edit" } = {},
) {
  const deck = await readDeckFixture(deckPath);

  await importDeckFromFile(page, deckPath, options);

  if (!options.navigate) {
    await expect(
      page.getByTestId(`collection-deck-${deck.name}`),
    ).toBeVisible();
  }

  await expect.poll(() => findPersistedDeckId(page, deck.name)).not.toBeNull();

  const id = await findPersistedDeckId(page, deck.name);
  expect(id).not.toBeNull();

  return {
    id: id as string,
    name: deck.name,
  };
}

async function upgradeCurrentDeckTwice(page: Page, deckName: string) {
  await upgradeDeck(page, 5);
  await upgradeDeck(page, 3);
  await expect(page.getByTestId("latest-upgrade-summary")).toContainText(
    "0 of 8 XP spent",
  );

  return await waitForPersistedDeckChain(page, deckName, 3);
}

function expectUploadedChain(
  decks: AccountDeckRow[],
  localChain: PersistedDeck[],
  deckIdMap: Record<string, string>,
) {
  const ids = localChain.map((deck) => deckIdMap[deck.id] ?? deck.id);

  for (const [index, id] of ids.entries()) {
    const row = decks.find((deck) => deck.id === id);
    expect(row).toBeDefined();
    expect(row?.prev_deck).toBe(index === 0 ? null : ids[index - 1]);
    expect(row?.next_deck).toBe(
      index === ids.length - 1 ? null : ids[index + 1],
    );
  }
}

async function createCardTag(page: Page, tagName: string) {
  const cardTags = page.getByTestId("card-tags-01020");
  await cardTags.getByTestId("combobox-input").click();
  await cardTags.getByTestId("combobox-input").fill(tagName);
  await page.getByTestId(`combobox-menu-item-create:${tagName}`).click();
  await expect(cardTags.getByText(tagName, { exact: true })).toBeVisible();
  await waitForPersistedCardTag(page, tagName);
}

async function readDeckFixture(deckPath: string) {
  const filePath = path.join(
    import.meta.dirname,
    "../../fixtures/decks",
    deckPath,
  );
  const value = JSON.parse(await readFile(filePath, "utf8")) as {
    name: string;
  };

  return value;
}

async function findPersistedDeckId(page: Page, deckName: string) {
  const state = await readPersistedAppState(page);
  const deck = Object.values(state.state?.data?.decks ?? {}).find(
    (item) => item.name === deckName,
  );

  return deck?.id == null ? null : String(deck.id);
}

async function waitForPersistedDeckChain(
  page: Page,
  deckName: string,
  length: number,
) {
  await expect
    .poll(async () => (await readPersistedDeckChain(page, deckName))?.length)
    .toBe(length);

  const chain = await readPersistedDeckChain(page, deckName);
  expect(chain).not.toBeNull();

  return chain as PersistedDeck[];
}

async function readPersistedDeckChain(page: Page, deckName: string) {
  const state = await readPersistedAppState(page);
  const decks = Object.values(state.state?.data?.decks ?? {}).flatMap(
    (deck): PersistedDeck[] => {
      if (deck.id == null || deck.name !== deckName) return [];

      return [
        {
          id: String(deck.id),
          name: deck.name,
          next_deck: normalizeDeckReference(deck.next_deck),
          previous_deck: normalizeDeckReference(deck.previous_deck),
        },
      ];
    },
  );

  if (!decks.length) return null;

  const first = decks.find((deck) => deck.previous_deck == null);
  if (!first) return null;

  const byId = new Map(decks.map((deck) => [deck.id, deck]));
  const chain: PersistedDeck[] = [];
  let current: PersistedDeck | undefined = first;

  while (current) {
    chain.push(current);

    if (!current.next_deck) break;
    current = byId.get(current.next_deck);

    if (chain.length > decks.length) return null;
  }

  return chain.length === decks.length ? chain : null;
}

async function waitForPersistedCardTag(page: Page, tagName: string) {
  await expect
    .poll(async () => {
      const state = await readPersistedAppState(page);
      const tags = state.state?.cardTags?.tags;
      return Array.isArray(tags) && tags.includes(tagName);
    })
    .toBe(true);
}

async function waitForPersistedDefaultEnvironment(
  page: Page,
  expected: "current" | "legacy",
) {
  await expect
    .poll(async () => {
      const state = await readPersistedAppState(page);
      return state.state?.settings?.defaultEnvironment;
    })
    .toBe(expected);
}

async function readPersistedAppState(page: Page): Promise<PersistedAppState> {
  const stored = await page.evaluate(async () => {
    return await new Promise<string | null>((resolve) => {
      const request = indexedDB.open("keyval-store");

      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("keyval")) {
          db.close();
          resolve(null);
          return;
        }

        const transaction = db.transaction("keyval", "readonly");
        const getRequest = transaction
          .objectStore("keyval")
          .get("deckbuilder-app");

        getRequest.onerror = () => {
          db.close();
          resolve(null);
        };
        getRequest.onsuccess = () => {
          const result: unknown = getRequest.result;
          db.close();
          resolve(typeof result === "string" ? result : null);
        };
      };
    });
  });

  return stored ? (JSON.parse(stored) as PersistedAppState) : {};
}

async function createConflictingAccountDeck(deckId: string) {
  const db = getDatabase(databaseUrl);

  try {
    const account = await db
      .insertInto("account")
      .values({ name: `conflict-${randomUUID()}` })
      .returning("id")
      .executeTakeFirstOrThrow();

    await db
      .insertInto("deck")
      .values({
        account_id: account.id,
        id: deckId,
        investigator_code: "01001",
        investigator_name: "Roland Banks",
        meta: {},
        name: `conflict-${deckId}`,
        provider_type: "account",
        slots: { "01006": 1 },
        version: "0.1",
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  } finally {
    await db.destroy();
  }
}

async function getAccountDecks(email: string) {
  const db = getDatabase(databaseUrl);

  try {
    return await db
      .selectFrom("deck")
      .innerJoin(
        "account_identity",
        "account_identity.account_id",
        "deck.account_id",
      )
      .select(["deck.id", "deck.name", "deck.next_deck", "deck.prev_deck"])
      .where("account_identity.email", "=", email)
      .where("deck.provider_type", "=", "account")
      .orderBy("deck.name")
      .execute();
  } finally {
    await db.destroy();
  }
}

async function expectAccountDeckCount(email: string, count: number) {
  await expect.poll(() => getAccountDecks(email)).toHaveLength(count);
}

async function getAccountSettings(email: string) {
  const db = getDatabase(databaseUrl);

  try {
    const row = await db
      .selectFrom("account_settings")
      .innerJoin(
        "account_identity",
        "account_identity.account_id",
        "account_settings.account_id",
      )
      .select("account_settings.settings")
      .where("account_identity.email", "=", email)
      .executeTakeFirstOrThrow();

    return row.settings;
  } finally {
    await db.destroy();
  }
}

async function getAccountCardTagState(email: string) {
  const db = getDatabase(databaseUrl);

  try {
    const row = await db
      .selectFrom("account_card_tag")
      .innerJoin(
        "account_identity",
        "account_identity.account_id",
        "account_card_tag.account_id",
      )
      .select("account_card_tag.state")
      .where("account_identity.email", "=", email)
      .executeTakeFirstOrThrow();

    return row.state as CardTagsState;
  } finally {
    await db.destroy();
  }
}

async function getAccountFolderState(email: string) {
  const db = getDatabase(databaseUrl);

  try {
    const row = await db
      .selectFrom("account_folder")
      .innerJoin(
        "account_identity",
        "account_identity.account_id",
        "account_folder.account_id",
      )
      .select("account_folder.state")
      .where("account_identity.email", "=", email)
      .executeTakeFirstOrThrow();

    return row.state as {
      deckFolders: Record<string, string>;
      folders: Record<string, unknown>;
    };
  } finally {
    await db.destroy();
  }
}

async function toggleArchiveStatus(page: Page) {
  await page.getByTestId("view-more-actions").click();
  await page.getByTestId("view-archive").click();
  await page.getByTestId("view-more-actions").press("Escape");
}

async function expectDeckInFolder(
  page: Page,
  deckName: string,
  folderName: string,
) {
  await page.goto("/");
  const folder = page.getByTestId(`collection-folder-${folderName}`);
  await expect(folder).toBeVisible();
  await folder.click();
  await expect(page.getByTestId(`collection-deck-${deckName}`)).toBeVisible();
}

async function openAccountSettings(page: Page) {
  await page.goto("/");
  await page.getByTestId("masthead-settings").click();
  await expect(page.getByTestId("tab-account")).toBeVisible();
  await page.getByTestId("tab-account").click();
}

function normalizeDeckReference(value: number | string | null | undefined) {
  return value == null ? null : String(value);
}

function testEmail() {
  return `${testUsername()}@example.com`;
}

function testUsername() {
  return `e2e-onboarding-${randomUUID()}`;
}
