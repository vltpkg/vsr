import { getAuthedUser } from '../utils/auth'

export async function getUsername (c) {
  const { uuid } = await getAuthedUser({c})
  return c.json({ username: uuid }, 200)
}

export async function getUserProfile (c) {
  const { uuid, scope } = await getAuthedUser({c})
  return c.json({
    name: uuid,
    email: scope.email,
    email_verified: scope.email_verified,
    github: scope.github,
    created: scope.created,
    updated: scope.updated,
  }, 200)
}
