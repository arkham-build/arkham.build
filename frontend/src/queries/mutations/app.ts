import { useMutation } from "@tanstack/react-query";
import { useStore } from "@/store";

export function useDismissBannerMutation() {
  const dismissBanner = useStore((state) => state.dismissBanner);

  return useMutation({
    mutationKey: ["app", "dismiss-banner"],
    mutationFn: (bannerId: string) => dismissBanner(bannerId),
  });
}
