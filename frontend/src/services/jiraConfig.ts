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
  return {
    url: import.meta.env.VITE_JIRA_URL || '',
    email: import.meta.env.VITE_JIRA_EMAIL || '',
    apiToken: import.meta.env.VITE_JIRA_API_TOKEN_2 || import.meta.env.VITE_JIRA_API_TOKEN_1 || '',
    projectKey: 'SCRUM',
  }
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
      isConfigured: true,
    }
  }

  // Fallback to environment variables
  const envConfig = getEnvJiraConfig()
  if (isValidJiraConfig(envConfig)) {
    console.log('✅ [JiraConfig] Using environment variable config')
    return {
      ...envConfig,
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
    localStorage.setItem('jira_config', JSON.stringify(config))
    console.log('✅ [JiraConfig] Config saved to localStorage')
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
