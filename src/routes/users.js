import { getAuthedUser } from '../utils/auth'

export async function getUsername (c) {
  const { uuid } = await getAuthedUser({c})
  return c.json({ username: uuid }, 200)
}

export async function getUserProfile (c) {
  const { uuid } = await getAuthedUser({c})
  return c.json({ name: uuid }, 200)
}
