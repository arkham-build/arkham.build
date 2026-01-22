/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAGE_NAME: string;
  readonly VITE_API_LEGACY_URL: string;
  readonly VITE_CARD_IMAGE_URL: string;
  readonly VITE_ARKHAMDB_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
