import { assert } from "@/utils/assert";
import type { StoreState } from "../slices";

export type TabSyncEvent = {
  state: Partial<StoreState>;
};

type TabSyncListener = (message: TabSyncEvent) => void;

export class TabSync {
  broadcastChannel?: BroadcastChannel;
  listeners: TabSyncListener[] = [];

  constructor() {
    this.connect();
  }

  send(state: Partial<StoreState>, retry = 0) {
    if (import.meta.env.MODE === "test") return;

    assert(this.broadcastChannel, "BroadcastChannel is not initialized");

    try {
      console.debug("[tab-sync] sending state");

      this.broadcastChannel.postMessage({
        state,
      });
    } catch (err) {
      if (retry < 1 && err instanceof DOMException) {
        this.connect();
        this.send(state, retry + 1);
      } else {
        throw err;
      }
    }
  }

  addListener(listener: TabSyncListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: TabSyncListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  connect() {
    if (this.broadcastChannel) this.broadcastChannel.close();
    this.broadcastChannel = new BroadcastChannel("deckbuilder-sync");
    this.broadcastChannel.addEventListener("message", this.onMessage);
  }

  private onMessage = (evt: MessageEvent) => {
    if (!this.isSupportedMessage(evt.data)) return;

    for (const listener of this.listeners) {
      listener(evt.data);
    }
  };

  private isSupportedMessage(message: unknown): message is TabSyncEvent {
    return typeof message === "object" && message != null && "state" in message;
  }
}
