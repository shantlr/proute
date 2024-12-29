import { literal, object, undefined } from 'valibot';
import { mergeResponses } from './merge-responses';

describe('create-endpoint/merge-ressponses', () => {
  it('should', () => {
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
});
