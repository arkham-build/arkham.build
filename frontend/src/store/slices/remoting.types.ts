/**
 * The locks state tracks whether certain actions are locked or not.
 * This is synced across tabs and windows.
 * Note that this does not interfere with the locks that we use for arkhamdb operations,
 * it is only used for UI state.
 */
export type RemotingState = {
  arkhamdb: boolean;
  sync: boolean;
};

export type RemotingSlice = {
  remoting: RemotingState;

  setRemoting(name: keyof RemotingState, value: boolean): void;
};
