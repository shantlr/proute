import { GenericSchema, union, UnionSchema } from 'valibot';
import { AnyEndpointResponses } from '../types';

export type MergeResponse<
  ResponsesA extends AnyEndpointResponses,
  ResponsesB extends AnyEndpointResponses,
> = {
  [Status in
    | keyof ResponsesA
    | keyof ResponsesB]: Status extends keyof ResponsesA
    ? ResponsesA[Status] extends GenericSchema
      ? Status extends keyof ResponsesB
        ? ResponsesB[Status] extends GenericSchema
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            UnionSchema<(ResponsesA[Status] | ResponsesB[Status])[], any>
          : ResponsesA[Status]
        : ResponsesA[Status]
      : ResponsesA[Status]
    : Status extends keyof ResponsesB
      ? ResponsesB[Status]
      : never;
};

export const mergeResponses = (
  responses: AnyEndpointResponses[],
): AnyEndpointResponses => {
  const groupedByStatus = responses.reduce(
    (acc, res) => {
      for (const [status, schema] of Object.entries(res)) {
        if (!schema) {
          continue;
        }

        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(schema);
      }
      return acc;
    },
    {} as Record<PropertyKey, GenericSchema[]>,
  );

  return Object.fromEntries(
    Object.entries(groupedByStatus).map(([status, schemas]) => {
      if (schemas.length === 1) {
        return [status, schemas[0]];
      }
      return [status, union(schemas)];
    }),
  );
};
