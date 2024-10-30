// generate api json file
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { API } from '../src/api.js'
const __dirname = dirname(fileURLToPath(import.meta.url))
const path = resolve(__dirname, '../dist')
const file = resolve(path, 'openapi.json')
await mkdir(path, { recursive: true })
writeFileSync(file, JSON.stringify(API, null, 2))
