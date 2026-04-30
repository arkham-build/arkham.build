import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { useHttpClient } from "@/store/services/http-client.context";
import {
  postCompleteProfile,
  postForgotPassword,
  postResendVerification,
  postResetPassword,
  postSignup,
  postVerifyEmail,
} from "@/store/services/requests/auth";

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

export function useCompleteProfileMutation() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "complete-profile"],
    mutationFn: (payload: Parameters<typeof postCompleteProfile>[1]) =>
      postCompleteProfile(client, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: authKeys.session(),
      });
    },
  });
}
