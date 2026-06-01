import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Minimal OpenNext Cloudflare config. Default caches/queues are fine
// for a registry UI; we don't need ISR yet.
export default defineCloudflareConfig({})
