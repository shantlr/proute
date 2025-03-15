import { Request, RequestHandler, Response } from 'express';
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
    fn: (params: InputParams) => AddedParams | Promise<AddedParams>,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ): Middleware<InputParams, Awaited<AddedParams>, {}>;

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
      const resolveExtraParams = args[0];
      return {
        responses: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (param: any) => {
          const extraParam = await resolveExtraParams(param);
          return {
            extraParam: extraParam,
          };
        },
      };
    }
    return {
      ...args[0],
      handler: args[1],
    };
  }

  return createMiddleware;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const defaultCreateMiddleware = makeCreateMiddleware<{}>();

export const convertExpressMiddleware = <
  ExtraParam extends AnyHandlerExtraParam = Record<PropertyKey, never>,
>(
  expressMiddleware: RequestHandler,
  resolveExtraParams: (arg: {
    req: Request;
    res: Response;
  }) => ExtraParam = () => ({}) as ExtraParam,
) => {
  const mdwFn = ({ req, res }: { req: Request; res: Response }) => {
    return new Promise<ExtraParam>((resolve, reject) => {
      const listener = () => {
        reject(new Error('Response closed before middleware finished'));
      };
      res.once('close', listener);

      expressMiddleware(req, res, (err) => {
        res.off('close', listener);

        if (err) {
          reject(err);
          return;
        }

        resolve(resolveExtraParams({ req, res }));
      });
    });
  };
  return defaultCreateMiddleware(mdwFn);
};
