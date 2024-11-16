import { GenericSchema, InferOutput, ObjectSchema } from 'valibot';
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
  Body extends GenericSchema,
  Responses extends EndointResponses,
> = {
  route: Route;
  query?: QueryParams;
  body?: Body;
  responses: Responses;
};

export type AnyEndpointConf = EndpointConf<
  AnyRouteConfig,
  GenericSchema,
  GenericSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

type MapEndpointReturnType<Schema> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Schema extends ResourceSchema<infer Input, any>
    ? Input
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Schema extends ObjectSchema<Record<PropertyKey, never>, any>
      ? Record<PropertyKey, never>
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Schema extends ObjectSchema<infer ObjectFields, any>
        ? {
            [K in keyof ObjectFields]: MapEndpointReturnType<ObjectFields[K]>;
          }
        : Schema extends GenericSchema
          ? InferOutput<Schema>
          : undefined | null;

export type EndpointReturnType<Conf extends AnyEndpointConf> = {
  [K in keyof Conf['responses']]: {
    status: K;
    data: MapEndpointReturnType<Conf['responses'][K]>;
  };
}[keyof Conf['responses']];

export type EndpointHandler<Conf extends AnyEndpointConf> = (params: {
  req: Request;
  res: Response;
  body: InferOutput<Conf['body']>;
  query: InferOutput<Conf['query']>;
  params: InferOutput<Conf['route']['params']>;
}) => Promise<EndpointReturnType<Conf>>;
// export type EndpointHandler<Conf extends AnyEndpointConf> = (params: Conf['route']['middleware'] extends AnyMiddleware ?  {
//   req: Request;
//   res: Response;
//   query: InferOutput<Conf['query']>;
//   params: InferOutput<Conf['route']['params']>;
// }) => Promise<EndpointReturnType<Conf>>;
