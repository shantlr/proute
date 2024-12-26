import { RequestHandler } from 'express';
import { AnyEndpointConf, EndpointHandler } from './type';
import { GenericSchema, parse } from 'valibot';
import { createResponseSchemaMapper } from '../resources';

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

export const endpointConf = <Conf extends AnyEndpointConf>(
  conf: Conf,
): Conf => {
  return conf;
};

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
          query: conf.query
            ? parseDebug(conf.query, req.query, (err) => {
                console.warn(
                  `[proute] '${conf.route?.expressPath}': query validation failed: ${err}`,
                );
              })
            : {},
          body: conf.body
            ? parseDebug(conf.body, req.body, (err) => {
                console.warn(
                  `[proute] '${conf.route?.expressPath}': body validation failed: ${err}`,
                );
              })
            : {},
          params: parseDebug(conf.route.params, req.params, (err) => {
            console.warn(
              `[proute] '${conf.route?.expressPath}': params validation failed: ${err}`,
            );
          }),
        };

        const result = await handler(params);

        if (res.headersSent) {
          return;
        }

        if (result) {
          if (!(result.status in conf.responses)) {
            console.warn(
              `[proute] '${conf.route?.expressPath}': Unknown status code: ${String(result.status)}`,
            );
            return;
          }

          if (result.cookies) {
            for (const [key, value] of Object.entries(result.cookies)) {
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

          const mappedData = responsesMapper[result.status](result.data);

          // redirect
          if (
            typeof result.status === 'number' &&
            result.status >= 300 &&
            result.status < 400
          ) {
            // check that redirect response is correct
            if (
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

              res.status(result.status as number).redirect(url);
              return;
            }

            console.warn(
              `[proute] '${conf.route?.expressPath}': Redirect response should have 'redirect_url' field`,
            );
            res.status(500).send();
            return;
          }

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
