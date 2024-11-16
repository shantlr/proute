# proute

[WIP]

Typed file based express router

Currently only support typescript and vite-node

## Overview

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

const conf = endpointConf({
  route: ROUTE.get['/products'],

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
    500: null,
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

const conf = endpointConf({
  ROUTE: ROUTES.get['/products/:id'],
  // ...
});

const handler: EndpointHandler<typeof conf> = ({
  // route params will be available here
  params: { id },
}) => {
  // ...
};
```

## Getting started

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

## File auto intializing

When the vite server is running, any empty endpoint file will be automatically initialized with a basic endpoint boilerplate

## Docs

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
