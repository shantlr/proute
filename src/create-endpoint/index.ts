import { RequestHandler } from 'express';
import { AnyEndpointConf, EndpointHandler } from './type';
import { parse } from 'valibot';
import { createResponseSchemaMapper } from '../resources';

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

  return {
    handler: async (req, res) => {
      try {
        // const params = conf.route.middleware({
        //   req,
        //   res,
        //   query: conf.query ? parse(conf.query, req.query) : {},
        //   params: parse(conf.route.params, req.body),
        // });
        const params = {
          req,
          res,
          query: conf.query ? parse(conf.query, req.query) : {},
          body: conf.body ? parse(conf.body, req.body) : {},
          params: parse(conf.route.params, req.body),
        };

        const result = await handler(params);

        if (res.headersSent) {
          return;
        }

        if (result) {
          if (!conf.responses[result.status]) {
            console.warn(
              `[proute] Unknown status code: ${String(result.status)}`,
            );
            return;
          }

          const mappedData = responsesMapper[result.status](result.data);

          res.status(result.status as number).send(mappedData);
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
