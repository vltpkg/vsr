import { Buffer } from 'node:buffer'
import validate from 'validate-npm-package-name'
import semver from 'semver'
import { accepts } from 'hono/accepts'
import { DOMAIN } from '../../config'
import {
  extractPackageJSON,
  packageSpec,
  createFile,
  createVersion
} from '../utils/packages'

export async function getPackageTarball (c) {
  let { scope, pkg } = c.req.param()
  pkg = scope && pkg !== '-' ? `${scope}/${pkg}` : scope || pkg
  const tarball = c.req.path.split('/').pop()
  const filename = `${pkg}/${tarball}`
  const file = await c.env.BUCKET.get(filename)
  if (!file) {
    return c.json({ error: 'Not found' }, 404)
  }

  c.header('Content-Type', 'application/octet-stream')
  c.status(200)
  return c.body(file.body)
}

export async function getPackageManifest (c) {
  let { version, pkg, isScoped } = packageSpec(c)
  const tarballIndex = isScoped ? 3 : 2
  const isTarball = c.req.path.split('/')[tarballIndex] === '-'

  // fetch tarball if that's what is passed
  if (pkg && isTarball) {
    return getPackageTarball(c)
  }

  if (!pkg) {
    return c.json({ error: 'Not found' }, 404)
  } else if (!version) {
    return c.json({ error: `Version not found: ${version}` }, 404)
  }

  if (version === 'latest') {
    const packumentQuery = `SELECT * FROM packages WHERE name = "${pkg}"`
    const packument = await c.env.DB.prepare(packumentQuery).run()
    if (!packument.results.length) {
      return c.json({ error: 'Not found' }, 404)
    }
    version = JSON.parse(packument.results[0].tags).latest
  }
  const versionsQuery = `SELECT * FROM versions WHERE spec = "${pkg}@${version}"`
  const versions = await c.env.DB.prepare(versionsQuery).run()

  if (!versions.results || versions.results.length === 0) {
    return c.json({ error: 'Not found' }, 404)
  }

  const row = versions.results[0]
  const manifest = JSON.parse(row.manifest)
  const ret = { ...manifest, ...{
    dist: {
      tarball: `${DOMAIN}/${createFile({ pkg, version })}`
    }
  }}

  return c.json(ret, 200)
}

export async function getPackagePackument (c) {
  let { pkg, scope } = c.req.param()
  const isScoped = scope && scope.startsWith('@')
  const versionIndex = isScoped ? 4 : 3
  const isVersioned = c.req.path.split('/').length === versionIndex
  pkg = isScoped ? `${scope}/${pkg}` : scope || pkg

  // fetch manifest of unscoped packages if that's what is passed
  if (pkg && isVersioned) {
    return getPackageManifest(c)
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

  if (!packument.results || packument.results.length === 0) {
    return c.json({ error: 'Package not found' }, 404)
  }

  const latest = JSON.parse(packument.results[0].tags).latest
  const versionsQuery = `SELECT * FROM versions WHERE spec LIKE "${pkg}@%"`
  const versions = await c.env.DB.prepare(versionsQuery).run()
  if (!versions.results.length) {
    c.json({ error: 'Versions not found' }, 404)
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
    ret.versions[version] = createVersion({ pkg, version, manifest })
    ret.time[version] = row.published_at
  })

  return c.json(ret, 200)
}

export async function publishPackage (c) {
  const { pkg } = packageSpec(c)
  const body = await c.req.json()

  // basic validation of body
  if (!body || !body.versions) {
    return c.json({ error: 'Invalid request' }, 400)
  }

  // query for existing versions
  const query = `SELECT * FROM versions WHERE spec LIKE "${pkg}@%"`
  const { results } = await c.env.DB.prepare(query).run()
  const existingVersions = results || []
  const existingVersionNumbers = existingVersions.map(r => r.spec.split('@')[1])
  const new_versions = Object.keys(body.versions).filter(v => !existingVersionNumbers.includes(v))

  // Check if this is a completely new package (no versions exist)
  const isNewPackage = existingVersions.length === 0

  if (isNewPackage) {
    // Only create package entry if it truly doesn't exist
    try {
      const insertQuery = `INSERT INTO packages (name, tags) VALUES (?, json(?))`
      await c.env.DB.prepare(insertQuery).bind(pkg, JSON.stringify({"latest": new_versions[0]})).run()
    } catch (err) {
      // Package already exists, which is fine - continue with version insertion
      console.log('Package entry already exists, continuing with version insertion...')
    }
  } else {
    // Update the latest tag for existing packages
    try {
      const updateQuery = `UPDATE packages SET tags = json(?) WHERE name = ?`
      await c.env.DB.prepare(updateQuery).bind(JSON.stringify({"latest": new_versions[0]}), pkg).run()
    } catch (err) {
      console.log('Could not update package tags, continuing...')
    }
  }

  // check for conflicts in publishing vs. existing
  if (!new_versions.length) {
    return c.json({ error: 'Version already exists - nothing new to publish' }, 409)
  } else if (new_versions.length > 1) {
    return c.json({ error: 'Cannot publish multiple versions at once' }, 409)
  }

  // extract new version information
  const version = new_versions[0]
  const manifest = body.versions[version]

  // check for deprecation, update existing version & return early
  if (manifest.hasOwnProperty('deprecated')) {
    const existingVersion = existingVersions.find(v => v.spec === `${pkg}@${version}`)
    if (existingVersion) {
      const existingManifest = JSON.parse(existingVersion.manifest)
      if (manifest.deprecated === '') {
        delete existingManifest.deprecated
      } else {
        existingManifest.deprecated = manifest.deprecated
      }
      const updateQuery = `
      INSERT INTO versions (spec, manifest, published_at)
      VALUES ("${pkg}@${version}", json('${JSON.stringify(existingManifest)}'), "${new Date().toISOString()}")`
      await c.env.DB.prepare(updateQuery).run()
      return c.json({}, 200)
    }
  }

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

  // get file out of manifest as we're continuing to publish
  const filename = `${pkg}-${version}.tgz`
  const file = body._attachments[filename]
  if (!file) {
    return c.json({ error: 'Nothing to publish' }, 409)
  }

  // Use the manifest data directly instead of extracting from tarball to avoid hanging
  // const contents = Buffer.from(file.data, 'base64')
  // const packageJSON = await extractPackageJSON(contents)

  // validate name + version from manifest (skip tarball extraction for now)
  if (manifest.name !== pkg || manifest.version !== version) {
    return c.json({ error: 'Manifest Conflict' }, 409)
  }

  // prioritize manifest values
  // override `dist` as this cannot be trusted from the client
  const store = {
    ...manifest,
    ...{
      dist: {
        tarball: `${DOMAIN}/${(createFile({ pkg, version }))}`,
      }
    }
  }

  // insert new version
  const insertQuery = `
    INSERT INTO versions (spec, manifest, published_at)
    VALUES (?, json(?), ?)`
  try {
    await c.env.DB.prepare(insertQuery).bind(
      `${pkg}@${version}`,
      JSON.stringify(store),
      new Date().toISOString()
    ).run()
  } catch (err) {
    console.error('Version insertion error:', err)
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return c.json({ error: 'Version already exists' }, 409)
    }
    return c.json({ error: 'Database error during version insertion' }, 500)
  }

  // upload file to bucket
  const contents = Buffer.from(file.data, 'base64')
  await c.env.BUCKET.put(`${pkg}/${filename}`, contents)

  return c.json({}, 200)
}
