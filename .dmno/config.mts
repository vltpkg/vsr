import { CloudflareWranglerEnvSchema, DmnoWranglerEnvSchema } from '@dmno/cloudflare-platform';
import { DmnoBaseTypes, defineDmnoService, pickFromSchemaObject, switchBy } from 'dmno';

import packageJson from '../package.json' with { type: "json" };

export default defineDmnoService({
  isRoot: true,
  settings: {
    redactSensitiveLogs: true,
    interceptSensitiveLeakRequests: true,
    preventClientLeaks: true,
  },
  schema: {
    ...pickFromSchemaObject(CloudflareWranglerEnvSchema, {
      CLOUDFLARE_ACCOUNT_ID: {},
      CLOUDFLARE_API_TOKEN: {},
    }),

    ...pickFromSchemaObject(DmnoWranglerEnvSchema, {
      WRANGLER_ENV: {},
      // WRANGLER_DEV_PROTOCOL: { value: 'http' }, // defaults to http
      WRANGLER_DEV_PORT: { value: 1337 },
      WRANGLER_DEV_URL: {}, // this is inferred
      WRANGLER_LIVE_RELOAD: { value: true },
      WRANGLER_INJECT_MODE: { value: 'inline' },
      WRANGLER_DEV_ACTIVE: {},
      WRANGLER_BUILD_ACTIVE: {},
    }),

    VSR_VERSION: {
      description: 'Current version of vsr, as specified in our package.json',
      required: true,
      value: () => packageJson.version,
    },

    REGISTRY_URL: {
      required: true,
      description: 'URL of this instance of vsr',
      // TODO: figure out how URLs will work for deployed instances and adjust accordingly
      value: () => DMNO_CONFIG.WRANGLER_DEV_URL,
    },
    REGISTRY_INSTANCE_DESCRIPTION: {
      required: true,
      description: 'Description of this instance of vsr, displayed in the docs',
      value: () => DMNO_CONFIG.REGISTRY_URL?.includes('localhost') ? 'localhost' : DMNO_CONFIG.REGISTRY_URL,
    },

    BEARER_TOKEN: {
      description: 'bearer token used to connect to the registry',
      // sensitive: true, // cannot mark sensitive because it is leaked in the docs UI
      required: true,
      value: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // should override for a real deployment, can enfore this later
    },
    BASIC_AUTH_USER: {
      value: 'user',
    },
    BASIC_AUTH_PASSWORD: {
      description: 'basic auth pasword used to connect to the registry', // not actually implemented?
      // sensitive: true, // cannot mark sensitive because it is leaked in the docs UI
      required: true,
      value: 'pass', // should override for a real deployment, can enfore this later
    },
  },
});
