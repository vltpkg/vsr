#!/usr/bin/env node

/**
 * Seed a default admin user and api-key against a running VSR
 * instance.
 *
 * Reads from the environment:
 *   - ADMIN_EMAIL     (required) e.g. admin@example.com
 *   - ADMIN_PASSWORD  (required) at least 8 characters
 *   - ADMIN_NAME      (optional) display name, defaults to 'admin'
 *   - VSR_URL         (optional) base URL, defaults to http://localhost:1337
 *
 * Steps:
 *   1. POST  /-/auth/sign-up/email     → creates the admin user
 *   2. POST  /-/auth/api-key/create    → mints `default-admin` api-key
 *   3. PUT   /-/tokens                 → grants global pkg+user scope
 *
 * Prints the new api-key once on success. Operators MUST capture it.
 *
 * Re-running the script against an existing admin email is a no-op
 * for step 1 (it just signs in) and additive for steps 2-3 (creates
 * another key). Use `npm token revoke <id>` to remove obsolete keys.
 */

import { exit, env } from 'node:process'

const required = (name) => {
  const value = env[name]
  if (!value) {
    console.error(`Missing required env: ${name}`)
    exit(1)
  }
  return value
}

const ADMIN_EMAIL = required('ADMIN_EMAIL')
const ADMIN_PASSWORD = required('ADMIN_PASSWORD')
const ADMIN_NAME = env.ADMIN_NAME || 'admin'
const VSR_URL = (env.VSR_URL || 'http://localhost:1337').replace(
  /\/$/,
  '',
)

function parseSetCookies(res) {
  const raw =
    typeof res.headers.getSetCookie === 'function' ?
      res.headers.getSetCookie()
    : res.headers.get('set-cookie')
        ?.split(/,(?=[^;]+=[^;]+)/g) ?? []
  return raw.map((c) => c.split(';')[0]).filter(Boolean).join('; ')
}

async function postJSON(path, body, cookies) {
  const res = await fetch(`${VSR_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookies ? { cookie: cookies } : {}),
    },
    body: JSON.stringify(body),
  })
  return res
}

async function putJSON(path, body, cookies) {
  const res = await fetch(`${VSR_URL}${path}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      ...(cookies ? { cookie: cookies } : {}),
    },
    body: JSON.stringify(body),
  })
  return res
}

async function main() {
  console.error(`Seeding admin against ${VSR_URL} …`)

  // 1. Sign up (or fall back to sign-in if the email already exists).
  let signupRes = await postJSON('/-/auth/sign-up/email', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    name: ADMIN_NAME,
  })

  let cookies
  if (signupRes.ok) {
    cookies = parseSetCookies(signupRes)
    console.error(`  ✓ created user ${ADMIN_EMAIL}`)
  } else {
    const text = await signupRes.text()
    if (/USER_ALREADY_EXISTS|already exists/i.test(text)) {
      console.error(
        `  • user ${ADMIN_EMAIL} already exists, signing in …`,
      )
      const signinRes = await postJSON('/-/auth/sign-in/email', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      })
      if (!signinRes.ok) {
        console.error(`  ✗ sign-in failed: ${await signinRes.text()}`)
        exit(1)
      }
      cookies = parseSetCookies(signinRes)
    } else {
      console.error(`  ✗ sign-up failed: ${text}`)
      exit(1)
    }
  }

  // 2. Mint the api-key via the plugin endpoint.
  const keyRes = await postJSON(
    '/-/auth/api-key/create',
    {
      name: 'default-admin',
      prefix: 'vsr_pat_',
      permissions: {
        pkg: ['read', 'write'],
        user: ['read', 'write'],
      },
    },
    cookies,
  )
  if (!keyRes.ok) {
    console.error(`  ✗ create key failed: ${await keyRes.text()}`)
    exit(1)
  }
  const created = await keyRes.json()
  console.error(`  ✓ minted api-key id=${created.id}`)

  // 3. Grant the wildcard pkg + user scopes so the key authorizes
  //    against every existing route. Uses our PUT /-/tokens which
  //    authenticates via the session cookie.
  const scopeRes = await putJSON(
    '/-/tokens',
    {
      keyId: created.id,
      name: 'default-admin',
      scope: [
        {
          values: ['*'],
          types: {
            pkg: { read: true, write: true },
            user: { read: true, write: true },
          },
        },
      ],
    },
    cookies,
  )
  if (!scopeRes.ok) {
    console.error(`  ✗ set scope failed: ${await scopeRes.text()}`)
    exit(1)
  }
  console.error(`  ✓ granted wildcard pkg+user scope`)

  // Print the plaintext key on stdout so it can be piped.
  console.error('')
  console.error('Admin api-key (capture this now, it will not be')
  console.error('shown again):')
  console.error('')
  console.log(created.key)
}

main().catch((err) => {
  console.error(err)
  exit(1)
})
