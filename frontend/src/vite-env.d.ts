/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Endereço público do frontend usado nos QR Codes (ex.: http://192.168.0.10:5173) */
  readonly VITE_PUBLIC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
