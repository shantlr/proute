/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ArraySchema,
  BaseMetadata,
  BaseSchema,
  BaseValidation,
  BooleanSchema,
  DateSchema,
  DescriptionAction,
  LengthAction,
  LiteralSchema,
  MaxLengthAction,
  MaxValueAction,
  MinLengthAction,
  MinValueAction,
  NullableSchema,
  NullishSchema,
  NumberSchema,
  ObjectSchema,
  OptionalSchema,
  SchemaWithPipe,
  StringSchema,
  UnionSchema,
} from 'valibot';

export type ExampleAction<TInput> = BaseMetadata<TInput> & {
  example: any;
};

export const example = <TInput>(e: any): ExampleAction<TInput> => ({
  kind: 'metadata',
  type: 'proute/example',
  reference: example,
  example: e,
});

const createSchemaPredicate =
  <
    T extends
      | BaseValidation<any, any, any>
      | BaseSchema<any, any, any>
      | BaseMetadata<any>,
  >(
    schemaName: T['type'],
    kind: T['kind'],
  ) =>
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

export const isStringSchema = createSchemaPredicate<StringSchema<any>>(
  'string',
  'schema',
);

export const isNumberSchema = createSchemaPredicate<NumberSchema<any>>(
  'number',
  'schema',
);

export const isObjectSchema = createSchemaPredicate<ObjectSchema<any, any>>(
  'object',
  'schema',
);

export const isArraySchema = createSchemaPredicate<ArraySchema<any, any>>(
  'array',
  'schema',
);

export const isNullableSchema = createSchemaPredicate<NullableSchema<any, any>>(
  'nullable',
  'schema',
);
export const isNullishSchema = createSchemaPredicate<NullishSchema<any, any>>(
  'nullish',
  'schema',
);
export const isOptionalSchema = createSchemaPredicate<OptionalSchema<any, any>>(
  'optional',
  'schema',
);

export const isDateSchema = createSchemaPredicate<DateSchema<any>>(
  'date',
  'schema',
);

export const isBooleanSchema = createSchemaPredicate<BooleanSchema<any>>(
  'boolean',
  'schema',
);

export const isUnionSchema = createSchemaPredicate<UnionSchema<any, any>>(
  'union',
  'schema',
);

export const isLiteralSchema = createSchemaPredicate<LiteralSchema<any, any>>(
  'literal',
  'schema',
);

export const isWithPipeSchema = (
  schema: unknown,
): schema is SchemaWithPipe<any> => {
  return (
    !!schema &&
    typeof schema === 'object' &&
    'pipe' in schema &&
    Array.isArray(schema.pipe)
  );
};

export const isExampleAction = createSchemaPredicate<ExampleAction<any>>(
  'proute/example',
  'metadata',
);

export const isDescriptionAction = createSchemaPredicate<
  DescriptionAction<any, any>
>('description', 'metadata');

export const isMinValueAction = createSchemaPredicate<
  MinValueAction<any, any, any>
>('min_value', 'validation');
export const isMaxValueAction = createSchemaPredicate<
  MaxValueAction<any, any, any>
>('max_value', 'validation');
export const isLengthAction = createSchemaPredicate<
  LengthAction<any, any, any>
>('length', 'validation');
export const isMinLengthAction = createSchemaPredicate<
  MinLengthAction<any, any, any>
>('min_length', 'validation');
export const isMaxLengthAction = createSchemaPredicate<
  MaxLengthAction<any, any, any>
>('max_length', 'validation');
