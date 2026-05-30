const pendingScripts = new Map<string, Promise<HTMLScriptElement>>();

export function injectScript(src: string): Promise<HTMLScriptElement> {
  const existingScript = getExistingScript(src);

  if (existingScript?.dataset.loaded === "true") {
    return Promise.resolve(existingScript);
  }

  const pendingScript = pendingScripts.get(src);
  if (pendingScript) return pendingScript;

  const script = existingScript ?? document.createElement("script");

  const promise = new Promise<HTMLScriptElement>((resolve, reject) => {
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve(script);
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => {
        pendingScripts.delete(src);
        reject(new Error(`Failed to load script: ${src}`));
      },
      { once: true },
    );
  });

  pendingScripts.set(src, promise);

  if (!existingScript) {
    script.src = src;
    script.async = true;
    script.defer = true;
    document.head.append(script);
  }

  return promise;
}

function getExistingScript(src: string) {
  return document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
}
