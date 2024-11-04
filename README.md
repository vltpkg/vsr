# **vlt** serverless registry (`vsr`)

`vsr` aims to be a minimal "npm-compatible" registry which replicates the core features found in `registry.npmjs.org` as well as adding net-new capabilities.

<img src="https://github.com/user-attachments/assets/e76c6f8a-a078-4787-963c-8ec95a879731" alt="vsr api screenshot" />

**Table of Contents:**

- [Quick Starts](#quick-starts)
- [Requirements](#requirements)
- [Features](#features)
- [API](#api)
- [Compatibility](#compatibility)
- [License](#license)

### Quick Starts

#### Production

You can deploy `vsr` to [Cloudflare](https://www.cloudflare.com/) in under 5 minutes, for free, with a single click (coming soon).

<img src="https://github.com/user-attachments/assets/528deda2-4c20-44c9-b057-f07c2e2e3c71" alt="Deply to Cloudflare Workers" width="200" />

<!-- [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/vltpkg/vsr) -->

Alternatively, you can deploy to production using [`wrangler`](https://www.npmjs.com/package/wrangler) after following the **Development** quick start steps.

#### Development

```bash
# clone the repo
git clone https://github.com/vltpkg/vsr.git

# navigate to the repository directory
cd ./vsr

# install the project's dependencies
vlt install

# run tbe development script
vlr dev
```

### Requirements

#### Production

- [Cloudflare (free account at minimum)](https://www.cloudflare.com/en-ca/plans/developer-platform/)
  - Workers (free: 100k requests /day)
  - D1 Database (free: 100k writes, 5M reads /day & 5GB Storage /mo)
  - R2 Bucket (free: 1M writes, 10M reads & 10GB /mo)

> Note: all usage numbers & pricing documented is as of **October 24th, 2024**. Plans & metering is subject to change at Cloudflare's discretion.

#### Development

- `git`
- `node`
- `vlt`

### Features

| Status | Feature |
| :--: | :-- |
| ✅ | api: minimal package metadata |
| ✅ | api: full package manifests |
| ✅ | api: publishing private, scoped packages |
| ✅ | api: package manifest validation |
| ✅ | api: admin user management (add/update/remove users) |
| ✅ | api: user token management (add/update/remove tokens) |
| ✅ | web: docs portal |
| ⏳ | api: unscoped packages |
| ⏳ | api: unscoped packages |
| 🕤 | web: admin user management |
| 🕤 | web: user registration |
| 🕤 | web: user login (ex. `npm login` / `--auth-type=web`) |
| 🕤 | web: user account management |
| 🕤 | web & api: custom dist-tags (`latest`  is supported) |
| 🕤 | web & api: token rate-limiting |
| 🕤 | web & api: search |
| 🕤 | web & api: staging |

- ✅ implemented
- 🕤 planned to support

### Granular Access Tokens

All tokens are considered "granular access tokens" (GATs). Token entries in the database consist of 3 parts:

- `token` the unique token value
- `uuid` associative value representing a single user/scope
- `scope` value representing the granular access/privileges

#### `scope` as a JSON `Object`

A `scope` contains an array of privileges that define both the type(s) of & access value(s) for a token.

> [!NOTE]
> Tokens can be associated with multiple "types" of access

- `type(s)`:
  - `pkg:read` read associated packages
  - `pkg:read+write` write associated packages (requires read access)
  - `user:read` read associated user
  - `user:read+write` write associated user (requires read access)
- `value(s)`:
  - `*` an ANY selector for `user:` or `pkg:` access types
  - `~<user>` user selector for the `user:` access type
  - `@<scope>/<pkg>` package specific selector for the `pkg:` access type
  - `@<scope>/*` glob scope selector for `pkg:` access types

> [!NOTE]
> - user/org/team management via `@<scope>` is not supported at the moment

<details>

  <summary>Examples</summary>

##### Subscriber

```json
[
  {
    "values": ["@compabny/pro"],
    "types": {
      "pkg": {
        "read": true,
        "write": true,
      }
    }
  },
  {
    "values": ["~uuid-1234-5678"],
    "types": {
      "user": {
        "read": true,
        "write": true,
      }
    }
  }
]
```

##### Maintainer

```json
[
  {
    "values": ["@company/*"],
    "types": {
      "pkg": {
        "read": true,
        "write": true,
      }
    }
  }
]
```

##### Organization Admin

```json
[
  {
    "values": ["@company/*"],
    "types": {
      "pkg": {
        "read": true,
        "write": true
      }
    }
  },
   {
    "values": ["*"],
    "types": {
      "user": {
        "read": true,
        "write": true
      }
    }
  }
]
```

##### Owner

```json
[
  {
    "values": ["*"],
    "types": {
      "pkg": {
        "read": true,
        "write": true
      }
    }
  },
   {
    "values": ["*"],
    "types": {
      "user": {
        "read": true,
        "write": true
      }
    }
  }
]
```

</details>

### API

We have rich, interactive API docs out-of-the-box with the help of our friends [Scalar](https://scalar.com/). The docs can be found at the registry root when running `vsr` locally (ex. run `npx vltpkg/vsr` &/or check out this repo & run `npm run dev`)

### `npm` Client Compatibility

The following commands should work out-of-the-box with `npm` & any other `npm` "Compatible" clients although their specific commands & arguments may be vary (ex. `vlt`, `yarn`, `pnpm` & `bun`)

#### Configuration

To use a registry you must either pass the registry config through an flag (ex. `--registry=...` for `npm`) or define client-specific configuration which stores the reference to your registry (ex. `.npmrc` for `npm`)

```ini
; .npmrc
registry=https://registry.example.com
```

| Support | Commannd |
| :--: | :-- |
| ✅ | `access` |
| ✅ | `access list packages` |
| ✅ | `access get status` |
| ❌ | `access set status` |
| ❌ | `access set mfa` |
| ❌ | `access grant` |
| ❌ | `access revoke` |
| 🕤 | `adduser` - `PUT /-/org/@<org>/<user>`: Adds/updates a user (requires admin privileges) |
| ❌ | `audit` |
| ✅ | `bugs` |
| ❌ | `dist-tag add` |
| ❌ | `dist-tag rm` |
| ❌ | `dist-tag ls` |
| ✅ | `deprecate` |
| ✅ | `docs` |
| ✅ | `exec` |
| ❌ | `hook` |
| ✅ | `install` |
| ❌ | `login` |
| ❌ | `logout` |
| ❌ | `org` |
| ✅ | `outdated` |
| ❌ | `owner add` |
| ❌ | `owner rm` |
| ❌ | `owner ls` |
| ✅ | `ping` |
| ❌ | `profile enable-2fa` |
| ❌ | `profile disable-2fa` |
| ✅ | `profile get` |
| 🕤 | `profile set` - `PUT /-/npm/v1/user`: Updates a user (requires auth) |
| ✅ | `publish` |
| ✅ | `repo` |
| ❌ | `search` |
| ❌ | `star` |
| ❌ | `team` |
| ✅ | `view` |
| ✅ | `whoami` |

- ✅ supported
- ❌ unsupported

### Feature Comparisons

| Feature | `vsr` | `verdaccio` | `jsr` |
| -- | :-: | :-: | :-: |
| Serverless | ✅ | ❌ | ❌ |
| JavaScript Backend | ✅ | ✅ | ❌ |
| Granular Access/Permissions | ✅ | ✅ | ❌ |
| Proxy Upstream Registries | ✅ | ✅ | ❌ |
| Unscoped Package Names | ✅ | ✅ | ❌ |
| npm Package Publishing | ✅ | ✅ | ❌ |
| npm Package Installation | ✅ | ✅ | ✅<sup>*</sup> |
| CDN | ✅ | ❌ | ✅ |
| ESM | ✅ | ❌ | ✅ |
| Manifest Validation | ✅ | ❌ | ❌ |
| Plugins | ❌ | ✅ | ❌ |
| Events/Hooks | ❌ | ✅ | ❌ |
| Programmatic API | ❌ | ✅ | ❌ |
| Web Interface | ❌ | ✅ | ✅ |
| Search | ❌ | ✅ | ✅ |
| First-Class Typescript | ❌ | ❌ | ✅ |
| API Documentation Generation | ❌ | ❌ | ✅ |
| Multi-Cloud | ❌ | ✅ | ✅ |
| **Azure DevOps Artifacts** Upstream | ✅ | ✅ | ✅ |
| **JFrog Artifactory** Upstream | ✅ | ✅ | ❌ |
| **Google Artifact Registry** Upstream | ✅ | ✅ | ❌ |

```
* requires jsr-specific tooling or use a modified package name when using traditional npm clients (ref. https://jsr.io/docs/npm-compatibility)
```

### License

This project is licensed under the [Functional Source License](https://fsl.software) ([**FSL-1.1-MIT**](LICENSE.md)).
