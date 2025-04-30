// workaround for https://github.com/vitejs/vite/issues/11804:
// reload the page to allow the browser to pick up updated dynamic imports.
export function retryFailedDynamicImport(err: Error): never {
  if (
    (err as Error)?.message.includes(
      "Failed to fetch dynamically imported module",
    ) &&
    !window.location.hash.includes("retry_failed_dynamic_import")
  ) {
    window.location.hash = "retry_failed_dynamic_import";
    window.location.reload();
  }
  throw err;
}
