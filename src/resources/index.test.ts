import { array, boolean, date, number, object, parse, string } from 'valibot';
import { createResource, isResource, createResponseSchemaMapper } from '.';
import { returnType } from './helpers';

const book = createResource({
  input: returnType<{
    id: string;
    name: string;
    author: string;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  }>,
  output: object({
    id: string(),
    name: string(),
    author: string(),
    published_at: string(),
  }),
  map: (input) => ({
    id: input.id,
    name: input.name,
    author: input.author,
    published_at: input.publishedAt,
  }),
});

describe('resources', () => {
  describe('isResource', () => {
    it('should return true for resource schema', () => {
      expect(isResource(book)).toBe(true);
    });
    it('should return false for non-resource schema', () => {
      expect(isResource(string())).toBe(false);
      expect(isResource(object({}))).toBe(false);
    });
  });

  describe('createResource', () => {
    it('should map resource', () => {
      expect(
        parse(book, {
          id: '1',
          name: 'Book',
          author: 'Author',
          publishedAt: '2021-01-01',
          createdAt: '2021-01-01',
          updatedAt: '2021-01-01',
        }),
      ).toEqual({
        id: '1',
        name: 'Book',
        author: 'Author',
        published_at: '2021-01-01',
      });
    });
  });

  describe('mapResponseSchema', () => {
    it('should return undefined for a basic object schema', () => {
      const mapper = createResponseSchemaMapper(
        object({
          id: string(),
          name: string(),
        }),
      );
      expect(mapper).toBeUndefined();
    });
    it('should return undefined for scalar schema', () => {
      expect(createResponseSchemaMapper(string())).toBeUndefined();
      expect(createResponseSchemaMapper(boolean())).toBeUndefined();
      expect(createResponseSchemaMapper(date())).toBeUndefined();
      expect(createResponseSchemaMapper(number())).toBeUndefined();
    });

    it('should map resource schema', () => {
      const mapper = createResponseSchemaMapper(book);
      expect(mapper).toBeInstanceOf(Function);
      expect(
        mapper({
          id: '1',
          name: 'Book',
          author: 'Author',
          publishedAt: '2021-01-01',
          createdAt: '2021-01-01',
          updatedAt: '2021-01-01',
        }),
      ).toEqual({
        id: '1',
        name: 'Book',
        author: 'Author',
        published_at: '2021-01-01',
      });
    });

    it('should map object containing a resource schema', () => {
      const mapper = createResponseSchemaMapper(
        object({
          book,
        }),
      );
      expect(mapper).toBeInstanceOf(Function);
      expect(
        mapper({
          book: {
            id: '1',
            name: 'Book',
            author: 'Author',
            publishedAt: '2021-01-01',
            createdAt: '2021-01-01',
            updatedAt: '2021-01-01',
          },
        }),
      ).toEqual({
        book: {
          id: '1',
          name: 'Book',
          author: 'Author',
          published_at: '2021-01-01',
        },
      });
    });
    it('should map array of resource schema', () => {
      const mapper = createResponseSchemaMapper(array(book));
      expect(mapper).toBeInstanceOf(Function);
      expect(
        mapper([
          {
            id: '1',
            name: 'Book',
            author: 'Author',
            publishedAt: '2021-01-01',
            createdAt: '2021-01-01',
            updatedAt: '2021-01-01',
          },
          {
            id: '2',
            name: 'Book 2',
            author: 'Author 2',
            publishedAt: '2021-01-01',
            createdAt: '2021-01-01',
            updatedAt: '2021-01-01',
          },
        ]),
      ).toEqual([
        {
          id: '1',
          name: 'Book',
          author: 'Author',
          published_at: '2021-01-01',
        },
        {
          id: '2',
          name: 'Book 2',
          author: 'Author 2',
          published_at: '2021-01-01',
        },
      ]);
    });

    it('should map array of object container a resource', () => {
      const mapper = createResponseSchemaMapper(
        array(
          object({
            book,
          }),
        ),
      );
      expect(mapper).toBeInstanceOf(Function);
      expect(
        mapper([
          {
            book: {
              id: '1',
              name: 'Book',
              author: 'Author',
              publishedAt: '2021-01-01',
              createdAt: '2021-01-01',
              updatedAt: '2021-01-01',
            },
          },
          {
            book: {
              id: '2',
              name: 'Book 2',
              author: 'Author 2',
              publishedAt: '2021-01-01',
              createdAt: '2021-01-01',
              updatedAt: '2021-01-01',
            },
          },
        ]),
      ).toEqual([
        {
          book: {
            id: '1',
            name: 'Book',
            author: 'Author',
            published_at: '2021-01-01',
          },
        },
        {
          book: {
            id: '2',
            name: 'Book 2',
            author: 'Author 2',
            published_at: '2021-01-01',
          },
        },
      ]);
    });
  });
});
