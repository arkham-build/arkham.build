/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAGE_NAME: string;
  readonly VITE_ADMIN_EMAIL: string;
  readonly VITE_LEGAL_NOTICE: string;
  readonly VITE_API_LEGACY_URL: string;
  readonly VITE_CARD_IMAGE_URL: string;
  readonly VITE_ARKHAMDB_BASE_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
