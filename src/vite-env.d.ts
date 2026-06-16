/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_BASE_PATH: string
  readonly VITE_API_PROXY_TARGET: string
  readonly VITE_DEV_PORT: string
  readonly VITE_PREVIEW_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
