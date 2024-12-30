import { Request, Response } from 'express';
import { AnyHandlerExtraParam, Middleware, MiddlewareFn } from './types';
import { AnyEndpointResponses } from '../types';
import { AnyProuteConfig } from '../create-config';
import { AnyOpenApiSecuritySchemes, OpenApiRouteSecurity } from '../docs/types';

export const makeCreateMiddleware = <RouterConfig extends AnyProuteConfig>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  config?: RouterConfig,
) => {
  function createMiddleware<
    InputParams extends { req: Request; res: Response },
    AddedParams extends AnyHandlerExtraParam,
  >(
    fn: MiddlewareFn<InputParams, AddedParams, Record<PropertyKey, never>>,
  ): Middleware<InputParams, AddedParams, Record<PropertyKey, never>>;

  function createMiddleware<
    InputParams extends { req: Request; res: Response },
    AddedParams extends AnyHandlerExtraParam,
    Responses extends AnyEndpointResponses,
  >(
    conf: {
      responses: Responses;
      security?: RouterConfig['securitySchemes'] extends AnyOpenApiSecuritySchemes
        ? OpenApiRouteSecurity<RouterConfig['securitySchemes']>[]
        : never;
    },
    fn: MiddlewareFn<InputParams, AddedParams, NoInfer<Responses>>,
  ): Middleware<InputParams, AddedParams, NoInfer<Responses>>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createMiddleware(...args: any[]) {
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

  return createMiddleware;
};

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// export function createMiddleware(...args: any[]) {
//   if (args.length === 1 && typeof args[0] === 'function') {
//     return {
//       responses: {},
//       handler: args[0],
//     };
//   }
//   return {
//     ...args[0],
//     handler: args[1],
//   };
// }

// export const convertExpressMiddleware = (expressMiddleware: RequestHandler) => {
//   return createMiddleware(({ req, res }) => {
//     return new Promise((resolve, reject) => {
//       const listener = () => {
//         resolve();
//       };
//       res.once('close', listener);

//       expressMiddleware(req, res, (err) => {
//         res.off('close', listener);

//         if (err) {
//           reject(err);
//           return;
//         }

//         resolve();
//       });
//     });
//   });
// };
