import { Request, Response } from 'express';
import { AnyHandlerExtraParam, Middleware, MiddlewareFn } from './types';
import { AnyEndpointResponses } from '../types';

export function createMiddleware<
  InputParams extends { req: Request; res: Response },
  AddedParams extends AnyHandlerExtraParam,
>(
  fn: MiddlewareFn<InputParams, AddedParams, Record<PropertyKey, never>>,
): Middleware<InputParams, AddedParams, Record<PropertyKey, never>>;

export function createMiddleware<
  InputParams extends { req: Request; res: Response },
  AddedParams extends AnyHandlerExtraParam,
  Responses extends AnyEndpointResponses,
>(
  conf: {
    responses: Responses;
  },
  fn: MiddlewareFn<InputParams, AddedParams, NoInfer<Responses>>,
): Middleware<InputParams, AddedParams, NoInfer<Responses>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMiddleware(...args: any[]) {
  if (args.length === 1 && typeof args[0] === 'function') {
    return {
      responses: {},
      handler: args[0],
    };
  }
  return {
    ...args[0],
    handler: args[1],
  };
}

// export const convertExpressMiddleware = (
//   expressMiddleware: RequestHandler,
//   addParams?: () => void,
// ) => {
//   return createMiddleware(() => {});
// };
