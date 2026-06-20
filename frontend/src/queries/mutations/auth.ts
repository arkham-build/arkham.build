import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { toRemoteSettings } from "@/store/lib/settings-sync";
import { isSyncedStorageProvider } from "@/store/lib/sync";
import { useHttpClient } from "@/store/services/http-client.context";
import {
  deletePendingEmailChange,
  disconnectOAuthIdentity,
  patchUpdateCredentials,
  postCompleteProfile,
  postCreateEmailIdentity,
  postForgotPassword,
  postResendVerification,
  postResetPassword,
  postSignup,
  postVerifyEmail,
} from "@/store/services/requests/auth";
import { getLocalFolderSyncState } from "@/store/slices/sync";

export function useLoginMutation() {
  const client = useHttpClient();
  const login = useStore((state) => state.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: (payload: Parameters<typeof login>[1]) =>
      login(client, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: authKeys.session(),
      });
    },
  });
}

export function useLogoutMutation() {
  const client = useHttpClient();
  const logout = useStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: () => logout(client),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.session(), null);
      void queryClient.invalidateQueries({
        queryKey: authKeys.session(),
      });
    },
  });
}

export function useAccountSyncMutation() {
  const client = useHttpClient();
  const bootstrapAuthenticatedState = useStore(
    (state) => state.bootstrapAuthenticatedState,
  );

  return useMutation({
    mutationKey: ["auth", "sync-account"],
    mutationFn: () => bootstrapAuthenticatedState(client),
  });
}

export function useDeleteAccountMutation() {
  const client = useHttpClient();
  const deleteAccount = useStore((state) => state.deleteAccount);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "delete-account"],
    mutationFn: () => deleteAccount(client),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.session(), null);
      void queryClient.invalidateQueries({
        queryKey: authKeys.session(),
      });
    },
  });
}

export function useSignupMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "signup"],
    mutationFn: (payload: Parameters<typeof postSignup>[1]) =>
      postSignup(client, payload),
  });
}

export function useForgotPasswordMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "forgot-password"],
    mutationFn: (payload: Parameters<typeof postForgotPassword>[1]) =>
      postForgotPassword(client, payload),
  });
}

export function useResetPasswordMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "reset-password"],
    mutationFn: (payload: Parameters<typeof postResetPassword>[1]) =>
      postResetPassword(client, payload),
  });
}

export function useVerifyEmailMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "verify-email"],
    mutationFn: (payload: Parameters<typeof postVerifyEmail>[1]) =>
      postVerifyEmail(client, payload),
  });
}

export function useResendVerificationMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "resend-verification"],
    mutationFn: (payload: Parameters<typeof postResendVerification>[1]) =>
      postResendVerification(client, payload),
  });
}

type CompleteProfileOnboardingPayload = Parameters<
  typeof postCompleteProfile
>[1] & {
  uploadDecks: boolean;
  uploadSettings: boolean;
};

export function useCompleteProfileOnboardingMutation() {
  const client = useHttpClient();
  const queryClient = useQueryClient();
  const applyCompleteProfileResponse = useStore(
    (state) => state.applyCompleteProfileResponse,
  );
  const refreshSession = useStore((state) => state.refreshSession);
  const syncDecks = useStore((state) => state.syncDecks);

  return useMutation({
    mutationKey: ["auth", "complete-profile-onboarding"],
    mutationFn: async (payload: CompleteProfileOnboardingPayload) => {
      const response = await postCompleteProfile(
        client,
        getCompleteProfilePayload(payload),
      );

      applyCompleteProfileResponse(response);
      await refreshSession(client);
      await syncDecks(client);
    },
    onSuccess: () => {
      queryClient.setQueryData(
        authKeys.session(),
        useStore.getState().auth.session,
      );
    },
  });
}

function getCompleteProfilePayload(payload: CompleteProfileOnboardingPayload) {
  const state = useStore.getState();
  const uploads = {
    decks: payload.uploadDecks ? getLocalDeckUploads() : undefined,
    folders: getLocalFolderSyncState(state.data),
    settings: payload.uploadSettings
      ? {
          collection: state.settings.collection,
          settings: toRemoteSettings(state.settings),
        }
      : undefined,
  };

  return {
    username: payload.username,
    uploads,
  };
}

function getLocalDeckUploads() {
  const state = useStore.getState();

  return Object.values(state.data.decks)
    .filter((deck) => !isSyncedStorageProvider(deck.source))
    .map((deck) => ({
      ...deck,
      source: "account" as const,
    }));
}

export function useCreateEmailIdentityMutation() {
  const client = useHttpClient();
  const initSession = useStore((state) => state.initSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "create-email-identity"],
    mutationFn: (payload: Parameters<typeof postCreateEmailIdentity>[1]) =>
      postCreateEmailIdentity(client, payload),
    onSuccess: async () => {
      await initSession(client);
      queryClient.setQueryData(
        authKeys.session(),
        useStore.getState().auth.session,
      );
    },
  });
}

export function useUpdateCredentialsMutation() {
  const client = useHttpClient();
  const initSession = useStore((state) => state.initSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "update-credentials"],
    mutationFn: (payload: Parameters<typeof patchUpdateCredentials>[1]) =>
      patchUpdateCredentials(client, payload),
    onSuccess: async () => {
      await initSession(client);
      queryClient.setQueryData(
        authKeys.session(),
        useStore.getState().auth.session,
      );
    },
  });
}

export function useCancelPendingEmailChangeMutation() {
  const client = useHttpClient();
  const initSession = useStore((state) => state.initSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "cancel-pending-email-change"],
    mutationFn: () => deletePendingEmailChange(client),
    onSuccess: async () => {
      await initSession(client);
      queryClient.setQueryData(
        authKeys.session(),
        useStore.getState().auth.session,
      );
    },
  });
}

export function useDisconnectOAuthIdentityMutation() {
  const client = useHttpClient();
  const initSession = useStore((state) => state.initSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "disconnect-oauth-identity"],
    mutationFn: (provider: string) => disconnectOAuthIdentity(client, provider),
    onSuccess: async () => {
      await initSession(client);
      queryClient.setQueryData(
        authKeys.session(),
        useStore.getState().auth.session,
      );
    },
  });
}
