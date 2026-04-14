# @steijnveer/file-based-router

Express file-based routing with TypeScript support. Create routes using file system conventions.

## Installation

```bash
# install package
npm install @steijnveer/file-based-router
```

```bash
# or create new project
npm create @steijnveer/creat-file-based-router
```

## Usage

### Using the CLI

Create a `fbr.config.ts` (or `.js` or `.json`) in your project root:

```typescript
export default {
  router: {
    rootDir: '.\\src\\routes',
    basePath: '/',
  },
  server: {
    port: 3000,
  },
  logLevel: 'info'
};
```

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

## Example Route File

```typescript
// src/routes/users/[id].ts
import type { Request, Response } from 'express';

export function GET(req: Request, res: Response) {
  const { id } = req.params;
  res.resolve({ user: { id } });
}

export function DELETE(req: Request, res: Response) {
  const { id } = req.params;
  res.resolve({
    message: `Succesfully deleted user.`,
    data: { deleted: id },
  });
}

export function PATCH(req: Request, res: Response) {
  const { id } = req.params;
  res.reject({
    error: new Error('Cannot update user.'),
  });
}
```

## Plugins

Extend the server with plugins to add custom functionality like WebSocket support, authentication, or database connections.

### Using Plugins

Add plugins to your config:

```typescript
// fbr.config.ts
import { myPlugin } from '@steijnveer/fbr-plugin-name';

export default {
  plugins: [myPlugin],
  server: {
    port: 3000
  }
};
```

### Available Plugins

- Currently no plugins available yet.
- More plugins coming soon!

### Creating Your Own Plugin

Plugins can extend the `Server` interface with full TypeScript autocomplete support:

```typescript
// my-plugin.ts
import type { Server } from '@steijnveer/file-based-router';

// Extend the Server interface
declare module '@steijnveer/file-based-router' {
  interface Server {
    myFeature(): void;
  }
}

// Implement the plugin
export function myPlugin(server: Server) {
  server.myFeature = () => {
    log('Custom feature!');
  };
}
```

For a complete guide on creating plugins, see [PLUGIN-DEVELOPMENT.md](PLUGIN-DEVELOPMENT.md).

## Development

```bash
# Show help
fbr help

# Run dev
fbr dev

# Build project
tsc && fbr build
```

## License

MIT
