import { del, get, set } from "idb-keyval";
import type { StorageValue } from "zustand/middleware";

import type { DataVersion } from "../services/queries.types";
import type { Val } from "./storage.types";

export class IndexedDBAdapter<T extends StorageValue<Val>> {
  appdataName(name: string) {
    return `${name}-app`;
  }

  metadataName(name: string) {
    return `${name}-metadata`;
  }

  metadataKey(name: string) {
    return `${name}-data-version`;
  }

  getDataVersionIdentifier(dataVersion?: DataVersion, storeVersion = 1) {
    return dataVersion
      ? `${dataVersion.locale}_${dataVersion.cards_updated_at}_${dataVersion.translation_updated_at}_${storeVersion}`
      : undefined;
  }

  setMetadata(name: string, value: T) {
    const key = this.metadataKey(name);

    const currentDataVersion = this.getDataVersionIdentifier(
      value.state.metadata.dataVersion,
      value.version,
    );

    if (!currentDataVersion) {
      console.debug("[persist] skip: store is uninitialized.");
      return;
    }

    if (currentDataVersion === localStorage.getItem(key)) {
      console.debug("[persist] skip: stored metadata is in sync.");
      return;
    }

    console.debug("[persist] save: stored metadata is out of sync.");
    localStorage.setItem(key, currentDataVersion);

    const payload = JSON.stringify({
      state: {
        metadata: value.state.metadata,
      },
      version: value.version,
    });

    return set(this.metadataName(name), payload);
  }

  setAppdata(name: string, value: T) {
    console.debug("[persist] save app data.");

    const payload = JSON.stringify({
      state: {
        data: value.state.data,
        deckEdits: value.state.deckEdits,
        settings: value.state.settings,
      },
      version: value.version,
    });

    return set(this.appdataName(name), payload);
  }

  async getAppdata(name: string) {
    const data = await get(this.appdataName(name));
    if (!data) return null;
    return JSON.parse(data);
  }

  async getMetadata(name: string) {
    const key = this.metadataKey(name);

    const data = await get(this.metadataName(name));

    if (!data) {
      console.debug("[persist] no metadata found in storage.");
      // the item may have been deleted by the user, ensure storage key is purged as well.
      localStorage.removeItem(key);
      return null;
    }

    const parsed = JSON.parse(data);

    const version = this.getDataVersionIdentifier(
      parsed?.state?.metadata?.dataVersion,
      parsed?.version,
    );

    if (!version) throw new TypeError("stored data is missing version.");

    localStorage.setItem(key, version);
    console.debug(`[persist] rehydrated card version: ${version}`);
    return parsed;
  }

  removeAppdata(name: string) {
    return del(this.appdataName(name));
  }

  removeMetadata(name: string) {
    return del(this.metadataName(name));
  }

  removeIdentifier(name: string) {
    try {
      localStorage.removeItem(this.metadataKey(name));
    } catch (err) {
      console.error("could not clear local storage:", err);
    }
  }
}
