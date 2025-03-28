import { Request, RequestHandler, Response } from 'express';
import {
  AnyEndpointConf,
  AnyInputEndpointConf,
  AnyRouteConfig,
  EndpointConf,
  EndpointConfFromInput,
  EndpointHandler,
  EndpointHandlerParam,
  ExtendEndpointConfHandlerParams,
} from './types';
import { GenericSchema, InferOutput, parse } from 'valibot';
import { createResponseSchemaMapper } from '../resources';
import {
  AnyHandlerExtraParam,
  AnyMiddleware,
  AnyMiddlewareFn,
  Middleware,
  MiddlewareFn,
} from '../middleware/types';
import { AnyEndpointResponses, EndpointResponseInput } from '../types';
import { MergeResponse, mergeResponses } from './merge-responses';
import { EmptyObject } from '../ts-utils';

export const isRouteEndpointModule = (
  module: unknown,
): module is {
  conf: AnyEndpointConf;
  handler: EndpointHandler<AnyEndpointConf>;
} => {
  return (
    !!module &&
    typeof module === 'object' &&
    'conf' in module &&
    !!module.conf &&
    typeof module.conf === 'object' &&
    'handler' in module &&
    typeof module.handler === 'function'
  );
};

type ExtensibleEndpointConf<Conf extends AnyEndpointConf> = Conf & {
  middleware<HandlerExtraParams extends AnyHandlerExtraParam>(
    middleware: MiddlewareFn<
      EndpointHandlerParam<Conf>,
      HandlerExtraParams,
      Conf['responses']
    >,
  ): ExtensibleEndpointConf<
    ExtendEndpointConfHandlerParams<Conf, HandlerExtraParams>
  >;

  middleware<
    HandlerExtraParams extends AnyHandlerExtraParam,
    ExtendedResponses extends AnyEndpointResponses,
  >(
    param: Middleware<
      EndpointHandlerParam<Conf>,
      HandlerExtraParams,
      ExtendedResponses
    >,
  ): Conf extends EndpointConf<
    infer Route,
    infer Query,
    infer Body,
    infer Responses,
    infer HandlerParams
  >
    ? ExtensibleEndpointConf<
        EndpointConf<
          Route,
          Query,
          Body,
          MergeResponse<Responses, ExtendedResponses>,
          HandlerParams & HandlerExtraParams
        >
      >
    : ExtensibleEndpointConf<AnyEndpointConf>;
};

interface EndpointConfFactory<
  HandlerExtraParams extends AnyHandlerExtraParam,
  ExtraResponses extends AnyEndpointResponses,
> {
  <Route extends AnyRouteConfig, Conf extends AnyInputEndpointConf<Route>>(
    route: Route,
    conf: Conf,
  ): ExtensibleEndpointConf<
    EndpointConfFromInput<
      Route,
      Conf,
      HandlerExtraParams & {
        params: InferOutput<Route['params']>;
        body: Conf['body'] extends GenericSchema
          ? InferOutput<Conf['body']>
          : never;
        query: Conf['query'] extends GenericSchema
          ? InferOutput<Conf['query']>
          : never;
      },
      ExtraResponses
    >
  >;

  /**
   * Same as `endpointConfig(...)`
   */
  config<
    Route extends AnyRouteConfig,
    Conf extends AnyInputEndpointConf<Route>,
  >(
    route: Route,
    conf: Conf,
  ): ExtensibleEndpointConf<
    EndpointConfFromInput<
      Route,
      Conf,
      HandlerExtraParams & {
        params: InferOutput<Route['params']>;
        body: Conf['body'] extends GenericSchema
          ? InferOutput<Conf['body']>
          : never;
        query: Conf['query'] extends GenericSchema
          ? InferOutput<Conf['query']>
          : never;
      },
      ExtraResponses
    >
  >;

  /**
   * Apply middleware before parsing the request (params, body, query)
   */
  pre<
    PreExtraParams extends AnyHandlerExtraParam,
    PreExtendedResponses extends AnyEndpointResponses,
  >(
    middleware:
      | Middleware<
          { req: Request; res: Response } & HandlerExtraParams,
          PreExtraParams,
          PreExtendedResponses
        >
      | MiddlewareFn<
          { req: Request; res: Response } & HandlerExtraParams,
          PreExtraParams,
          PreExtendedResponses
        >,
  ): EndpointConfFactory<
    HandlerExtraParams & PreExtraParams,
    MergeResponse<ExtraResponses, PreExtendedResponses>
  >;
}

/**
 * Is a response like object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isResponse = (value: unknown): value is EndpointResponseInput<any> => {
  if (
    value &&
    typeof value === 'object' &&
    'status' in value &&
    value.status != null
  ) {
    return true;
  }
  return false;
};

export const baseEndpointConf = <Conf extends AnyEndpointConf>(
  conf: Conf,
): ExtensibleEndpointConf<Conf> => {
  const r: ExtensibleEndpointConf<Conf> = {
    ...conf,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    middleware: (param: any) => {
      if (!param) {
        return r;
      }

      let middleware: AnyMiddlewareFn;
      let extendedConf:
        | undefined
        | {
            responses: AnyEndpointResponses;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            security?: any[];
          };
      if (typeof param === 'function') {
        middleware = param;
        extendedConf = undefined;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input = param as Middleware<any, any, any>;
        extendedConf = input;
        middleware = input.handler;
      }

      return baseEndpointConf({
        ...conf,
        responses: extendedConf?.responses
          ? mergeResponses([conf.responses, extendedConf?.responses])
          : conf.responses,
        security: [...(conf.security || []), ...(extendedConf?.security || [])],
        get middlewares() {
          return [...conf.middlewares, middleware];
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
    },
  };

  return r;
};

const createEndpointConf = <
  HandlerExtraParams extends AnyHandlerExtraParam = EmptyObject,
  ExtendedResponses extends AnyEndpointResponses = EmptyObject,
>(
  preMiddlewares: AnyMiddleware[] = [],
) => {
  const endpointConf: EndpointConfFactory<
    HandlerExtraParams,
    ExtendedResponses
  > = (route, conf) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let res: ExtensibleEndpointConf<any> = baseEndpointConf({
      route,
      ...conf,
      get middlewares() {
        return [];
      },
    });

    if (preMiddlewares?.length) {
      preMiddlewares.forEach((mdw) => {
        res = res.middleware(mdw);
      });
    }

    return res.middleware(function prouteInternalParseRouteMdw({
      req,
    }: {
      req: Request;
    }) {
      return {
        extraParam: {
          query: conf.query
            ? parseDebug(conf.query, req.query, (err) => {
                console.warn(
                  `[proute] '${route?.expressPath}': query validation failed: ${err}`,
                );
              })
            : {},
          body: conf.body
            ? parseDebug(conf.body, req.body, (err) => {
                console.warn(
                  `[proute] '${route?.expressPath}': body validation failed: ${err}`,
                );
              })
            : {},
          params: parseDebug(route.params, req.params, (err) => {
            console.warn(
              `[proute] '${route?.expressPath}': params validation failed: ${err}`,
            );
          }),
        },
      };
    });
  };

  endpointConf.config = (...args) => endpointConf(...args);

  endpointConf.pre = (mdw) => {
    if (typeof mdw === 'function') {
      return createEndpointConf([
        ...preMiddlewares,
        {
          responses: {},
          handler: mdw,
        },
      ]);
    }
    return createEndpointConf([...preMiddlewares, mdw]);
  };

  return endpointConf;
};

/**
 * Create endpoint configuration
 */
export const endpointConf = createEndpointConf([]);

const parseDebug = <Schema extends GenericSchema>(
  schema: Schema,
  value: unknown,
  onError: (error: unknown) => void,
) => {
  try {
    return parse(schema, value);
  } catch (err) {
    onError(err);
    throw err;
  }
};

/**
 */
export const createRoute = <Conf extends AnyEndpointConf>(module: {
  conf: Conf;
  handler: EndpointHandler<Conf>;
  errorHandler?: (error: unknown) => void;
}): {
  handler: RequestHandler;
} => {
  const {
    conf,
    handler,
    errorHandler = (error) => {
      throw error;
    },
  } = module;

  const responsesMapper = Object.entries(conf.responses || {}).reduce(
    (acc, [key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      acc[key] = createResponseSchemaMapper(value as any) ?? ((value) => value);
      return acc;
    },
    {} as Record<string, (value: unknown) => unknown>,
  ) as {
    [K in keyof typeof conf.responses]: (value: unknown) => unknown;
  };

  const handlers = [...conf.middlewares, handler];

  return {
    handler: async (req, res) => {
      try {
        let params = {
          req,
          res,
        };

        for (const stepHandler of handlers) {
          if (res.headersSent) {
            // Request already handled
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stepRes = await stepHandler(params as any);
          if (!isResponse(stepRes)) {
            params = {
              ...params,
              ...(stepRes as { extraParam?: AnyHandlerExtraParam } | undefined)
                ?.extraParam,
            };
            continue;
          }

          if (!(stepRes.status in conf.responses)) {
            console.warn(
              `[proute] '${conf.route?.expressPath}': Unknown status code: ${String(stepRes.status)}`,
            );
            return;
          }

          //#region Handle response cookies
          if (stepRes.cookies) {
            for (const [key, value] of Object.entries(stepRes.cookies)) {
              if (value === null) {
                res.clearCookie(key);
              } else if (typeof value === 'string') {
                res.cookie(key, value);
              } else if (value) {
                res.cookie(key, value.value, {
                  expires: value.expires,
                  domain: value.domain,
                  httpOnly: value.httpOnly,
                  maxAge: value.maxAge,
                  path: value.path,
                  priority: value.priority,
                  secure: value.secure,
                  sameSite: value.sameSite,
                  partitioned: value.partitioned,
                  signed: value.signed,
                });
              }
            }
          }
          //#endregion

          // if ('stream' in stepRes) {
          //   if (stepRes.stream instanceof ReadableStream) {
          //     Readable.fromWeb(stepRes.stream)
          //     stepRes.stream.
          //   }
          //   stepRes.stream.pipe(
          //     res.status(stepRes.status as unknown as number),
          //   );
          //   return;
          // }

          //#region Map response data
          const mappedData = await responsesMapper[stepRes.status](
            stepRes.data,
          );
          //#endregion

          //#region redirect
          if (
            typeof stepRes.status === 'number' &&
            stepRes.status >= 300 &&
            stepRes.status < 400
          ) {
            // check that redirect response is correct
            if (
              mappedData &&
              typeof mappedData === 'object' &&
              'redirect_url' in mappedData
            ) {
              const data = mappedData as {
                redirect_url: string;
                redirect_url_query?: Record<string, string>;
              };

              let url = data.redirect_url;

              if (data.redirect_url_query) {
                const redirectQuery = new URLSearchParams(
                  data.redirect_url_query,
                ).toString();
                if (redirectQuery) {
                  url += `?${redirectQuery}`;
                }
              }

              res.status(stepRes.status as number).redirect(url);
              return;
            }

            console.warn(
              `[proute] '${conf.route?.expressPath}': Redirect response should have 'redirect_url' field`,
            );
            res.status(500).send();
            return;
          }
          //#endregion

          res.status(stepRes.status as unknown as number).send(mappedData);
        }
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).send();
        }

        errorHandler(error);
      }
    },
  };
};
