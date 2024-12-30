# proute

[WIP]

Typed file based express router

Currently only support typescript and vite-node

- [proute](#proute)
  - [Overview](#overview)
  - [Getting started](#getting-started)
    - [Installation](#installation)
    - [Setup](#setup)
  - [Features](#features)
    - [File based routing](#file-based-routing)
    - [Endpoint handler](#endpoint-handler)
    - [Middlewares](#middlewares)
      - [Add extra param to endpoint handler](#add-extra-param-to-endpoint-handler)
      - [Authentication middleware](#authentication-middleware)
    - [Security Schemes](#security-schemes)
    - [File auto intializing](#file-auto-intializing)
    - [Docs](#docs)
    - [Enable docs](#enable-docs)
    - [Endpoint description](#endpoint-description)
    - [Valibot action](#valibot-action)

## Overview

- File based routing
  - nested folder structure
  - flat structure
- Typed endpoint (path params, query params, body, responses)
- middlewares
- Input validation (path params, query params, body)
- Autogenerated openapi documentation
- Resources management

## Getting started

### Installation

```bash
yarn add -D proute
```

### Setup

```ts
// vite.config.ts
import { defineConfig } from 'vitest/config';
import { prouteVitePlugin } from 'proute/plugins/vite';

export default defineConfig({
  plugins: [
    prouteVitePlugin({
      inputPath: './src/router', // folder where you are residing your endpoints files
      outputRouter: './src/router/index.ts', // file where the router will be generated, default: $inputPath/index.ts
      outputBaseConf: './src/router/base-conf.ts', // file where utils will be generated, default: $inputPath/base-conf.ts
      resourcesPath: './src/router/resources.ts', // file that exports resources schemas, default: $inputPath/resources.ts
    }),
  ],
});
```

When vite-node server is started, the plugin will automatically generate a file at $inputPath which will export a `router`

Which can then be used with express app

```ts
// src/index.ts
import express from 'express';
import bodyParser from 'body-parser';
import { router } from './src/router';
const app = express();

// NOTE: proute will not parse body by itself and expect
// you to use a middleware like 'body-parser' to handle that part
app.use(bodyParser.json(), router);

app.listen(3000);
```

## Features

### File based routing

```bash
src/router
| # using a folder based structure
|-- products
|   |-- get.ts # GET /products
|   |-- post.ts # POST /products
|   |-- delete.ts # DELETE /products
|   |-- $id
|       |-- get.ts # GET /products/:id
|
|-- stores
    |-- get.ts # GET /stores
    |-- post.ts # POST /stores
    |-- delete.ts # DELETE /stores
    | # you can also use/combine with a flat style structure using `.` as a separator
    |-- $id.get.ts # GET /stores/:id
    |-- $id.patch.ts # PATCH /stores/:id
    |-- $id.products.get.ts # GET /stores/:id/products
```

### Endpoint handler

Each endpoint handler file should export as default an object containing a `conf` field that define the endpoint specs and a `handler` field that will handle the endpoint.

Proute integrate with [valibot](https://valibot.dev/) for validation and typing

```ts
// src/router/products/get.ts
import { endpointConf, EndpointHandler } from 'proute';
import {
  array,
  object,
  nullish,
  number,
  string,
  union,
  literal,
} from 'valibot';
import { ROUTES } from '../base-conf.ts'; // 'base-conf' file is an auto generated file that expose the ROUTES object

const conf = endpointConf(ROUTE.get['/products'], {
  // schema of the expected querysearch params
  query: object({
    search: nullish(string()),
    limit: nullish(number()),
    offset: nullish(number()),
  }),

  // schema of possibles responses
  responses: {
    200: object({
      products: array(
        object({
          id: string(),
          name: string(),
        }),
      ),
    }),
    500: null, // null for empty response
  },
});

const handler: EndpointHandler<typeof conf> = async ({
  req,
  res,
  query: { search, limit, offset },
}) => {
  try {
    const products = await fetchProducts({ search, limit, offset });

    return {
      status: 200,
      data: {
        products,
      },
    };
  } catch {
    return {
      status: 500,
    };
  }
};

export default { conf, handler };
```

```ts
// src/router/products/$id/get.ts
import { endpointConf, EndpointHandler } from 'proute';
import { ROUTES } from '../../base-conf.ts'; // 'base-conf' file is an auto generated file that expose the ROUTES object

const conf = endpointConf(ROUTES.get['/products/:id'], {
  // ...
});

const handler: EndpointHandler<typeof conf> = ({
  // route params will be available here
  params: { id },
}) => {
  // ...
};
```

### Middlewares

The vite plugin will automatically generate a `proute.utils.ts` file. It will contain a helper named `createMiddleware` that allow you to create middlewares

#### Add extra param to endpoint handler

You can provide a function to `createMiddleware` that return param to be forwarded to any endpoint handler that use this middleware

```ts
export const addLogger = createMiddleware(({ req, res }) => {
  return {
    logger: createLogger(),
  };
});
```

```ts
// src/router/books.get.ts

const conf = expressConf(...).middleware(addLogger);

// logger is now accessible from handler first argument
const handler: EndpointHandler<typeof conf> = ({ logger }) => {

}

export default { conf, handler };
```

#### Authentication middleware

```ts
export const apiKeyAuthenticated = createMiddleware(
  {
    responses: {
      401: picklist(['UNAUTHENTICATED', 'INVALID_SCHEME']),
    },
    security: ['ApiKey'],
  },
  async ({ req, res }) => {
    const auth = req.headers.authorization;

    if (!auth) {
      return {
        status: 401,
        data: 'UNAUTHENTICATED',
      };
    }

    if (!auth.startsWith('Bearer ')) {
      return {
        status: 401,
        data: 'INVALID_SCHEME',
      };
    }
    const apiKey = auth.slice(7);

    // your implementation
    if (!(await isValidApiKey(apiKey))) {
      return {
        status: 403,
        data: '',
      };
    }
    const roles = await getApiKeyRoles(apiKey);

    return {
      // you can then forward roles as extra param for endpoint handler/next middleware
      extraParam: {
        roles,
      },
    };
  },
);
```

### Security Schemes

You can create a config.ts file inside your router folder that will be automatically loaded.
This config file should export a proute config object.

```ts
// src/router/config.ts
import { prouteConfig } from 'proute';

export default prouteConfig({
  securitySchemes: {
    ApiKey: {
      type: 'http',
      scheme: 'bearer',
    },
  },
});
```

You can then specify that a route require this authentication scheme using the `security` field of the route conf

```ts
// src/router/books.get.ts

const conf = expressConf(ROUTE.get['/books'], {
  security: ['ApiKey'],
});

// ...
```

A middleware can also specify that it will require the authentication scheme.
The `security` field will then be forwarded to any route that use this middleware

```ts
//...
export const authenticated = createMiddleware(
  {
    security: ['ApiKey'],
    responses: {
      401: null,
      403: null,
    },
  },
  async function authenticatedMdw({ req }) {
    // authentication implementation ...
  },
);
```

### File auto intializing

When the vite server is running, any empty endpoint file will be automatically initialized with a basic endpoint boilerplate

### Docs

Openapi documentation will be generated automatically based on valibots schemas

### Enable docs

```ts
// vite.config.ts
import { defineConfig } from 'vitest/config';
import { prouteVitePlugin } from 'proute/plugins/vite';

export default defineConfig({
  plugins: [
    prouteVitePlugin({
      // ...
      docs: {
        uiEndpoint: '/docs', // openapi ui using rapidocs
        jsonEndpoint: '/docs/openapi.json', // default: $uiEndpoint/openapi.json`
      },
    }),
  ],
});
```

### Endpoint description

You can provide several metadata to `endpointConf` that will be included to the generated openapi json

```ts
// src/router/books.get.ts
const conf = endpointConf(ROUTE.get['/books'] {
  summary: 'Get books',
  description: 'Get all books',
  tags: ['books'],
  // ...
});
```

### Valibot action

Valibot action can be used to add extra validation / metadata

```ts
// src/router/books.get.ts
import {
  pipe,
  decimal,
  transform,
  string,
  object,
  description, // `description` action can be used to add description to the generated openapi json
} from 'valibot';
import { example } from 'proute'; // Proute provide an `example` action that allow you to add examples metadata

const conf = endpointConf(ROUTE.get['/books'], {
  summary: 'Get books',
  description: 'Get all books',
  tags: ['books'],
  // ...
  query: object({
    limit: pipe(
      decimal(),
      transform((v) => Number(v)),
      minValue(1),
      maxValue(10),
      description('Limit number of books in response'),
    ),
  }),
  responses: {
    200: object({
      books: pipe(
        object({
          id: pipe(string(), description('Book id')),
        }),
        description('List of books'),
        example({
          id: 'book_1',
        }),
        example({
          id: 'book_2',
        }),
      ),
    }),
  },
});
```
