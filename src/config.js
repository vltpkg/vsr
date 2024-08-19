import { API } from './api.js'

// the global scope for all packages/registry
export const SCOPE = '@gsap'

// the global scope/glob pattern for all packages
export const ANY_PACKAGE_SPEC = `${SCOPE}/*`

// the domain the registry is hosted on
export const DOMAIN = 'https://gsap.vlt.sh'

// the time in seconds to cache the registry
export const REQUEST_TIMEOUT = 60 * 1000

// the docs configuration for the API reference
export const API_DOCS = {
  hideModels: false,
  hideDownloadButton: true,
  defaultHttpClient: {
    targetKey: 'javascript',
    clientKey: 'fetch',
  },
  hiddenClients: {
    php: false,
    python: true,
    c: true,
    node: ['native', 'undici', 'request', 'unirest'],
    javascript: ['axios', 'xhr'],
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
    powershell: true,
    ocaml: true,
    curl: false,
    http: false,
  },
  spec: {
    content: API
  }
}
