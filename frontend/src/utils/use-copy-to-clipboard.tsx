import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast.hooks";

export function useCopyToClipboard() {
  const toast = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
      toast.show({
        children: "Could not write to clipboard",
        duration: 3000,
        variant: "error",
      });
    }
  };

  useEffect(() => {
    if (!isCopied) return;

    const timeout = setTimeout(() => {
      setIsCopied(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isCopied]);

  const value = { isCopied, copyToClipboard };

  return value;
}
