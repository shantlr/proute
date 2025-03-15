import { GenericSchema } from 'valibot';
import type { Request, Response } from 'express';
import { AnyEndpointResponses, EndpointResponseInput } from '../types';
import { AnyHandlerExtraParam, MiddlewareFn } from '../middleware/types';
import { AnyOpenApiSecuritySchemes, OpenApiRouteSecurity } from '../docs/types';
import { MergeResponse } from './merge-responses';

export type RouteConfig<SecuritySchemes extends AnyOpenApiSecuritySchemes> = {
  expressPath: string;
  params: GenericSchema;
  securitySchemes?: SecuritySchemes;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRouteConfig = RouteConfig<any>;

export type EndpointConf<
  Route extends AnyRouteConfig,
  QueryParams extends GenericSchema,
  Body extends GenericSchema,
  Responses extends AnyEndpointResponses,
  HandlerParams extends { req: Request; res: Response },
> = {
  summary?: string;
  description?: string;
  tags?: string[];
  route: Route;
  query?: QueryParams;
  body?: Body;
  responses: Responses;

  security?: OpenApiRouteSecurity<Route['securitySchemes']>[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get middlewares(): MiddlewareFn<HandlerParams, any, any>[];
};

export type EndpointConfFromInput<
  Route extends AnyRouteConfig,
  ConfInput extends AnyInputEndpointConf<Route>,
  ExtraParams extends AnyHandlerExtraParam,
  ExtraResponses extends AnyEndpointResponses,
> =
  ConfInput extends InputEndpointConf<
    infer Route,
    infer QueryParams,
    infer Body,
    infer Responses
  >
    ? EndpointConf<
        Route,
        QueryParams,
        Body,
        MergeResponse<Responses, ExtraResponses>,
        { req: Request; res: Response } & ExtraParams
      >
    : never;

export type ExtendEndpointConfHandlerParams<
  Conf extends AnyEndpointConf,
  ExtraParams,
> =
  Conf extends EndpointConf<
    infer Route,
    infer Query,
    infer Body,
    infer Responses,
    infer HandlerParams
  >
    ? EndpointConf<Route, Query, Body, Responses, HandlerParams & ExtraParams>
    : never;

export type InputEndpointConf<
  Route extends AnyRouteConfig,
  QueryParams extends GenericSchema,
  Body extends GenericSchema,
  Responses extends AnyEndpointResponses,
> = Omit<
  EndpointConf<
    Route,
    QueryParams,
    Body,
    Responses,
    {
      req: Request;
      res: Response;
    }
  >,
  'middlewares' | '_params' | 'route'
>;
export type AnyInputEndpointConf<Route extends AnyRouteConfig> =
  InputEndpointConf<
    Route,
    GenericSchema,
    GenericSchema,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >;

export type EndpointHandlerParam<Conf extends AnyEndpointConf> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Conf extends EndpointConf<any, any, any, any, infer HandlerParams>
    ? HandlerParams
    : never;

export type AnyEndpointConf = EndpointConf<
  AnyRouteConfig,
  GenericSchema,
  GenericSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

export type EndpointReturnType<Conf extends AnyEndpointConf> =
  EndpointResponseInput<Conf['responses']>;

export type EndpointHandler<Conf extends AnyEndpointConf> = (
  params: EndpointHandlerParam<Conf>,
) => Promise<EndpointReturnType<Conf>>;
