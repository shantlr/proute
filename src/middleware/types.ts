import { Request, Response } from 'express';
import { AnyEndpointResponses, EndpointResponseInput } from '../types';

export type AnyHandlerExtraParam =
  | Record<PropertyKey, unknown>
  | void
  | undefined;

export type MiddlewareResult<
  HandlerExtraParam extends AnyHandlerExtraParam,
  Responses extends AnyEndpointResponses,
> =
  | void
  | {
      extraParam: HandlerExtraParam;
    }
  | EndpointResponseInput<Responses>;

export interface MiddlewareFn<
  InputParams extends { req: Request; res: Response },
  HandlerExtraParam extends AnyHandlerExtraParam,
  Responses extends AnyEndpointResponses,
> {
  (
    params: InputParams,
  ):
    | MiddlewareResult<HandlerExtraParam, Responses>
    | Promise<MiddlewareResult<HandlerExtraParam, Responses>>;
}
export type Middleware<
  InputParams extends { req: Request; res: Response },
  HandlerExtraParam extends AnyHandlerExtraParam,
  Responses extends AnyEndpointResponses,
> = {
  responses: Responses;
  security?: string[];
  handler: MiddlewareFn<InputParams, HandlerExtraParam, Responses>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMiddleware = Middleware<any, any, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMiddlewareFn = MiddlewareFn<any, any, any>;
