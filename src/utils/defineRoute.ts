function defineMiddlerware<D extends Fbr.ResData = any, B extends Fbr.ReqData = any>(handler: Fbr.Middleware<D, B>): Fbr.Route<D, B> {
  return handler;
}
function defineRouteHandler<D extends Fbr.ResData = any, B extends Fbr.ReqData = any>(handler: Fbr.RouteHandler<D, B>): Fbr.Route<D, B> {
  return handler;
}
function defineErrorHandler<D extends Fbr.ResData = any, B extends Fbr.ReqData = any>(handler: Fbr.ErrorHandler<D, B>): Fbr.Route<D, B> {
  return handler;
}
function defineRoute<D extends Fbr.ResData = any, B extends Fbr.ReqData = any>(handler: Fbr.Route<D, B>): Fbr.Route<D, B> {
  return handler;
}
defineRoute.middleware = defineMiddlerware;
defineRoute.handler = defineRouteHandler;
defineRoute.error = defineErrorHandler;


export { defineErrorHandler, defineMiddlerware, defineRoute, defineRouteHandler };
export default defineRoute;
export type { ErrorHandler, Middleware, Next, Req, ReqBody, ReqData, Res, ResBody, ResData, Route, RouteHandler } from '../types';

