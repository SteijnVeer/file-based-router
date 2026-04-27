# @steijnveer/file-based-router

Express file-based routing with TypeScript support. Create routes using file system conventions.

## Installation

```bash
# install package
npm install @steijnveer/file-based-router
```

```bash
# or create new project
npm create @steijnveer/creat-file-based-router myNewFbrProject
```

## Usage

### Using the CLI

Create a `fbr.config.ts` (or `.js` or `.json`) in your project root:

```json
// fbr.config.json
{
  "router": {
    "routesDir": "routes",
    "routesBasePath": "/api"
  },
  "server": {
    "port": 3000,
    "staticFilesDir": "public"
  },
  "logLevel": {
    "dev": "debug",
    "prod": "info"
  }
}
```

create `main` entry file in src dir:

````typescript
import server from '@steijnveer/file-based-router';

await server.start();
````

Then run:

```bash
fbr dev
```

## File-Based Routing Conventions

- `index.ts` - Does not append the api path
- `route.ts` - Append api path with the filename
- `[param].ts` - Parameter
- `[[param]].ts` - Optional parameter
- `[...slug].ts` - Catch-all
- `{segment}.ts` - Optional segment

All can be prefixed with `[a-z].` for ensuring order of routes in the same dir:
````
routes/
  blog/
    a.latest.ts
    b.[[title]].ts
  departures/
    [from]{-[to]}.ts
  users/
    [id].ts
  a.index.ts <- will be applied first
  z.index.ts <- will be applied last
````

Routes can export:
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD` - HTTP method handlers
- `ALL` - Catch-all handler for any method

## Static File Serving

Set `server.staticFilesDir` in your config to serve static files (e.g. images, CSS, JS) from a directory. The path is relative to the working directory.

```typescript
// fbr.config.ts
import { defineConfig } from '@steijnveer/file-based-router/defineConfig';

export default defineConfig({
  server: {
    staticFilesDir: 'public', // serves files from ./public/
  },
});
```

Static files are served before the route handlers. If no `staticFilesDir` is set (the default), no static files are served.

## Example Route File

```typescript
// src/routes/users/[id].ts
import { defineRoute } from '@steijnveer/file-based-router/defineRoute';

export const GET = defineRoute((req, res) => {
  const { id } = req.params;
  res.resolve({ user: { id } });
});

export const DELETE = defineRoute((req, res) => {
  const { id } = req.params;
  res.resolve({
    message: `Succesfully deleted user.`,
    data: { deleted: id },
  });
});

export const PATCH = defineRoute((req, res) => {
  const { id } = req.params;
  res.reject({
    error: new Error('Cannot update user.'),
  });
});
```

`defineRoute` provides typed `req`, `res`, and optionally `next` without needing to import and manually annotate the types. You can still use the bare types if preferred:

```typescript
import type { Request, Response, NextFunction } from '@steijnveer/file-based-router/defineRoute';
```

## Plugins

Extend the server with plugins to add custom functionality like WebSocket support, authentication, or database connections.

### Using Plugins

Add plugins to your config:

```typescript
// fbr.config.ts
import defineConfig from '@steijnveer/file-based-router/defineConfig';
import myPlugin from '@steijnveer/fbr-plugin-name';

export default defineConfig({
  plugins: [
    myPlugin,
    './localPlugins/myLocalPlugin'
  ],
  server: {
    port: 3000
  }
});
```

or

````json
// fbr.config.json
{
  "plugins": [
    "@steijnveer/fbr-plugin-name",
    "./localPlugins/myLocalPlugin"
  ]
}
````

### Available Plugins

- @steijnveer/fbr-plugin-io
- More plugins coming soon

### Creating Your Own Plugin

Plugins can extend the `Server` interface with full TypeScript autocomplete support:

```typescript
// my-plugin.ts
import type { Server } from '@steijnveer/file-based-router';

// Extend the Server interface
declare global {
  namespace Fbr {
    interface Server {
      myFeature(): void;
    }
  }
}

// Implement the plugin
export default () => {
  Fbr.server.myFeature = () => {
    log('Custom feature!');
  };
};
```

For a complete guide on creating plugins, see [PLUGIN-DEVELOPMENT.md](PLUGIN-DEVELOPMENT.md).

## Development

```bash
# Show help
fbr help

# Run dev
fbr dev

# Build project
fbr build
```

## License

MIT
