/**
 * JIRA Configuration Helper
 * Handles JIRA config from multiple sources with fallback mechanism
 * Priority: localStorage > VITE environment variables > defaults
 */

export interface JiraConfig {
  url: string
  email: string
  apiToken: string
  projectKey?: string
  isConfigured: boolean
}

/**
 * Get JIRA configuration from environment variables (VITE_JIRA_*)
 */
const getEnvJiraConfig = (): Partial<JiraConfig> => {
  const config = {
    url: import.meta.env.VITE_JIRA_URL || '',
    email: import.meta.env.VITE_JIRA_EMAIL || '',
    apiToken: import.meta.env.VITE_JIRA_API_TOKEN_2 || import.meta.env.VITE_JIRA_API_TOKEN_1 || '',
    projectKey: 'SCRUM',
  }
  console.log('🔍 [JiraConfig] Environment vars:', {
    url: !!config.url,
    email: !!config.email,
    apiToken: !!config.apiToken,
    VITE_JIRA_URL: !!import.meta.env.VITE_JIRA_URL,
    VITE_JIRA_EMAIL: !!import.meta.env.VITE_JIRA_EMAIL,
    VITE_JIRA_API_TOKEN_1: !!import.meta.env.VITE_JIRA_API_TOKEN_1,
    VITE_JIRA_API_TOKEN_2: !!import.meta.env.VITE_JIRA_API_TOKEN_2,
  })
  return config
}

/**
 * Get JIRA configuration from localStorage
 */
const getLocalStorageJiraConfig = (): Partial<JiraConfig> => {
  try {
    const stored = localStorage.getItem('jira_config')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to parse stored JIRA config:', e)
  }
  return {}
}

/**
 * Normalize JIRA URL - remove trailing slashes
 */
const normalizeJiraUrl = (url: string): string => {
  if (!url) return url
  return url.trim().replace(/\/$/, '') // Remove trailing slash if present
}

/**
 * Check if JIRA configuration is valid and complete
 */
const isValidJiraConfig = (config: Partial<JiraConfig>): config is JiraConfig => {
  return !!(config.url?.trim() && config.email?.trim() && config.apiToken?.trim())
}

/**
 * Get the complete JIRA configuration with fallback mechanism
 * Priority: localStorage > environment variables > empty config
 */
export const getJiraConfig = (): JiraConfig => {
  // Try localStorage first
  const localConfig = getLocalStorageJiraConfig()
  if (isValidJiraConfig(localConfig)) {
    console.log('✅ [JiraConfig] Using localStorage config')
    return {
      ...localConfig,
      url: normalizeJiraUrl(localConfig.url),
      isConfigured: true,
    }
  }

  // Fallback to environment variables
  const envConfig = getEnvJiraConfig()
  if (isValidJiraConfig(envConfig)) {
    console.log('✅ [JiraConfig] Using environment variable config')
    return {
      ...envConfig,
      url: normalizeJiraUrl(envConfig.url),
      isConfigured: true,
    }
  }

  // No valid config found
  console.warn('⚠️ [JiraConfig] No valid JIRA configuration found')
  return {
    url: '',
    email: '',
    apiToken: '',
    projectKey: 'SCRUM',
    isConfigured: false,
  }
}

/**
 * Save JIRA configuration to localStorage
 */
export const saveJiraConfig = (config: Partial<JiraConfig>) => {
  try {
    // Normalize URL before saving
    const normalizedConfig = {
      ...config,
      url: config.url ? normalizeJiraUrl(config.url) : '',
    }
    localStorage.setItem('jira_config', JSON.stringify(normalizedConfig))
    console.log('✅ [JiraConfig] Config saved to localStorage (URL normalized)')
  } catch (e) {
    console.error('Failed to save JIRA config:', e)
  }
}

/**
 * Clear JIRA configuration from localStorage
 */
export const clearJiraConfig = () => {
  try {
    localStorage.removeItem('jira_config')
    console.log('✅ [JiraConfig] Config cleared from localStorage')
  } catch (e) {
    console.error('Failed to clear JIRA config:', e)
  }
}

/**
 * Check if JIRA is configured (either in env or localStorage)
 */
export const isJiraConfigured = (): boolean => {
  const config = getJiraConfig()
  return config.isConfigured
}
