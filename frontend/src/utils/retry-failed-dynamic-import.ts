export function retryFailedDynamicImport() {
  if (!window.location.hash.includes("retry_failed_dynamic_import")) {
    window.location.hash = "retry_failed_dynamic_import";
    window.location.reload();
  }
}
