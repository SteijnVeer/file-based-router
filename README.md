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

### Using the API programmatically

```typescript
import { createServer, log } from 'file-based-router';

log.level('info');

const server = await createServer({
  port: 3000,
  hostname: 'localhost',
  allowedOrigins: null,
  routerOptions: {
    rootDir: './routes',
    basePath: '/api',
    allowedExtensions: ['.ts']
  }
});

await server.start();
```

## File-Based Routing Conventions

- `index.ts` - Does not append the api path
- `route.ts` - Append api path with the filename
- `[param].ts` - Parameter
- `[[id]].ts` - Optional parameter
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
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE` - HTTP method handlers
- `ALL` - Catch-all handler for any method

## Example Route File

```typescript
// routes/users/[id].ts
import type { Request, Response } from 'express';

export function GET(req: Request, res: Response) {
  const { id } = req.params;
  res.resolve({ user: id });
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

## Development

```bash
# Show help
fbr help

# Run dev
fbr dev
```

## License

MIT
