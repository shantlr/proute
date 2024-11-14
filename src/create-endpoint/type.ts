import { GenericSchema, InferOutput } from 'valibot';
import type { Request, Response } from 'express';
import { ResourceSchema } from '../resources';

export type EndointResponses = Record<number, GenericSchema | null>;
export type RouteConfig = {
  params: GenericSchema;
};

export type AnyRouteConfig = RouteConfig;

export type EndpointConf<
  Route extends AnyRouteConfig,
  QueryParams extends GenericSchema,
  Responses extends EndointResponses,
> = {
  route: Route;
  query?: QueryParams;
  responses: Responses;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEndpointConf = EndpointConf<AnyRouteConfig, GenericSchema, any>;

export type EndpointReturnType<Conf extends AnyEndpointConf> = {
  [K in keyof Conf['responses']]: {
    status: K;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Conf['responses'][K] extends ResourceSchema<infer Input, any>
      ? Input
      : Conf['responses'][K] extends GenericSchema
        ? InferOutput<Conf['responses'][K]>
        : undefined | null;
  };
}[keyof Conf['responses']];

export type EndpointHandler<Conf extends AnyEndpointConf> = (params: {
  req: Request;
  res: Response;
  query: InferOutput<Conf['query']>;
  params: InferOutput<Conf['route']['params']>;
}) => Promise<EndpointReturnType<Conf>>;
// export type EndpointHandler<Conf extends AnyEndpointConf> = (params: Conf['route']['middleware'] extends AnyMiddleware ?  {
//   req: Request;
//   res: Response;
//   query: InferOutput<Conf['query']>;
//   params: InferOutput<Conf['route']['params']>;
// }) => Promise<EndpointReturnType<Conf>>;
