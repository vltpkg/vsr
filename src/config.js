// get openapi schema
import { API } from './api.js'

// the packages to proxy
export const PROXIES = []

// allows for globally accessible docs endpoints
export const EXPOSE_DOCS = true

// a global scope that can be used for all packages/registry
export const SCOPE_PACKAGES = false
export const SCOPE = ''

// the global scope/glob pattern for all packages
export const ANY_PACKAGE_SPEC = '*'

// the time in seconds to cache the registry
export const REQUEST_TIMEOUT = 60 * 1000

// the docs configuration for the API reference
export const API_DOCS = {
  metaData: {
    title: 'vlt serverless registry'
  },
  hideModels: false,
  hideDownloadButton: false,
  darkMode: false,
  favicon: '/images/favicon/favicon.svg',
  defaultHttpClient: {
    targetKey: 'curl',
    clientKey: 'fetch',
  },
  authentication: {
    http: {
      bearer: {
        token: DMNO_CONFIG.BEARER_TOKEN,
      },
      basic: {
        username: DMNO_CONFIG.BASIC_AUTH_USER,
        password: DMNO_CONFIG.BASIC_AUTH_PASSWORD,
      }
    }
  },
  hiddenClients: {
    python: true,
    c: true,
    go: true,
    java: true,
    ruby: true,
    shell: ['httpie', 'wget', 'fetch'],
    clojure: true,
    csharp: true,
    kotlin: true,
    objc: true,
    swift: true,
    r: true,
    powershell: false,
    ocaml: true,
    curl: false,
    http: true,
    php: false,
    node: ['request', 'unirest'],
    javascript: ['xhr', 'jquery']
  },
  spec: {
    content: API
  },
  customCss: `@import '${DMNO_CONFIG.REGISTRY_URL}/styles/styles.css';`
}
