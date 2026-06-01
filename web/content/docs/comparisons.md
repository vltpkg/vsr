
# Registry comparisons

| Feature | **vsr** | **npm** | **GitHub** | **Verdaccio** | **JSR** | **jFrog** | **Sonatype** | **Cloudsmith** | **Buildkite** | **Bit** |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| License | `FSL-1.1-MIT` | Closed Source | Closed Source | `MIT` | `MIT` | Closed Source | Closed Source | Closed Source | Closed Source | Closed Source |
| Authored Language | `JavaScript` | `JavaScript` | `Ruby`/`Go` | `TypeScript` | `Rust` | — | — | — | — | — |
| Publishing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Installation | ✅ | ✅ | ✅ | ✅ | ✴️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scoped Packages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Unscoped Packages | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Proxying Upstream Sources | ✅ | ❌ | ✴️ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Hosted Instance | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hosted Instance Cost | `$` | — | `$$$$` | — | — | `$$$$` | `$$$$` | `$$$$` | `$$$` | `$$$` |
| Self-Hosted Instance | ✅ | ❌ | ✴️ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Self-Hosted Instance Cost | 🆓 | — | `$$$$$` | `$` | `$` | `$$$$$` | `$$$$$` | — | — | — |
| Hosted Public Packages | ⏳ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Hosted Private Packages | ⏳ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Hosted Private Package Cost | — | `$$` | 🆓 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🆓 |
| Granular Access/Permissions | ✅ | ✴️ | ❌ | ✅ | ❌ | ✴️ | ✴️ | ✴️ | ✴️ | ❌ |
| Manifest Validation | ✅ | ✴️ | ❌ | ❌ | ✴️ | ✴️ | ✴️ | ❌ | ❌ | ❌ |
| Audit | 🕤 | ✴️ | ❌ | ✴️ | ✴️ | ✴️ | ✴️ | ✴️ | ❌ | ❌ |
| Events/Hooks | 🕤 | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Plugins | 🕤 | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Multi-Cloud | 🕤 | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Documentation Generation | 🕤 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✴️ |
| Unpackaged Files/ESM Imports | 🕤 | ❌ | ❌ | ❌ | ✴️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Variant Support | 🕤 | ❌ | ❌ | ❌ | ✴️ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Legend

- ✅ implemented
- ✴️ supported with caveats
- ⏳ in-progress
- 🕤 planned
- ❌ unsupported
- `$` expense estimation (0–5)

## Where vsr fits

vsr targets teams that want **npm-compatible private hosting** on
Cloudflare's edge with **granular access control**, **upstream
proxying**, and a **zero-config local dev experience** — without
operating dedicated registry infrastructure.

For setup and deployment, see [Getting started](/docs/getting-started)
and [Deployment](/docs/deploy).
