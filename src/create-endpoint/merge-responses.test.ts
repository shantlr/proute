import { literal, object, undefined, union } from 'valibot';
import { mergeResponses } from './merge-responses';

describe('create-endpoint/merge-ressponses', () => {
  it('should merge schemas', () => {
    expect(
      JSON.stringify(
        mergeResponses([
          {
            200: object({ success: literal(true) }),
          },
          {
            400: object({ success: literal(false) }),
            500: undefined(),
          },
        ]),
      ),
    ).toEqual(
      JSON.stringify({
        200: object({ success: literal(true) }),
        400: object({ success: literal(false) }),
        500: undefined(),
      }),
    );
  });

  it('should merge same status schemas', () => {
    expect(
      JSON.stringify(
        mergeResponses([
          {
            200: object({ success: literal(true) }),
          },
          {
            200: object({ success: literal(false) }),
          },
        ]),
      ),
    ).toEqual(
      JSON.stringify({
        200: union([
          object({ success: literal(true) }),
          object({ success: literal(false) }),
        ]),
      }),
    );
  });
});
