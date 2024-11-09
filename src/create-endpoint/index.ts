import { RequestHandler } from 'express';
import { AnyEndpointConf, EndpointHandler } from './type';
import { parse } from 'valibot';

export const isRouteEndpointModule = (module: unknown) => {
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

export const endpointConf = <Conf extends AnyEndpointConf>(
  conf: Conf,
): Conf => {
  return conf;
};

export const createRoute = <Conf extends AnyEndpointConf>(
  module: {
    conf: Conf;
    handler: EndpointHandler<Conf>;
    errorHandler?: (error: unknown) => void;
  },
  {
    middlewares = [],
  }: {
    middlewares?: unknown[];
  } = {},
): {
  handler: RequestHandler;
} => {
  const {
    conf,
    handler,
    errorHandler = (error) => {
      throw error;
    },
  } = module;
  return {
    handler: async (req, res) => {
      try {
        const result = await handler({
          req,
          res,
          params: parse(conf.route.params, req.body),
        });
        if (result && !res.headersSent) {
          res.status(result.status as number).send(result.data);
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
