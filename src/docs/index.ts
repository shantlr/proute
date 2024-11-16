import { GenericSchema, unwrap } from 'valibot';
import { isRouteEndpointModule } from '../create-endpoint';
import { Method } from '../types';
import {
  isArraySchema,
  isBooleanSchema,
  isDateSchema,
  isLiteralSchema,
  isNullableSchema,
  isNumberSchema,
  isObjectSchema,
  isStringSchema,
  isUnionSchema,
} from '../utils/valibot';
import { isResource } from '../resources';

export const createOpenapiJson = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specs: Record<string, any>,
  endpoints: {
    method: Method;
    path: string;
    module: unknown;
  }[],
) => {
  const json = {
    openapi: '3.0.0',
    info: {
      ...specs?.info,
      title: specs?.info?.title ?? 'API',
      description: specs?.info?.description ?? '',
      version: specs?.info?.version ?? '0.0.0',
    },
    servers: specs.servers,
    tags: specs.tags,
    paths: {},
  };

  for (const endpoint of endpoints) {
    if (isRouteEndpointModule(endpoint.module)) {
      const endpointPath = mapExpressPathToOpenapiPath(endpoint.path);
      if (!json.paths[endpointPath]) {
        json.paths[endpointPath] = {};
      }
      const { conf } = endpoint.module;
      json.paths[endpointPath][endpoint.method] = {
        summary: conf.summary ?? '',
        description: conf.description ?? '',
        tags: conf.tags ?? [endpointPath.split('/')[1]],
        parameters: mapEndpointParams({
          params: conf.route.params,
        }),
        requestBody: undefined,
        responses: mapEndpointResponses({ responses: conf.responses }),
      };
    }
  }

  return json;
};

export const mapExpressPathToOpenapiPath = (path: string) => {
  return path.replace(/:(\w+)/g, '{$1}');
};

export const mapEndpointResponses = ({
  responses,
}: {
  responses: Record<number, GenericSchema>;
}) => {
  const res = {};

  for (const [status, schema] of Object.entries(responses ?? {})) {
    if (schema === null) {
      res[status] = {
        description: '',
      };
      continue;
    }
    if (isStringSchema(schema)) {
      res[status] = {
        description: '',
        content: {
          'text/plain': {
            schema: {
              type: 'string',
            },
          },
        },
      };
      continue;
    }

    res[status] = {
      description: '',
      content: {
        'application/json': {
          schema: mapSchemaToOpenapi(schema),
        },
      },
    };
  }

  return res;
};

export const mapEndpointParams = ({ params }: { params: GenericSchema }) => {
  const res = [];

  if (isObjectSchema(params)) {
    for (const [key, fieldSchema] of Object.entries(params.entries)) {
      if (isStringSchema(fieldSchema)) {
        res.push({
          name: key,
          in: 'path',
          required: true,
          description: '',
          schema: {
            type: 'string',
          },
        });
      }
    }
  }

  return res;
};

export const mapSchemaToOpenapi = (schema: GenericSchema) => {
  if (isStringSchema(schema)) {
    return {
      type: 'string',
    };
  }
  if (isNumberSchema(schema)) {
    return {
      type: 'number',
    };
  }
  if (isArraySchema(schema)) {
    return {
      type: 'array',
      items: mapSchemaToOpenapi(schema.item),
    };
  }

  if (isObjectSchema(schema)) {
    return {
      type: 'object',
      properties: Object.entries(
        schema.entries as Record<string, GenericSchema>,
      ).reduce((acc, [key, value]) => {
        acc[key] = mapSchemaToOpenapi(value);
        return acc;
      }, {}),
    };
  }
  if (isResource(schema)) {
    return mapSchemaToOpenapi(schema.output as GenericSchema);
  }
  if (isNullableSchema(schema)) {
    const wrapped = unwrap(schema);
    const inner = mapSchemaToOpenapi(wrapped);

    inner.nullable = true;
    return inner;
  }
  if (isDateSchema(schema)) {
    return {
      type: 'string',
      format: 'date-time',
    };
  }
  if (isBooleanSchema(schema)) {
    return {
      type: 'boolean',
    };
  }
  if (isUnionSchema(schema)) {
    return {
      oneOf: schema.options.map(mapSchemaToOpenapi),
    };
  }
  if (isLiteralSchema(schema)) {
    return {
      type: 'string',
      enum: [schema.literal],
    };
  }

  console.warn(`[proute-openapi] unhandled schema conversion`, schema);
};
