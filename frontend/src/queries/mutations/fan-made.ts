import { useMutation } from "@tanstack/react-query";
import { useStore } from "@/store";

export function useAddFanMadeProjectMutation() {
  const addFanMadeProject = useStore((state) => state.addFanMadeProject);

  return useMutation({
    mutationKey: ["fan-made", "add-project"],
    mutationFn: (payload: unknown) => addFanMadeProject(payload),
  });
}

export function useRemoveFanMadeProjectMutation() {
  const removeFanMadeProject = useStore((state) => state.removeFanMadeProject);

  return useMutation({
    mutationKey: ["fan-made", "remove-project"],
    mutationFn: (id: string) => removeFanMadeProject(id),
  });
}
