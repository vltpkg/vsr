
# Tokens & scopes

VSR uses [Better Auth](https://better-auth.com)'s API Key plugin for
CLI and programmatic access. Keys are prefixed `vsr_pat_` and minted
from the [tokens dashboard](/dashboard/tokens) or via
`POST /-/tokens`.

Each key carries one or more **scopes** stored in the `token_scopes`
table. A scope describes what packages and users the key can read or
write.

## Scope shape

A scope entry contains:

- **`values`** — array of selectors (see below)
- **`types`** — permission bits per target:
  - `pkg.read` / `pkg.write` — package access
  - `user.read` / `user.write` — user access

Write access requires read access for the same target.

### Value selectors

| Selector | Meaning |
| --- | --- |
| `*` | Wildcard — all packages or all users |
| `@scope/pkg` | Exact package name |
| `@scope/*` | All packages in a scope |
| `~username` | Specific user (by name reference) |

> User/org/team management via `@<scope>` alone is not supported at
> the moment.

## Minting keys

### Web UI

1. Sign in at `/dashboard/tokens`.
2. Click **Create token**, optionally set a name and scopes.
3. Copy the plaintext `vsr_pat_…` value — it is shown exactly once.

### HTTP API

```bash
curl -X POST http://localhost:1337/-/tokens \
  -H "Authorization: Bearer vsr_pat_…" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ci-publish",
    "scope": [{
      "values": ["@myorg/*"],
      "types": { "pkg": { "read": true, "write": true } }
    }]
  }'
```

### Seed script (admin bootstrap)

```bash
ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD='a-strong-password' \
  vlr db:seed
```

The seed script creates an admin user, mints a key, and grants
wildcard `pkg` + `user` scopes.

## Common personas

### End-user / subscriber

Read access to a specific package; read+write on their own user record.

```json
[
  {
    "values": ["@organization/package-name"],
    "types": { "pkg": { "read": true } }
  },
  {
    "values": ["~johnsmith"],
    "types": { "user": { "read": true, "write": true } }
  }
]
```

### Team member / maintainer

Read+write on all packages in a scope; read+write on their user record.

```json
[
  {
    "values": ["@organization/*"],
    "types": { "pkg": { "read": true, "write": true } }
  },
  {
    "values": ["~johnsmith"],
    "types": { "user": { "read": true, "write": true } }
  }
]
```

### CI publish token

Read+write on a specific package for automated publishes.

```json
[
  {
    "values": ["@organization/package-name"],
    "types": { "pkg": { "read": true, "write": true } }
  }
]
```

### Organization admin

Full read+write on all packages and users in an org scope.

```json
[
  {
    "values": ["@company/*"],
    "types": {
      "pkg": { "read": true, "write": true },
      "user": { "read": true, "write": true }
    }
  }
]
```

### Registry owner / admin

Wildcard access to everything.

```json
[
  {
    "values": ["*"],
    "types": {
      "pkg": { "read": true, "write": true },
      "user": { "read": true, "write": true }
    }
  }
]
```

## Authentication paths

| Path | Mechanism | Used by |
| --- | --- | --- |
| Web UI | Better Auth session cookie | Browser dashboard |
| CLI / API | `Authorization: Bearer vsr_pat_…` | npm, vlt, curl |

Both paths resolve to the same user identity. The web origin proxies
`/-/*` to the registry worker so cookies are first-party.

See the [API reference](/docs/api) for endpoint-level auth
requirements.
