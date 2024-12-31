import {
  GenericSchema,
  nullable,
  UndefinedSchema,
  union,
  UnionSchema,
} from 'valibot';
import { AnyEndpointResponses } from '../types';

type MapSchema<Schema extends GenericSchema | null> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Schema extends UndefinedSchema<any> ? null : Schema;

type MergeSchema<
  SchemaA extends GenericSchema | null,
  SchemaB extends GenericSchema | null,
> = SchemaA extends GenericSchema
  ? SchemaB extends GenericSchema
    ? UnionSchema<[SchemaA, SchemaB], undefined>
    : SchemaA | null
  : SchemaB | null;

export type MergeResponse<
  ResponsesA extends AnyEndpointResponses,
  ResponsesB extends AnyEndpointResponses,
  CommonKeys extends keyof ResponsesA & keyof ResponsesB = keyof ResponsesA &
    keyof ResponsesB,
> = Omit<ResponsesA, CommonKeys> &
  Omit<ResponsesB, CommonKeys> & {
    [Key in CommonKeys]: ResponsesA[Key] extends GenericSchema
      ? ResponsesB[Key] extends GenericSchema
        ? MergeSchema<MapSchema<ResponsesA[Key]>, MapSchema<ResponsesB[Key]>>
        : ResponsesA[Key]
      : ResponsesB[Key] extends GenericSchema
        ? ResponsesB[Key]
        : null;
  };

export const mergeResponses = (
  responses: AnyEndpointResponses[],
): AnyEndpointResponses => {
  const groupedByStatus = responses.reduce(
    (acc, res) => {
      for (const [status, schema] of Object.entries(res)) {
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(schema);
      }
      return acc;
    },
    {} as Record<PropertyKey, (GenericSchema | null)[]>,
  );

  return Object.fromEntries(
    Object.entries(groupedByStatus).map(([status, schemas]) => {
      if (schemas.length === 1) {
        return [status, schemas[0]];
      }
      const res = schemas.reduce(
        (acc, schema) => {
          if (schema === null) {
            acc.withNull = true;
          } else {
            acc.schemas.push(schema);
          }
          return acc;
        },
        {
          schemas: [] as GenericSchema[],
          withNull: false,
        },
      );

      if (res.withNull && !res.schemas.length) {
        return [status, null];
      }

      if (res.schemas.length > 0 && !res.withNull) {
        return [status, union(res.schemas)];
      }

      return [status, nullable(union([...res.schemas]))];
    }),
  );
};
