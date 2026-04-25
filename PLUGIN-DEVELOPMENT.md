# Plugin Development Guide

This guide explains how to create plugins for `@steijnveer/file-based-router` that extend the server and configuration with full TypeScript support.

## Overview

Plugins are plain async functions (`() => void | Promise<void>`) that run after the server is set up. They access the server and config via the `Fbr` global namespace. TypeScript support is provided through **global namespace augmentation** of `Fbr.Server` and `Fbr.Config`.

## Quick Start

### 1. Create Package Structure

```
my-plugin/
  src/
    index.ts      # Plugin implementation + type augmentation
  package.json
  tsconfig.json
```

### 2. Define Type Extensions

Augment the `Fbr` global namespace directly in your plugin's source (or a separate `.d.ts` file):

```typescript
// src/index.ts
declare global {
  namespace Fbr {
    interface Server {
      myProperty: string;
      myMethod(): void;
    }
    // Optionally extend Config for plugin-specific config:
    interface Config {
      myPlugin?: {
        enabled: boolean;
      };
    }
  }
}
```

**Important**: Use `declare global { namespace Fbr { ... } }` — not `declare module`. The `Fbr` namespace is a global, not a module export.

### 3. Implement the Plugin Function

Plugins receive no arguments. Access globals via `Fbr.server`, `Fbr.config`, and `log`:

```typescript
// src/index.ts
export default function myPlugin() {
  Fbr.server.myProperty = 'value';
  Fbr.server.myMethod = function() {
    log.info('Method called!');
  };
}
```

Plugins can also be async:

```typescript
export default async function myPlugin() {
  const data = await someAsyncSetup();
  Fbr.server.myProperty = data;
}
```

### 4. Configure package.json

```json
{
  "name": "@yourname/fbr-plugin-myplugin",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {
    "@steijnveer/file-based-router": "^0.0.10"
  }
}
```

**Key points**:
- A single export (`.`) is sufficient — types and implementation are co-located
- Use `peerDependencies` for the router package
- Set `"type": "module"` for ESM

### 5. Configure tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

## Usage in Projects

### Installing

```bash
npm install @yourname/fbr-plugin-myplugin
```

### Configuration

Use `defineConfig` from `@steijnveer/file-based-router` for type-safe config. Plugins can be provided as imported functions **or as package name strings** (the router will import them automatically):

```typescript
// fbr.config.ts
import { defineConfig } from '@steijnveer/file-based-router';
import myPlugin from '@yourname/fbr-plugin-myplugin';

export default defineConfig({
  plugins: [
    myPlugin,
    // or as a string — the router will import the default export:
    '@yourname/fbr-plugin-myplugin',
  ],
  server: {
    port: 3000,
  },
  // Plugin-specific config (if the plugin extends Fbr.Config):
  myPlugin: {
    enabled: true,
  },
});
```

**Note**: When using string plugins, TypeScript type augmentation is not applied automatically. Import the plugin (or its types) explicitly if you need type safety.

### Using the Extended Server

```typescript
import server from '@steijnveer/file-based-router';

// Full TypeScript autocomplete for plugin additions:
log(server.myProperty);
server.myMethod();
```

## Extending Config

Plugins can declare their own config section by augmenting `Fbr.Config`. The user sets it in `fbr.config.ts` alongside the built-in options, and the plugin reads it from `Fbr.config`:

```typescript
// Plugin type augmentation
declare global {
  namespace Fbr {
    interface Config {
      myPlugin?: {
        maxConnections: number;
      };
    }
  }
}

// Plugin implementation
export default function myPlugin() {
  const options = Fbr.config.myPlugin ?? { maxConnections: 100 };
  log.debug(`myPlugin: maxConnections = ${options.maxConnections}`);
}
```

```typescript
// fbr.config.ts
import defineConfig from '@steijnveer/file-based-router/defineConfig';
import myPlugin from '@yourname/fbr-plugin-myplugin';

export default defineConfig({
  plugins: [myPlugin],
  myPlugin: { maxConnections: 50 },
});
```

## Best Practices

### 1. Use Clear Naming

Prefix plugin-specific properties to avoid collisions:

```typescript
declare global {
  namespace Fbr {
    interface Server {
      // Good: prefixed
      wsServer: WebSocketServer;
      wsBroadcast(message: string): void;

      // Avoid: too generic
      // server: any;
      // broadcast(): void;
    }
  }
}
```

### 2. Handle Server Lifecycle

Plugins can wrap `start` and `stop`:

```typescript
export default function myPlugin() {
  const originalStart = Fbr.server.start;
  const originalStop = Fbr.server.stop;

  Fbr.server.start = async function() {
    await originalStart.call(this);
    log.info('Plugin initialized after server start');
  };

  Fbr.server.stop = async function() {
    log.info('Plugin cleanup before server stop');
    await originalStop.call(this);
  };
}
```

### 3. Provide Type Safety

Use proper TypeScript types in your declarations, not `any`:

```typescript
import type { WebSocket } from 'ws';

declare global {
  namespace Fbr {
    interface Server {
      // Good: specific types
      wsBroadcast(message: string, filter?: (ws: WebSocket) => boolean): void;
    }
  }
}
```

### 4. Document Your Plugin

Include JSDoc comments in type declarations:

```typescript
declare global {
  namespace Fbr {
    interface Server {
      /**
       * WebSocket server instance. `null` until the plugin initializes.
       */
      wsServer: WebSocketServer | null;

      /**
       * Broadcast a message to all connected WebSocket clients.
       */
      wsBroadcast(message: string): void;
    }
  }
}
```

## Local Plugin Development

You can create plugins directly in your project without publishing:

```typescript
// plugins/my-local-plugin.ts
declare global {
  namespace Fbr {
    interface Server {
      customFeature(): void;
    }
  }
}

export default function myLocalPlugin() {
  Fbr.server.customFeature = () => {
    log.info('Local plugin feature');
  };
}
```

```typescript
// fbr.config.ts
import defineConfig from '@steijnveer/file-based-router/defineConfig';
import myLocalPlugin from './plugins/my-local-plugin';

export default defineConfig({
  plugins: [myLocalPlugin],
});
```

**Note**: For local plugins the type augmentation is in the same file, so no separate import is needed.

## Environment Variables in Config

Config values can be set to `USE_ENV` to read from environment variables at runtime. The key is derived as `PARENT_CHILD` in `SCREAMING_SNAKE_CASE`:

```typescript
import { defineConfig, USE_ENV } from '@steijnveer/file-based-router/defineConfig';

export default defineConfig({
  server: {
    port: USE_ENV,          // reads SERVER_PORT
    hostname: USE_ENV,      // reads SERVER_HOSTNAME
  },
});
```

Parsed environment variable values:
- `"null"` → `null`
- `"a,b,c"` → `["a", "b", "c"]` (comma-separated arrays)
- Everything else is kept as a string (including numbers)

## Troubleshooting

### Types Not Working

**Problem**: Plugin properties don't show up in autocomplete.

**Solution**: Make sure the plugin (or a file that imports it) is included in your project's TypeScript compilation. If using string-based plugin loading, import the plugin once in your `fbr.config.ts`:

```typescript
import '@yourname/fbr-plugin-myplugin'; // loads type augmentation
```

### Namespace Augmentation Not Found

**Problem**: TypeScript can't find `Fbr.Server` or `Fbr.Config` to augment.

**Solution**: Ensure:
1. You have `@steijnveer/file-based-router` in `dependencies` or `peerDependencies`
2. You use `declare global { namespace Fbr { ... } }` — not `declare module`
3. Your tsconfig has `"moduleResolution": "Bundler"` or `"Node16"`

### Runtime Errors

**Problem**: Properties are undefined at runtime.

**Solution**: Make sure:
1. The plugin is listed in the `plugins` array in `fbr.config.ts`
2. The plugin function assigns all properties: `Fbr.server.prop = value`

## Publishing Your Plugin

1. Build your plugin: `npm run build`
2. Test locally with `npm link`
3. Publish: `npm publish`
4. Use naming convention: `@yourname/fbr-plugin-pluginname`

## Questions?

- See the `Fbr` namespace declarations: [src/types.ts](src/types.ts)
- TypeScript namespace augmentation docs: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
