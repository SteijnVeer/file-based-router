import type { ZodObjectSchema } from '../types';
import { defineMiddlerware } from './defineRoute';

function createBodyValidator<S extends ZodObjectSchema>(schema: S) {
  return defineMiddlerware<any, S>((req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return res.reject.badRequest(result.error as any);
    req.body = result.data as Fbr.ReqBody<S>;
    next();
  });
}


export { createBodyValidator };
export default createBodyValidator;
export type { ZodInfer, ZodObjectSchema } from '../types';

