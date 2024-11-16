import {
  ArraySchema,
  BaseSchema,
  CustomIssue,
  GenericSchema,
  InferOutput,
  ObjectSchema,
  OutputDataset,
} from 'valibot';
import { FlattenType } from '../ts-utils';

export type ResourceSchema<Input, Output> = BaseSchema<
  Input,
  Output,
  CustomIssue
> & {
  output: Output;

  mapResource: (value: Input) => Output;
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

    '~standard': 1,
    '~vendor': 'valibot',

    // get '~standard'() {},
    '~validate'(dataset) {
      // no check for input type

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedValue = arg.map(dataset.value as Input) as any;
      dataset.value = mappedValue;
      return dataset as OutputDataset<InferOutput<Output>, CustomIssue>;
    },
  };
};
export const createAsyncResource = () => {
  //
};

export type ResourceMap<T> = FlattenType<{
  [K in keyof T]: T[K] extends GenericSchema ? T[K] : never;
}>;
export const createResourceMap = <T>(resourcesMap: T): ResourceMap<T> => {
  return Object.entries(resourcesMap).reduce((acc, [key, value]) => {
    if ('kind' in value && value.kind === 'schema') {
      acc[key] = value;
    }
    return acc;
  }, {} as ResourceMap<T>);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isObjectSchema = (schema: unknown): schema is ObjectSchema<any, any> => {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'kind' in schema &&
    schema.kind === 'schema' &&
    'type' in schema &&
    schema.type === 'object'
  );
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isArraySchema = (schema: unknown): schema is ArraySchema<any, any> => {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'kind' in schema &&
    schema.kind === 'schema' &&
    'type' in schema &&
    schema.type === 'array'
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          acc.push((value: Record<string, any>) => {
            value[fieldName] = mapField(value[fieldName]);
          });
        }

        return acc;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [] as ((value: any) => any)[],
    );
    if (mappers.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (value: Record<any, any>) => {
        const shallow = { ...value };
        mappers.forEach((mapField) => {
          mapField(shallow);
        });
        return shallow;
      };
    }
  } else if (isArraySchema(schema)) {
    const mapItem = createResponseSchemaMapper(schema.item);
    if (mapItem) {
      return (value: any[]) => {
        return value.map((item) => {
          return mapItem(item);
        });
      };
    }
  }

  return undefined;
};
