import {
  GenericSchema,
  InferInput,
  InferObjectInput,
  ObjectSchema,
} from 'valibot';
import { ResourceSchema } from './resources';

export type Method =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'options'
  | 'head';

export type AnyEndpointResponses = Record<number, GenericSchema | null>;

export type EndpointResponseInput<Responses extends AnyEndpointResponses> = {
  [K in keyof Responses]: {
    status: K;
    /**
     * Set value to null to delete the cookie
     */
    cookies?: Record<
      string,
      | string
      | null
      | {
          value: string;
          expires?: Date;
          path?: string;
          domain?: string;
          secure?: boolean;
          httpOnly?: boolean;
          sameSite?: 'strict' | 'lax' | 'none';
          maxAge?: number;
          priority?: 'low' | 'medium' | 'high';
          partitioned?: boolean;
          signed?: boolean;
        }
    >;
    data: MapEndpointReturnType<Responses[K]>;
  };
}[keyof Responses];
type MapEndpointReturnType<Schema> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Schema extends ResourceSchema<infer Input, any>
    ? Input
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Schema extends ObjectSchema<Record<PropertyKey, never>, any>
      ? Record<PropertyKey, never>
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Schema extends ObjectSchema<infer ObjectFields, any>
        ? {
            [K in keyof InferObjectInput<ObjectFields>]: MapEndpointReturnType<
              ObjectFields[K]
            >;
          }
        : Schema extends GenericSchema
          ? InferInput<Schema>
          : undefined | null;
