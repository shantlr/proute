import { GenericSchema, InferOutput } from 'valibot';
import type { Request, Response } from 'express';

export type EndointResponses = Record<number, GenericSchema | null>;
export type RouteConfig = {
  params: GenericSchema;
};

export type EndpointConf<
  Route extends RouteConfig,
  Responses extends EndointResponses,
> = {
  route: Route;
  responses: Responses;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEndpointConf = EndpointConf<RouteConfig, any>;

export type EndpointReturnType<Conf extends AnyEndpointConf> = {
  [K in keyof Conf['responses']]: {
    status: K;
    data: Conf['responses'][K] extends GenericSchema
      ? InferOutput<Conf['responses'][K]>
      : undefined | null;
  };
}[keyof Conf['responses']];

export type EndpointHandler<Conf extends AnyEndpointConf> = (params: {
  req: Request;
  res: Response;
  params: InferOutput<Conf['route']['params']>;
}) => Promise<EndpointReturnType<Conf>>;
