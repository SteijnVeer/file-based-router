# Plugin Development Guide

This guide explains how to create plugins for `@steijnveer/file-based-router` that extend the Server interface with full TypeScript support.

## Overview

Plugins use **TypeScript module augmentation** to extend the `Server` interface, combined with runtime object extension. This provides full autocomplete and type safety across npm package boundaries.

## Quick Start

### 1. Create Package Structure

```
my-plugin/
  src/
    index.ts      # Plugin implementation
    types.d.ts    # Type declarations
  package.json
  tsconfig.json
```

### 2. Define Type Extensions

Create `src/types.d.ts` with module augmentation:

```typescript
// src/types.d.ts
declare module '@steijnveer/file-based-router' {
  interface Server {
    // Add your properties and methods here
    myProperty: string;
    myMethod(): void;
  }
}
```

**Important**: Use `declare module` to augment the Server interface. This merges your additions with the existing interface.

### 3. Implement Plugin Function

Create `src/index.ts` with the runtime implementation:

```typescript
// src/index.ts
import type { Server } from '@steijnveer/file-based-router';

export function myPlugin(server: Server) {
  // Add runtime implementation
  (server as any).myProperty = 'value';
  (server as any).myMethod = function() {
    log('Method called!');
  };
}
```

**Note**: We use `(server as any)` to add properties at runtime since TypeScript doesn't know about them yet at compile time.

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
    },
    "./types": {
      "types": "./dist/types.d.ts"
    }
  },
  "peerDependencies": {
    "@steijnveer/file-based-router": "^0.0.5"
  }
}
```

**Key points**:
- Export both the plugin function (`.`) and types (`./types`)
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

```typescript
// fbr.config.ts
import { myPlugin } from '@yourname/fbr-plugin-myplugin';
import '@yourname/fbr-plugin-myplugin/types'; // Important: Load type declarations

export default {
  plugins: [myPlugin],
  server: {
    port: 3000
  }
};
```

### Using Extended Server

```typescript
import ready from '@steijnveer/file-based-router';

const server = await ready;

// Full TypeScript autocomplete for plugin additions!
log(server.myProperty);
server.myMethod();
```

## Best Practices

### 1. Use Clear Naming

Prefix plugin-specific properties to avoid collisions:

```typescript
declare module '@steijnveer/file-based-router' {
  interface Server {
    // Good: prefixed
    wsServer: WebSocketServer;
    setupWebSocket(): void;
    
    // Avoid: too generic
    // server: any;
    // setup(): void;
  }
}
```

### 2. Initialize in Plugin Function

Set up all properties and methods in the plugin function:

```typescript
export function myPlugin(server: Server) {
  // Initialize properties with safe defaults
  (server as any).myProperty = null;
  
  // Add methods that use 'this' correctly
  (server as any).myMethod = function() {
    // 'this' refers to the server instance
    log(this._port);
  };
}
```

### 3. Handle Server Lifecycle

Plugins can interact with server start/stop:

```typescript
export function myPlugin(server: Server) {
  const originalStart = server.start;
  const originalStop = server.stop;
  
  server.start = async function() {
    await originalStart.call(this);
    // Do plugin-specific setup after server starts
    log.info('Plugin initialized');
  };
  
  server.stop = async function() {
    // Do plugin-specific cleanup before server stops
    log.info('Plugin cleanup');
    await originalStop.call(this);
  };
}
```

### 4. Provide Type Safety

Use proper TypeScript types in your declarations:

```typescript
import type { WebSocket } from 'ws';

declare module '@steijnveer/file-based-router' {
  interface Server {
    // Good: specific types
    broadcast(message: string, filter?: (ws: WebSocket) => boolean): void;
    
    // Avoid: any types
    // doSomething(data: any): any;
  }
}
```

### 5. Document Your Plugin

Include JSDoc comments in type declarations:

```typescript
declare module '@steijnveer/file-based-router' {
  interface Server {
    /**
     * WebSocket server instance. Null until setupWebSocket() is called.
     */
    wsServer: WebSocketServer | null;
    
    /**
     * Initialize the WebSocket server on the HTTP server.
     * Must be called after server.start().
     */
    setupWebSocket(): void;
  }
}
```

## Advanced Patterns

### Access to Server Internals

Plugins have full access to the Server's internal properties:

```typescript
export function myPlugin(server: Server) {
  (server as any).getInfo = function() {
    return {
      port: this._port,
      hostname: this._hostname,
      isActive: this.active(),
      app: this._app, // Express app
      httpServer: this._httpServer // HTTP server
    };
  };
}
```

### Plugin Configuration

Accept configuration in your plugin:

```typescript
// src/index.ts
export interface MyPluginOptions {
  enabled?: boolean;
  maxConnections?: number;
}

export function myPlugin(options: MyPluginOptions = {}) {
  return (server: Server) => {
    const config = { enabled: true, maxConnections: 100, ...options };
    // Use config...
  };
}

// Usage in fbr.config.ts
export default {
  plugins: [
    myPlugin({ maxConnections: 50 })
  ]
};
```

### Async Plugin Initialization

Plugins can be async:

```typescript
export async function myPlugin(server: Server) {
  // Load config from file
  const config = await loadConfig();
  
  // Initialize with async operations
  (server as any).initialize = async function() {
    await setupDatabase();
  };
}

// In config plugins array, async plugins work fine
```

## Local Plugin Development

You can create plugins directly in your project without publishing:

```typescript
// plugins/my-local-plugin.ts
import type { Server } from '@steijnveer/file-based-router';

declare module '@steijnveer/file-based-router' {
  interface Server {
    customFeature(): void;
  }
}

export function myLocalPlugin(server: Server) {
  (server as any).customFeature = () => {
    console.log('Local plugin feature');
  };
}

// fbr.config.ts
import { myLocalPlugin } from './plugins/my-local-plugin';

export default {
  plugins: [myLocalPlugin]
};
```

**Note**: For local plugins, the type augmentation is in the same file, so no separate import is needed.

## Example Plugin

See the complete WebSocket plugin example in `examples/plugin-websocket/` for a full reference implementation.

## Troubleshooting

### Types Not Working

**Problem**: Plugin properties don't show up in autocomplete.

**Solution**: Make sure you import the types:
```typescript
import '@yourname/fbr-plugin-myplugin/types';
```

### Module Augmentation Not Found

**Problem**: TypeScript can't find the module to augment.

**Solution**: Ensure:
1. You have `@steijnveer/file-based-router` in dependencies
2. The `declare module` path matches exactly: `'@steijnveer/file-based-router'`
3. Your tsconfig has `"moduleResolution": "Bundler"` or `"Node"`

### Runtime Errors

**Problem**: Properties are undefined at runtime.

**Solution**: Make sure:
1. The plugin is added to the `plugins` array in config
2. The plugin function actually assigns the properties: `(server as any).prop = value`
3. You're accessing properties after the server is initialized

## Publishing Your Plugin

1. Build your plugin: `npm run build`
2. Test locally with `npm link`
3. Publish: `npm publish`
4. Use naming convention: `@yourname/fbr-plugin-pluginname`

## Questions?

- See existing patterns in the Express.Response augmentation: [src/index.ts](src/index.ts#L146-L165)
- Check the WebSocket plugin example: [examples/plugin-websocket/](examples/plugin-websocket/)
- TypeScript module augmentation docs: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
