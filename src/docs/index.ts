import { GenericSchema, unwrap } from 'valibot';
import { isRouteEndpointModule } from '../create-endpoint';
import { Method } from '../types';
import {
  isArraySchema,
  isBooleanSchema,
  isDateSchema,
  isDescriptionAction,
  isExampleAction,
  isLiteralSchema,
  isNullableSchema,
  isNumberSchema,
  isObjectSchema,
  isOptionalSchema,
  isStringSchema,
  isUnionSchema,
  isWithPipeSchema,
} from '../utils/valibot';
import { isResource } from '../resources';

export const createOpenapiJson = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specs: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resources: Record<string, any>,
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
    components: {
      schemas: {},
    },
  };

  // Components
  for (const [key, resource] of Object.entries(resources ?? {})) {
    json.components.schemas[key] = mapSchemaToOpenapi(resource);
  }

  const resourceRefMap = Object.entries(resources ?? {}).reduce(
    (acc, [key, schema]) => {
      acc.set(schema, `#/components/schemas/${key}`);
      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new Map<any, string>(),
  );

  // Paths
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
          query: conf.query,
        }),
        requestBody: undefined,
        responses: mapEndpointResponses({
          responses: conf.responses,
          resourceRefMap,
        }),
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
  resourceRefMap,
}: {
  responses: Record<number, GenericSchema>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resourceRefMap: Map<any, string>;
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
        description: getSchemaDescription(schema),
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
      description: getSchemaDescription(schema),
      content: {
        'application/json': {
          schema: mapSchemaToOpenapi(schema, resourceRefMap),
        },
      },
    };
  }

  return res;
};

export const mapEndpointParams = ({
  params,
  query,
}: {
  params: GenericSchema;
  query: GenericSchema | undefined | null;
}) => {
  const res = [];

  if (isObjectSchema(params)) {
    for (const [key, fieldSchema] of Object.entries(params.entries)) {
      res.push({
        name: key,
        in: 'path',
        required: true,
        description: getSchemaDescription(fieldSchema),
        schema: mapSchemaToOpenapi(fieldSchema),
      });
    }
  }
  if (isObjectSchema(query)) {
    for (const [key, fieldSchema] of Object.entries(query.entries)) {
      res.push({
        name: key,
        in: 'query',
        required: true,
        description: getSchemaDescription(fieldSchema),
        schema: mapSchemaToOpenapi(fieldSchema),
      });
    }
  }

  return res;
};

export const mapSchemaToOpenapi = (
  schema: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resourceRefMap: Map<any, string> = new Map(),
) => {
  if (resourceRefMap?.has(schema)) {
    return {
      $ref: resourceRefMap.get(schema),
    };
  }
  if (isStringSchema(schema)) {
    return {
      type: 'string',
      example: getSchemaExample(schema),
    };
  }
  if (isNumberSchema(schema)) {
    return {
      type: 'number',
      example: getSchemaExample(schema),
    };
  }
  if (isArraySchema(schema)) {
    return {
      type: 'array',
      items: mapSchemaToOpenapi(schema.item, resourceRefMap),
      example: getSchemaExample(schema),
    };
  }

  if (isObjectSchema(schema)) {
    return {
      type: 'object',
      properties: Object.entries(
        schema.entries as Record<string, GenericSchema>,
      ).reduce((acc, [key, value]) => {
        acc[key] = mapSchemaToOpenapi(value, resourceRefMap);
        return acc;
      }, {}),
      example: getSchemaExample(schema),
    };
  }
  if (isResource(schema)) {
    return mapSchemaToOpenapi(schema.output as GenericSchema, resourceRefMap);
  }
  if (isNullableSchema(schema)) {
    const wrapped = unwrap(schema);
    const inner = mapSchemaToOpenapi(wrapped, resourceRefMap);

    inner.nullable = true;
    return inner;
  }
  if (isOptionalSchema(schema)) {
    const wrapped = unwrap(schema);
    return mapSchemaToOpenapi(wrapped, resourceRefMap);
  }
  if (isDateSchema(schema)) {
    return {
      type: 'string',
      format: 'date-time',
      example: getSchemaExample(schema),
    };
  }
  if (isBooleanSchema(schema)) {
    return {
      type: 'boolean',
      example: getSchemaExample(schema),
    };
  }
  if (isUnionSchema(schema)) {
    return {
      oneOf: schema.options.map((opt) =>
        mapSchemaToOpenapi(opt, resourceRefMap),
      ),
      example: getSchemaExample(schema),
    };
  }
  if (isLiteralSchema(schema)) {
    return {
      type: 'string',
      enum: [schema.literal],
      example: getSchemaExample(schema),
    };
  }

  console.warn(`[proute-openapi] unhandled schema conversion`, schema);
};

export const getSchemaExample = (schema: unknown) => {
  if (isOptionalSchema(schema) || isNullableSchema(schema)) {
    return getSchemaExample(unwrap(schema));
  }
  let example = undefined;
  if (isWithPipeSchema(schema)) {
    for (const elem of schema.pipe) {
      if (isExampleAction(elem)) {
        if (example === undefined) {
          example = elem.example;
        } else if (Array.isArray(example)) {
          example.push(elem.example);
        } else {
          example = [example, elem.example];
        }
      }
    }
  }

  return example;
};

export const getSchemaDescription = (schema: unknown) => {
  if (isOptionalSchema(schema) || isNullableSchema(schema)) {
    return getSchemaDescription(unwrap(schema));
  }
  if (isWithPipeSchema(schema)) {
    for (const elem of schema.pipe) {
      if (isDescriptionAction(elem)) {
        return elem.description;
      }
    }
  }
  return '';
};
