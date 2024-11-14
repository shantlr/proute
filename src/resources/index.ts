import { BaseSchema, CustomIssue, GenericSchema, InferOutput } from 'valibot';
import { FlattenType } from '../ts-utils';

export type ResourceSchema<Input, Output> = BaseSchema<
  Input,
  Output,
  CustomIssue
> & {
  output: Output;
};

export const createResource = <Input, Output extends GenericSchema>(arg: {
  input: GenericSchema<Input> | ((arg: Input) => Input);
  output: Output;
  map: (input: Input) => InferOutput<Output>;
}): ResourceSchema<Input, InferOutput<Output>> => {
  return {
    kind: 'schema' as const,
    type: 'kamel/resource',
    reference: createResource,
    expects: 'unknown',
    async: false,

    output: arg.output,

    '~standard': 1,
    '~vendor': 'valibot',

    // get '~standard'() {},
    '~validate'({ value }) {
      // no check for input type

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return arg.map(value as Input) as any;
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

export const identity = <T>(arg: T) => arg;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const returnType = <T extends (...args) => any>(
  arg: NonNullable<Awaited<ReturnType<T>>>,
) => arg;
