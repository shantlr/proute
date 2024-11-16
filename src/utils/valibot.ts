import {
  ArraySchema,
  BooleanSchema,
  DateSchema,
  GenericSchema,
  LiteralSchema,
  NullableSchema,
  NumberSchema,
  ObjectSchema,
  StringSchema,
  UnionSchema,
} from 'valibot';

const createSchemaPredicate =
  <T extends GenericSchema>(schemaName: string) =>
  (schema: unknown): schema is T => {
    return (
      typeof schema === 'object' &&
      schema !== null &&
      'kind' in schema &&
      schema.kind === 'schema' &&
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
