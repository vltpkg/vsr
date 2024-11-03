import { v4 as uuidv4 } from 'uuid'
import { getAuthedUser, parseTokenAccess } from '../utils/auth.js'

export async function getToken(c) {
  const { uuid, scope, token } = await getAuthedUser({c})
  // const body = await c.req.json()
  const body = await c.req.parseBody()

  const type = (body.token) ? 'token' : 'uuid'
  const provided = body[type]

  // check if user is overloading the request with both token and uuid
  if (body.token && body.uuid) {
    return c.json({ error: 'Overloaded credentials. Use token or uuid. Not both.' }, 401)
  }

  // check if user is authorized to view this token using a uuid
  if (body.uuid && body.uuid !== uuid) {
    const { anyUser, specificUser, readAccess } = parseTokenAccess({ scope, uuid: body.uuid })
    if ((!anyUser && !specificUser) || !readAccess) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }

  // query the database for the tokens
  const lookup = provided ? `${type} = "${body[type]}"` : `token = "${token}"`
  const query = `SELECT * FROM tokens WHERE ${lookup}`
  const { results } = await c.env.DB.prepare(query).run()
  const ret = results.map(row => {
    const { readAccess, writeAccess } = parseTokenAccess({ scope: JSON.parse(row.scope), uuid: row.uuid })
    return {
      cidr_whitelist: null,
      readonly: (readAccess && !writeAccess),
      automation: null,
      created: null,
      updated: null,
      scope: JSON.parse(row.scope),
      key: row.uuid,
      token: row.token,
    }
  })

  // check if user is authorized to view this token using a token
  if (body.token && body.token !== token) {
    const { anyUser, specificUser, readAccess } = parseTokenAccess({ scope, uuid: results[0].uuid })
    if ((!anyUser && !specificUser) || !readAccess) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }

  return c.json({ objects: ret, urls: {} }, 200)
}

export async function postToken(c) {
  const { uuid: userUuid, scope: userScope, token: userToken } = await getAuthedUser({c})
  let { scope: providedScope, uuid: providedUuid } = await c.req.json()
  if (!providedScope) {
    return c.json({ error: 'Missing scope' }, 400)
  }
  const generatedToken = uuidv4()

  // assume if no uuid is provided then the user is making a token for themselves
  const uuid = providedUuid || userUuid

  // if uuid starts with special characters then throw
  const specialChars = ['~', '!', '*', '^', '&']
  if (specialChars.some(char => uuid.startsWith(char))) {
    return c.json({ error: 'Invalid uuid - uuids can not start with special characters (ex. - ~ ! * ^ &)' }, 400)
  }

  // check if user has access to manage this uuid
  if (uuid != providedUuid) {
    const { anyUser, specificUser, writeAccess } = parseTokenAccess({ userScope, uuid: providedUuid })
    if ((!anyUser && !specificUser) || !writeAccess) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }

  try {
    const query = `INSERT INTO tokens (uuid, token, scope) VALUES ("${uuid}", "${generatedToken}", json('${JSON.stringify(providedScope)}'))`
    await c.env.DB.prepare(query).run()
  } catch (e) {
    return c.json({ error: 'Token or user already exists' }, 400)
  }
  return c.json({ scope: providedScope, uuid, token: generatedToken })
}

// scope is optional (only for privileged tokens) - ex. "read:@scope/pkg" or "read+write:@scope/pkg"
export async function putToken(c) {
  const body = await c.req.json()
  const type = (body.token) ? 'token' : 'uuid'
  if (!body[type]) {
    return c.json({ error: 'Unauthorized' }, 400)
  }
  const scope = body.scope ? `, scope = json('${JSON.stringify(body.scope)}')` : ''
  const new_token = uuidv4()
  // TODO: privileged users can update any token, otherwise only their own
  const query = `UPDATE tokens SET token = "${new_token}" ${scope} WHERE ${type} = "${body[type]}"`
  await c.env.DB.prepare(query).run()
  return c.json({
    token: new_token
  }, 200)
}

export async function deleteToken(c) {
  const token = c.req.param('token')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 400)
  }
  const query = `DELETE FROM tokens WHERE token = "${token}"`
  await c.env.DB.prepare(query).run()
  return c.json({}, 200)
}
