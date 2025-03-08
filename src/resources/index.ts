import {
  _getStandardProps,
  BaseSchema,
  BaseSchemaAsync,
  CustomIssue,
  GenericSchema,
  GenericSchemaAsync,
  InferOutput,
  OutputDataset,
} from 'valibot';
import { FlattenType } from '../ts-utils';
import { isArraySchema, isObjectSchema } from '../utils/valibot';

export type ResourceSchema<Input, Output> = BaseSchema<
  Input,
  Output,
  CustomIssue
> & {
  output: Output;

  mapResource: (value: Input) => Output;
};

export type AsyncResourceSchema<Input, Output> = BaseSchemaAsync<
  Input,
  Output,
  CustomIssue
> & {
  output: Output;

  mapResource: (value: Input) => Promise<Output>;
};

export const createResource = <Input, Output extends GenericSchema>(arg: {
  input: GenericSchema<Input> | ((arg: Input) => Input);
  output: Output;
  map: (input: Input) => InferOutput<Output>;
}): ResourceSchema<Input, InferOutput<Output>> => {
  return {
    kind: 'schema' as const,
    type: 'proute/resource',
    reference: createResource,
    expects: 'unknown',
    async: false,

    output: arg.output,

    mapResource: (value) => {
      return arg.map(value as Input);
    },

    get '~standard'() {
      return _getStandardProps(this);
    },

    '~run'(dataset) {
      // no check for input type

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedValue = arg.map(dataset.value as Input) as any;
      dataset.value = mappedValue;
      return dataset as unknown as OutputDataset<
        InferOutput<Output>,
        CustomIssue
      >;
    },
  };
};
export const createResourceAsync = <Input, Output extends GenericSchema>(arg: {
  input: GenericSchema<Input> | ((arg: Input) => Input);
  output: Output;
  map: (input: Input) => Promise<InferOutput<Output>>;
}): AsyncResourceSchema<Input, InferOutput<Output>> => {
  return {
    kind: 'schema' as const,
    type: 'proute/resource',
    reference: createResourceAsync,
    expects: 'unknown',
    async: true,

    output: arg.output,

    mapResource: (value) => {
      return arg.map(value as Input);
    },

    get '~standard'() {
      return _getStandardProps(this);
    },

    async '~run'(dataset) {
      // no check for input type

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedValue = (await arg.map(dataset.value as Input)) as any;
      dataset.value = mappedValue;
      return dataset as unknown as OutputDataset<
        InferOutput<Output>,
        CustomIssue
      >;
    },
  };
};

export type ResourceMap<T> = FlattenType<{
  [K in keyof T]: T[K] extends GenericSchema | GenericSchemaAsync
    ? T[K]
    : never;
}>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createResourceMap = <T extends Record<string, any>>(
  resourcesMap: T,
): ResourceMap<T> => {
  return Object.entries(resourcesMap).reduce(
    (acc: ResourceMap<T>, [key, value]) => {
      if ('kind' in value && value.kind === 'schema') {
        acc[key as keyof T] = value;
      }
      return acc;
    },
    {} as ResourceMap<T>,
  );
};

export const isResource = (
  schema: unknown,
): schema is ResourceSchema<unknown, unknown> => {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'kind' in schema &&
    schema['kind'] === 'schema' &&
    'type' in schema &&
    schema['type'] === 'proute/resource'
  );
};

/**
 * return a function that will correctly apply resource schema mapping
 * return undefined when schema require no mapping
 */
export const createResponseSchemaMapper = (
  schema: GenericSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ((value: any) => any) | undefined => {
  if (isResource(schema)) {
    return (value: unknown) => schema.mapResource(value);
  }

  if (isObjectSchema(schema)) {
    const mappers = Object.entries(schema.entries).reduce(
      (acc, [fieldName, fieldSchema]) => {
        const mapField = createResponseSchemaMapper(
          fieldSchema as GenericSchema,
        );

        if (mapField) {
          if (schema.async) {
            acc.push(async (value: Record<string, unknown>) => {
              value[fieldName] = await mapField(value[fieldName]);
            });
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            acc.push((value: Record<string, any>) => {
              value[fieldName] = mapField(value[fieldName]);
            });
          }
        }

        return acc;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [] as ((value: any) => any)[],
    );

    if (!mappers.length) {
      // no fields require mapping
      return undefined;
    }

    if (schema.async) {
      return async (value: Record<string, unknown>) => {
        const shallow = { ...value };
        await Promise.all(mappers.map((mapField) => mapField(shallow)));
        return shallow;
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (value: Record<any, any>) => {
      const shallow = { ...value };
      mappers.forEach((mapField) => {
        mapField(shallow);
      });
      return shallow;
    };
  } else if (isArraySchema(schema)) {
    const mapItem = createResponseSchemaMapper(schema.item);
    if (!mapItem) {
      // item does not require mapping
      return undefined;
    }
    if (schema.async) {
      return (value: unknown[]) => {
        return Promise.all(value.map((item) => mapItem(item)));
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (value: any[]) => {
      return value.map((item) => {
        return mapItem(item);
      });
    };
  }

  return undefined;
};
