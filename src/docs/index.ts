import { GenericSchema, unwrap } from 'valibot';
import { isRouteEndpointModule } from '../create-endpoint';
import { Method } from '../types';
import {
  isArraySchema,
  isBooleanSchema,
  isDateSchema,
  isDescriptionAction,
  isExampleAction,
  isLengthAction,
  isLiteralSchema,
  isMaxLengthAction,
  isMaxValueAction,
  isMinLengthAction,
  isMinValueAction,
  isNullableSchema,
  isNullishSchema,
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
        requestBody: mapEndpointRequestBody({
          body: conf.body,
          resourceRefMap,
        }),
        responses: mapEndpointResponses({
          responses: conf.responses,
          resourceRefMap,
        }),
      };
    }
  }

  return json;
};

const mapExpressPathToOpenapiPath = (path: string) => {
  return path.replace(/:(\w+)/g, '{$1}');
};

const mapEndpointRequestBody = ({
  body,
  resourceRefMap,
}: {
  body: GenericSchema | undefined | null;
  resourceRefMap: Map<unknown, string>;
}) => {
  if (!body) {
    return undefined;
  }

  if (isStringSchema(body)) {
    return {
      description: getSchemaDescription(body),
      content: {
        'text/plain': {
          schema: mapSchemaToOpenapi(body),
        },
      },
    };
  }

  return {
    description: getSchemaDescription(body),
    content: {
      'application/json': {
        schema: mapSchemaToOpenapi(body, resourceRefMap),
      },
    },
  };
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
            schema: mapSchemaToOpenapi(schema),
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

//#region Params
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
        required:
          !isOptionalSchema(fieldSchema) && !isNullableSchema(fieldSchema),
        description: getSchemaDescription(fieldSchema),
        schema: mapSchemaToOpenapi(fieldSchema),
      });
    }
  }

  return res;
};
//endregion

//region Schema to openapi
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
      minimum: getSchemaMinValue(schema),
      maximum: getSchemaMaxValue(schema),
    };
  }
  if (isArraySchema(schema)) {
    const length = getSchemaLength(schema);
    return {
      type: 'array',
      items: mapSchemaToOpenapi(schema.item, resourceRefMap),
      example: getSchemaExample(schema),
      minItems: length ?? getSchemaMinLength(schema),
      maxItems: length ?? getSchemaMaxLength(schema),
    };
  }

  if (isObjectSchema(schema)) {
    return {
      type: 'object',
      ...Object.entries(schema.entries as Record<string, GenericSchema>).reduce(
        (acc, [key, value]) => {
          acc.properties[key] = mapSchemaToOpenapi(value, resourceRefMap);
          if (
            !isOptionalSchema(value) &&
            !isNullableSchema(value) &&
            !isNullishSchema(value)
          ) {
            acc.required.push(key);
          }
          return acc;
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          properties: {} as Record<string, any>,
          required: [] as string[],
        },
      ),
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
  if (isNullishSchema(schema)) {
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
    const length = getSchemaLength(schema);
    return {
      type: 'string',
      format: 'date-time',
      example: getSchemaExample(schema),
      minLength: length ?? getSchemaMinLength(schema),
      maxLength: length ?? getSchemaMaxLength(schema),
    };
  }
  if (isBooleanSchema(schema)) {
    return {
      type: 'boolean',
      example: getSchemaExample(schema),
    };
  }
  if (isUnionSchema(schema)) {
    const oneOf = schema.options.map((opt) =>
      mapSchemaToOpenapi(opt, resourceRefMap),
    );

    // const [stringSchemas, others] = oneOf.reduce(
    //   (acc, curr) => {
    //     if (isStringSchema(curr)) {
    //       acc[0].push(curr);
    //     } else {
    //       acc[1].push(curr);
    //     }
    //     return acc;
    //   },
    //   [[], []],
    // );

    return {
      oneOf,
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
//endregion

const createGetActionInfo = <Type, Value>(
  predicate: (schema: unknown) => schema is Type,
  mapValue: (schema: Type) => Value,
) => {
  const getActionInfo = (schema: unknown): Value | undefined => {
    if (isOptionalSchema(schema) || isNullableSchema(schema)) {
      return getActionInfo(unwrap(schema));
    }
    if (isWithPipeSchema(schema)) {
      for (const elem of schema.pipe) {
        if (predicate(elem)) {
          return mapValue(elem);
        }
      }
    }
    return undefined;
  };
  return getActionInfo;
};

const getSchemaExample = (schema: unknown) => {
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

const getSchemaDescription = createGetActionInfo(
  isDescriptionAction,
  (action) => action.description,
);

const getSchemaMinValue = createGetActionInfo(
  isMinValueAction,
  (action) => action.requirement as number,
);
const getSchemaMaxValue = createGetActionInfo(
  isMaxValueAction,
  (action) => action.requirement as number,
);
const getSchemaLength = createGetActionInfo(
  isLengthAction,
  (action) => action.requirement as number,
);
const getSchemaMinLength = createGetActionInfo(
  isMinLengthAction,
  (action) => action.requirement as number,
);
const getSchemaMaxLength = createGetActionInfo(
  isMaxLengthAction,
  (action) => action.requirement as number,
);
