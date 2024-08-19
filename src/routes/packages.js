import validate from 'validate-npm-package-name'
import semver from 'semver'
import { accepts } from 'hono/accepts'
import { SCOPE, DOMAIN } from '../config.js'
import {
  extractPackageJSON,
  packageSpec,
  createFile,
  createVersion
} from '../utils/packages'

export async function getPackageTarball (c) {
  const { tarball } = c.req.param()
  const { scope } = packageSpec(c)
  c.header('Content-Type', 'application/octet-stream')
  c.status(200)
  const filename = `${scope}/${tarball}`
  const file = await c.env.BUCKET.get(filename)
  if (!file) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.body(file.body)
}

export async function getPackageManifest (c) {
  let { pkg, ref, version } = packageSpec(c)
  if (!pkg) {
    return c.json({ error: 'Not found' }, 404)
  } else if (!version) {
    return c.json({ error: `Version not found: ${version}` }, 404)
  }

  if (version === 'latest') {
    const packumentQuery = `SELECT * FROM packages WHERE name = "${pkg}"`
    const packument = await c.env.DB.prepare(packumentQuery).run()
    version = JSON.parse(packument.results[0].tags).latest
  }
  const versionsQuery = `SELECT * FROM versions WHERE spec = "${pkg}@${version}"`
  const versions = await c.env.DB.prepare(versionsQuery).run()

  if (!versions.results.length) {
    c.json({ error: 'Not found' }, 404)
  }

  const row = versions.results[0]
  const manifest = JSON.parse(row.manifest)
  const ret = { ...manifest, ...createVersion({ ref, pkg, version, manifest }) }

  return c.json(ret, 200)
}

export async function getPackagePackument (c) {
  const { pkg, ref } = packageSpec(c)
  if (!pkg) {
    return c.json({ error: 'Not found' }, 404)
  }
  const corgi = 'application/vnd.npm.install-v1+json'
  const accept = accepts(c, {
    header: 'Accept-Language',
    supports: [corgi, 'application/json'],
    default: 'application/json',
  })
  const isCorgi = accept === corgi
  const packumentQuery = `SELECT * FROM packages WHERE name = "${pkg}"`
  const packument = await c.env.DB.prepare(packumentQuery).run()
  const latest = JSON.parse(packument.results[0].tags).latest
  const versionsQuery = `SELECT * FROM versions WHERE spec LIKE "${pkg}@%"`
  const versions = await c.env.DB.prepare(versionsQuery).run()
  if (!versions.results.length) {
    c.json({ error: 'Not found' }, 404)
  }

  const ret = {
    name: pkg,
    time: {},
    versions: {},
    'dist-tags': {
      latest
    }
  }

  versions.results.forEach(row => {
    const manifest = JSON.parse(row.manifest)
    const { version } = manifest
    ret.versions[version] = createVersion({ ref, pkg, version, manifest })
    ret.time[version] = row.published_at
  })

  return c.json(ret, 200)
}

export async function publishPackage (c) {
  const { ref, scope, pkg } = packageSpec(c)
  const body = await c.req.json()

  // basic validation of body
  if (!body || !body.versions) {
    return c.json({ error: 'Invalid request' }, 400)
  }

  // check scope
  if (!scope || scope !== SCOPE) {
    return c.json({ error: 'Invalid scope' }, 400)
  }

  // query for existing packages (if none, then this is a new package)
  const query = `SELECT * FROM versions WHERE spec LIKE "${pkg}@%"`
  const { results } = await c.env.DB.prepare(query).run()
  const versions = (!results.length) ? results.filter(r => r.version) : []
  const new_versions = Object.keys(body.versions).filter(v => !versions.includes(v))

  // check for conflicts in publishing vs. existing
  if (!new_versions.length) {
    return c.json({ error: 'Nothing to publish' }, 409)
  } else if (versions.length > 1) {
    return c.json({ error: 'Existing Conflict' }, 409)
  }

  // extract new version information
  let version = new_versions[0]
  const manifest = body.versions[version]

  // validate name
  if (validate(pkg).validForNewPackages === false) {
    return c.json({ error: 'Invalid Package Name' }, 400)
  }

  // validate version
  if (semver.valid(version) === null) {
    return c.json({ error: 'Invalid Package Version' }, 400)
  }

  // validate manifest
  if (manifest.name !== pkg || manifest.version !== version) {
    return c.json({ error: 'Manifest Conflict' }, 409)
  }

  // get file out of manifest
  const filename = `${pkg}-${version}.tgz`
  const file = body._attachments[filename]
  if (!file) {
    return c.json({ error: 'Nothing to publish' }, 409)
  }

  // extract package.json from tarball
  const contents = Buffer.from(file.data, 'base64')
  const packageJSON = await extractPackageJSON(contents)

  // validate name + version from package.json
  if (packageJSON.name !== pkg || packageJSON.version !== version) {
    return c.json({ error: 'Manifest Conflict' }, 409)
  }

  // prioritize package.json values over "manifest" provided values
  // override `dist` as this cannot be trusted from the client
  const store = {
    ...packageJSON,
    ...{
      dist: {
        tarball: `${DOMAIN}/${createFile({ ref, pkg, version })}`
      }
    }
  }

  // insert new version
  const insertQuery = `
    INSERT INTO versions (spec, manifest, published_at)
    VALUES ("${pkg}@${version}", json('${JSON.stringify(store)}'), "${new Date().toISOString()}")`
  try {
    await c.env.DB.prepare(insertQuery).run()
  } catch (err) {
    return c.json({ error: 'Existing Package' }, 409)
  }

  // upload file to bucket
  await c.env.BUCKET.put(filename, contents)

  return c.json({}, 200)
}
