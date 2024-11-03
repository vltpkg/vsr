# **vlt** serverless registry (`vsr`)

`vsr` aims to be a minimal "npm-compatible" registry which replicates the core features found in `registry.npmjs.org` as well as adding net-new capabilities.

**Table of Contents:**

- [Quick Starts](#quick-starts)
- [Requirements](#requirements)
- [Features](#features)
- [API](#api)
- [Compatibility](#compatibility)
- [License](#license)

### Quick Starts

#### Production

You can deploy `vsr` to [Cloudflare](https://www.cloudflare.com/) in under 5 minutes, for free, with a single click.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/vltpkg/vsr)

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

##### Admin

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

### Documentation

#### `GET /@<org>/<package>/`
- Returns all published packages metadata for the specific package name
- TTL: ~5min

#### `GET /@<org>/<package>/<version|dist-tag>`
- Returns full package manifest for specific version
- TTL: ~1yr for versions
- TTL: ~5min for dist-tags

#### `POST /@<org>/<package>/`
- Publish

#### `GET /-/whoami`
- Returns username associated with auth token

```
$ npm whoami
darcyclarke
```

#### `GET /-/npm/v1/user`
- Returns profile object associated with auth token

```
$ npm profile
name: darcyclarke
created: 2015-02-26T01:26:01.124Z
updated: 2023-01-10T21:55:32.118Z
```

#### `PUT /-/org/@<org>/<user>`
- Adds/updates a user (requires admin privileges)

#### `PUT /-/npm/v1/user`
- Updates a user (requires auth)

#### `GET /-/npm/v1/tokens`
- Get tokens for the associative authenticated user

```
$ npm token list

<token-type> token <partial-token>… with id <uuid> created <date-created>
```

#### `POST /-/npm/v1/tokens/`

- Creates a token for configured user (requires admin priveleges)

```
$ npm token create
....
```

#### `DELETE /-/npm/v1/tokens/token/<token>`
- Revokes a token for the associative authenticated user

```
$ npm token revoke <token>
```

#### `DELETE /-/npm/v1/user/<uuid>`
- Deletes a user (requires admin privileges)

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
| ❌ | `adduser` |
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
| ❌ | `profile set` |
| ✅ | `publish` |
| ✅ | `repo` |
| ❌ | `search` |
| ❌ | `star` |
| ❌ | `team` |
| ✅ | `view` |
| ✅ | `whoami` |

- ✅ supported
- ❌ unsupported

### Competitive Breakdown

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
