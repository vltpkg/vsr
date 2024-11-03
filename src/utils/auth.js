import { ANY_PACKAGE_SPEC } from '../../config'
import { packageSpec } from './packages'

export function getTokenFromHeader (c) {
  const auth = c.req.header('Authorization')
  if (auth && auth.startsWith('Bearer ')) {
    return auth.substring(7).trim()
  }
  return null
}

export function parseTokenAccess ({scope, pkg, uuid}) {
  const read = ['get']
  const write = ['put', 'post', 'delete']
  let temp = {
    anyUser: false,
    specificUser: false,
    anyPackage: false,
    specificPackage: false,
    readAccess: false,
    writeAccess: false
  }
  // TODO: add for multiple package access/aliases ib scopes
  const alternates = {}
  scope.map(s => {
    if (s.types.pkg) {
      if (s.values.includes(ANY_PACKAGE_SPEC)) {
        temp.anyPackage = true
      }
      if (s.values.includes(pkg) || (alternates[pkg] && s.values.includes(alternates[pkg]))) {
        temp.specificPackage = true
      }
      if ((temp.anyPackage || temp.specificPackage) && s.types.pkg.read) {
        temp.readAccess = true
      }
      if ((temp.anyPackage || temp.specificPackage) && s.types.pkg.write) {
        temp.writeAccess = true
      }
    }
    if (s.types.user) {
      if (s.values.includes('*')) {
        temp.anyUser = true
      }
      if (s.values.includes(`~${uuid}`)) {
        temp.specificUser = true
      }
      if ((temp.anyUser || temp.specificUser) && s.types.user.read) {
        temp.readAccess = true
      }
      if ((temp.anyUser || temp.specificUser) && s.types.user.write) {
        temp.writeAccess = true
      }
    }
  })
  temp.methods = (temp.readAccess ? read : []).concat(temp.writeAccess ? write : [])
  return temp
}

export function isUserRoute (path) {
  const routes = [
    'ping',
    'whoami',
    'vlt/tokens',
    'npm/v1/user',
    'npm/v1/tokens',
    'org/',
  ]
  return !!routes.filter(r => path.startsWith(`/-/${r}`)).length
}

export async function getUserFromToken ({ c, token }) {
  const query = `SELECT * FROM tokens WHERE token = "${token}"`
  const { results } = await c.env.DB.prepare(query).run()
  const row = results.length ? results[0] : null
  const uuid = row ? row.uuid : null
  const scope = row ? JSON.parse(row.scope) : null
  return { uuid, scope, token }
}

export async function getAuthedUser ({ c, token }) {
  token = token || getTokenFromHeader(c)
  if (!token) {
    return null
  }
  return await getUserFromToken({ c, token })
}

export async function verifyToken (token, c) {

  const method = c.req.method ? c.req.method.toLowerCase() : ''

  if (!token) {
    return false
  }

  const { uuid, scope } = await getUserFromToken({ c, token })

  if (!uuid || !scope || !scope.length) {
    return false
  } else {
    const { path } = c.req
    const { pkg } = packageSpec(c)
    const routeType = (isUserRoute(path)) ? 'user' : pkg ? 'pkg' : null

    // determine access
    const {
      anyUser,
      specificUser,
      anyPackage,
      specificPackage,
      methods
    } = parseTokenAccess({scope, pkg, uuid})

    const methodAllowed = methods.includes(method)

    // if the route is a user route
    if (routeType === 'user') {
      return methodAllowed && (anyUser || specificUser)
    }

    // handle package routes
    if (routeType === 'pkg') {
      return methodAllowed && (anyPackage || specificPackage)
    }

    // fallback to false (should be unreachable code path)
    return false
  }
}
