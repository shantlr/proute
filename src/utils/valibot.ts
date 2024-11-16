import {
  ArraySchema,
  BooleanSchema,
  DateSchema,
  DescriptionAction,
  GenericSchema,
  LiteralSchema,
  NullableSchema,
  NumberSchema,
  ObjectSchema,
  SchemaWithPipe,
  StringSchema,
  UnionSchema,
} from 'valibot';

const createSchemaPredicate =
  <T>(schemaName: string, kind = 'schema') =>
  (schema: unknown): schema is T => {
    return (
      typeof schema === 'object' &&
      schema !== null &&
      'kind' in schema &&
      schema.kind === kind &&
      'type' in schema &&
      schema.type === schemaName
    );
  };

export const isStringSchema =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchemaPredicate<StringSchema<any>>('string');

export const isNumberSchema =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchemaPredicate<NumberSchema<any>>('number');

export const isObjectSchema =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchemaPredicate<ObjectSchema<any, any>>('object');

export const isArraySchema =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchemaPredicate<ArraySchema<any, any>>('array');

export const isNullableSchema =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchemaPredicate<NullableSchema<any, any>>('nullable');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isDateSchema = createSchemaPredicate<DateSchema<any>>('date');

export const isBooleanSchema =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchemaPredicate<BooleanSchema<any>>('boolean');

export const isUnionSchema =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchemaPredicate<UnionSchema<any, any>>('union');

export const isLiteralSchema =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchemaPredicate<LiteralSchema<any, any>>('literal');

export const isWithPipeSchema = (
  schema: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): schema is SchemaWithPipe<any> => {
  return (
    !!schema &&
    typeof schema === 'object' &&
    'pipe' in schema &&
    Array.isArray(schema.pipe)
  );
};

export const isDescriptionAction = createSchemaPredicate<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DescriptionAction<any, any>
>('description', 'action');
