import { useMutation } from "@tanstack/react-query";
import { useStore } from "@/store";

export function useDismissBannerMutation() {
  const dismissBanner = useStore((state) => state.dismissBanner);

  return useMutation({
    mutationKey: ["app", "dismiss-banner"],
    mutationFn: (bannerId: string) => dismissBanner(bannerId),
  });
}

export function useRestoreBackupMutation() {
  const restore = useStore((state) => state.restore);

  return useMutation({
    mutationKey: ["app", "restore-backup"],
    mutationFn: (file: File) => restore(file),
  });
}
