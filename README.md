# vlt serverless registry (`vsr`)

## TODOs

- [x] setup worker (domain + bindings)
- [x] setup bucket (permissions + bindings)
- [x] setup db (structure + bindings)
- [x] add check for upgrade attack (ie. user grants themselves admin perms)
- [x] migrate users into `tokens` (maybe change this to "users")
- [x] migrate packages into `versions`
- [x] add custom logic to handle `@gsap/shockingly` = `@gsap/premium` | `@gsap/simply` = `@gsap/pro`
- [x] setup cloudflare access/event logs
- [x] add OpenAPI & Scalar docs
- [ ] add sentry error logging
- [ ] add rate limitter
- [ ] write tests

### Support

`vsr` aims to be a minimal "npm-compatible" private registry which replicates the core features found in `registry.npmjs.org` as well as adding net-new capabilities required to service transitive users.

| Status | Feature | Support |
| :--: | :-- | :--: |
| ☑️ | caching | ✅ |
| ☑️ | rate limiting | ✅ |
| ☑️ | error logs | ✅ |
| ✅ | user activity logs | ✅ |
| ✅ | fetch minimal package metadata | ✅ |
| ✅ | fetch full package manifests | ✅ |
| ✅ | publishing private, scoped packages | ✅ |
| ✅ | package manifest validation | ✅ |
| ✅ | user token management (add/remove) | ✅ |
| ✅ | admin/owner user management (add/update/remove) | ✅ |
| | user web registration | 🕤 |
| | user web login (ex. `npm login` / `--auth-type=web`) | 🕤 |
| | user web account management | 🕤 |
| | admin/owner user web account management | 🕤 |
| | custom dist-tags (`latest`  is supported) | 🕤 |
| | token rate-limiting | 🕤 |
| | search | 🕤 |
| | staging | 🕤 |

- 🕤 planned to support

### `npm` Compatible Commands

| Support | Commannd |
| :--: | :-- |
| ✅ | `npm access` |
| ✅ | `npm access list packages` |
| ✅ | `npm access get status` |
| ❌ | `npm access set status` |
| ❌ | `npm access set mfa` |
| ❌ | `npm access grant` |
| ❌ | `npm access revoke` |
| ❌ | `npm adduser` |
| ❌ | `npm audit` |
| ✅ | `npm bugs` |
| ❌ | `npm dist-tag add` |
| ❌ | `npm dist-tag rm` |
| ❌ | `npm dist-tag ls` |
| ✅ | `npm docs` |
| ✅ | `npm exec` |
| ❌ | `npm hook` |
| ✅ | `npm install` |
| ❌ | `npm login` |
| ❌ | `npm logout` |
| ❌ | `npm org` |
| ✅ | `npm outdated` |
| ❌ | `npm owner add` |
| ❌ | `npm owner rm` |
| ❌ | `npm owner ls` |
| ✅ | `npm ping` |
| ❌ | `npm profile enable-2fa` |
| ❌ | `npm profile disable-2fa` |
| ✅ | `npm profile get` |
| ❌ | `npm profile set` |
| ✅ | `npm publish` |
| ✅ | `npm repo` |
| ❌ | `npm search` |
| ❌ | `npm star` |
| ❌ | `npm team` |
| ✅ | `npm view` |
| ✅ | `npm whoami` |

### Production Requirements

- Cloudflare
  - Workers
  - D1 Database
  - R2 Bucket

### Development Requirements

- `node`
- `npm`
- `wrangler`

### Configuration

- `wrangler.toml`

### Installation

1. Clone this repo `gh repo clone @vltpkg/vsr`
2. Install dependencies `npm install`
3. Create a **D1 DB** `wrangler d1 create vsr-<org-name>`
  - Take the output & add to `wrangler.toml` config, ex.

```toml
# example
[[d1_databases]]
binding = "DB" # sets env.DB which is available in configured workers
database_name = "vsr-<org-name>"
database_id = "<automatically-generated-id>"
```

4. Create a **R2 Bucket** `wrangler r2 bucket vsr-<org-name>`
  - Add a `r2_buckets` entry to `wrangler.toml` config, ex.

```toml
[[r2_buckets]]
binding = "BUCKET" # sets env.BUCKET which is available in configured workers
bucket_name = "vsr-<org-name>"
```

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
> - unscoped package names are not supported at the moment
> - user/org/team management via `@<scope>` is not supported at the moment

##### `pkg:read=@gsap/pro|user:read+write=~uuid-1234-5678` - `@gsap` subscriber

```json
[
  {
    "values": ["@gsap/pro"],
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

##### `pkg:read+write=@gsap/*` - `@gsap` team maintainer

```json
[
  {
    "values": ["@gsap/*"],
    "types": {
      "pkg": {
        "read": true,
        "write": true,
      }
    }
  }
]
```

##### `pkg:read+write=@gsap/*|user:read+write=*` - `@gsap` admin/owner

```json
[
  {
    "values": ["@gsap/*"],
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

#### `scope` as a `String`

A `scope` can also be represented as a string: `[[<type>,...]=[<value>,...]|...]`

Examples:
- `pkg:read+write=@gsap/*` gives maintainer access
- `pkg:read+write=@gsap/*|user:read+write=*` gives admin access
- `pkg:read=@gsap/*|pkg:write=@gsap/pro` scoped
- `user:read+write=~uuid|pkg:read=@gsap/pro` specific user read + write & package read
- `pkg:read=@gsap/premium` - premium
- `pkg:read=@gsap/business` - business

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
