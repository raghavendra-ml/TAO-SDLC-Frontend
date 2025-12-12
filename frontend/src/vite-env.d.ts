/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JIRA_URL: string
  readonly VITE_JIRA_EMAIL: string
  readonly VITE_JIRA_API_TOKEN_1: string
  readonly VITE_JIRA_API_TOKEN_2: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
