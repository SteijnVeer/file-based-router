import type { NextFunction, Request, Response } from './types';

function defineRoute(route:
  ((req: Request, res: Response) => Promise<void> | void) |
  ((req: Request, res: Response, next: NextFunction) => Promise<void> | void)
) {
  return route;
}


export { defineRoute };
export default defineRoute;
export type { NextFunction, Request, Response } from './types';

