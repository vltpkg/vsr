// get openapi schema
import { API } from './src/api.js'

// get logos
import IMAGES_VLT from './src/assets/images/vlt.js'
import IMAGES_NPM from './src/assets/images/npm.js'
import IMAGES_YARN from './src/assets/images/yarn.js'
import IMAGES_PNPM from './src/assets/images/pnpm.js'
import IMAGES_DENO from './src/assets/images/deno.js'
import IMAGES_BUN from './src/assets/images/bun.js'
import IMAGES_BG from './src/assets/images/bg.js'

// the packages to proxy
export const PROXIES = []

// allows for globally accessible docs endpoints
export const EXPOSE_DOCS = true

// a global scope that can be used for all packages/registry
export const SCOPE_PACKAGES = false
export const SCOPE = ''

// the global scope/glob pattern for all packages
export const ANY_PACKAGE_SPEC = `${SCOPE}/*`

// the domain the registry is hosted on
export const DOMAIN = 'http://localhost'

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
  defaultHttpClient: {
    targetKey: 'curl',
    clientKey: 'fetch',
  },
  authentication: {
    http: {
      bearer: {
        token: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      }
    }
  },
  hiddenClients: {
    node: ['axios', 'native', 'undici', 'request', 'unirest'],
    javascript: ['axios', 'xhr', 'jquery'],
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
    powershell: true,
    ocaml: true,
    curl: false,
    http: true,
    php: ['http1', 'http2', 'curl'],
  },
  spec: {
    content: API
  },
  customCss: `
.open-api-client-button {
  display: none !important;
}
:root {
  --scalar-text-decoration: underline;
}
.light-mode {
  --scalar-background-1: #fff;
  --scalar-background-2: #f7f7f7;
  --scalar-background-3: #e7e7e7;
  --scalar-background-accent: #8ab4f81f;

  --scalar-color-1: #2a2f45;
  --scalar-color-2: #757575;
  --scalar-color-3: #8e8e8e;

  --scalar-color-accent: var(--scalar-color-1);
  --scalar-border-color: rgba(0, 0, 0, 0.1);
}
.dark-mode {
  --scalar-background-1: #000;
  --scalar-background-2: #0f0f0f;
  --scalar-background-3: #1d1d1d;

  --scalar-color-1: rgba(255, 255, 255, 0.9);
  --scalar-color-2: rgba(255, 255, 255, 0.62);
  --scalar-color-3: rgba(255, 255, 255, 0.44);

  --scalar-color-accent: var(--scalar-color-1);
  --scalar-background-accent: #3ea6ff1f;

  --scalar-border-color: rgba(255, 255, 255, 0.15);
}
/* Document Sidebar */
.light-mode .t-doc__sidebar,
.dark-mode .t-doc__sidebar {
  --scalar-sidebar-background-1: var(--scalar-background-1);
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-border-color: var(--scalar-border-color);

  --scalar-sidebar-item-hover-background: var(--scalar-background-2);
  --scalar-sidebar-item-hover-color: currentColor;

  --scalar-sidebar-item-active-background: var(--scalar-background-2);
  --scalar-sidebar-color-active: var(--scalar-color-1);

  --scalar-sidebar-search-background: transparent;
  --scalar-sidebar-search-color: var(--scalar-color-3);
  --scalar-sidebar-search-border-color: var(--scalar-border-color);
}

/* advanced */
.light-mode {
  --scalar-color-green: #069061;
  --scalar-color-red: #ef0006;
  --scalar-color-yellow: #edbe20;
  --scalar-color-blue: #0082d0;
  --scalar-color-orange: #fb892c;
  --scalar-color-purple: #5203d1;

  --scalar-button-1: rgba(0, 0, 0, 1);
  --scalar-button-1-hover: rgba(0, 0, 0, 0.8);
  --scalar-button-1-color: rgba(255, 255, 255, 0.9);
}
.dark-mode {
  --scalar-color-green: #00b648;
  --scalar-color-red: #dc1b19;
  --scalar-color-yellow: #ffc90d;
  --scalar-color-blue: #4eb3ec;
  --scalar-color-orange: #ff8d4d;
  --scalar-color-purple: #b191f9;

  --scalar-button-1: rgba(255, 255, 255, 1);
  --scalar-button-1-hover: rgba(255, 255, 255, 0.9);
  --scalar-button-1-color: black;
}
/* custom stuff for vlt */
.introduction-section {
  position: static !important;
}
.introduction-section:before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background: url('${IMAGES_BG}');
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: .3;
  mask-image: linear-gradient( 135deg ,transparent 60%, black 100%)
}
.dark-mode .introduction-section:before {
  filter: invert(1);
  opacity: .4;
}
.introduction-section .section-columns {
  position: relative;
}
.introduction-description table,
.introduction-description table tbody,
.introduction-description table tbody tr {
  display: flex !important;
  overflow: hidden !important;
}
.introduction-description table {
  width: 90% !important;
  border: none !important;
  box-shadow: none !important;
}
.introduction-description table tbody,
.introduction-description table tbody tr {
  width: 100% !important;
  border: none !important;
}
.introduction-description table tbody {
  flex-wrap: wrap !important;
}
.introduction-description table td {
  padding: 0 !important;
  width: 33.3333% !important;
  display: flex !important;
  border: none !important;
}
.introduction-description table a {
  box-sizing: border-box !important;
  padding: 0 !important;
  width: 100% !important;
  display: block !important;
  outline: none !important;
  border: none !important;
  width: 100% !important;
  height: 65px !important;
  text-indent: -9999px !important;
  white-space: nowrap !important;
  background-size: 60px auto !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  transition: transform 0.25s !important;
}
.introduction-description table a:hover {
  transform: scale(1.25) !important;
}
.introduction-description table a[title="vlt"] {
  background-image: url('${IMAGES_VLT}') !important;
}
.introduction-description table a[title="npm"] {
  background-image: url('${IMAGES_NPM}') !important;
}
.introduction-description table a[title="yarn"] {
  background-image: url('${IMAGES_YARN}') !important;
}
.introduction-description table a[title="pnpm"] {
  background-image: url('${IMAGES_PNPM}') !important;
}
.introduction-description table a[title="deno"] {
  background-image: url('${IMAGES_DENO}') !important;
}
.introduction-description table a[title="bun"] {
  background-image: url('${IMAGES_BUN}') !important;
}
  `
}
