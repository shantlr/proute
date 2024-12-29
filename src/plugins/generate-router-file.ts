import path from 'path';
import { RouterModules } from '../load-router/load-folder-tree/types';
import { formatImportPath } from '../utils/import-path';
import { ResolvedOptions } from './types';
import { joinPath } from '../utils/join-path';

export const GENERATED_CODE_HEADER = `// This file is generated by proute, do not edit it manually, it will be override`;

export const generateRouterFile = async (
  routerModules: RouterModules,
  { outputRouter, outputBaseConf, docs }: ResolvedOptions,
) => {
  const results = [GENERATED_CODE_HEADER, ''];

  const { dir: outputDir } = path.parse(outputRouter);

  const modules = routerModules.modules.map((module, index) => {
    return {
      id: module.id,
      module,
      importPath: formatImportPath(outputDir, module.id),
      varName: `$${index}`,
    };
  });
  const moduleById = new Map(modules.map((module) => [module.id, module]));

  const toImportFromProute = ['isRouteEndpointModule', 'createRoute'];
  const toImportFromConf = [];

  // Generate imports
  results.push(`import { Router } from 'express';`);

  for (const { importPath, varName } of modules) {
    results.push(`import ${varName} from '${importPath}';`);
  }

  // Generate router
  results.push('', 'const router = Router();', '');

  // Generate router
  for (const { module, varName } of modules) {
    if (module.type === 'endpoint') {
      results.push(`if (isRouteEndpointModule(${varName})) {`);
      results.push(
        `  const route = createRoute(${varName}, { middlewares: [${module.middlewaresModuleIds.map((id) => moduleById.get(id)!.varName).join(', ')}] });`,
      );
      results.push(
        `  router.${module.method}('${module.expressPath}', route.handler);`,
      );
      results.push(`}`);
    }
  }

  if (!!docs && (docs.enabled === undefined || docs.enabled)) {
    toImportFromProute.push('createOpenapiJson');
    toImportFromConf.push('RESOURCES');

    results.push(`export const openapiJson = createOpenapiJson(`);
    results.push(`  ${JSON.stringify(docs.specs ?? {})},`);
    results.push(`  RESOURCES,`);
    results.push(`  [`);
    for (const { module, varName } of modules) {
      if (module.type === 'endpoint') {
        results.push(
          `    { method: '${module.method}', path: '${module.expressPath}', module: ${varName} },`,
        );
      }
    }
    results.push(`  ],`);
    results.push(`);`);

    const jsonEndpoint =
      docs.jsonEndpoint ?? joinPath(docs.uiEndpoint, `/openapi.json`);
    results.push(`router.get('${jsonEndpoint}', (req, res) => {`);
    results.push(`  res.json(openapiJson);`);
    results.push(`});`);

    if (docs.uiEnabled === undefined || docs.uiEnabled) {
      results.push(`router.get('${docs.uiEndpoint}', (req, res) => {`);
      results.push(
        `  const jsonEndpoint = req.baseUrl ? \`\${req.baseUrl}${jsonEndpoint}\` : '${jsonEndpoint}'`,
      );
      results.push(`  res.send(\``);
      results.push(
        `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
  </head>
  <body>
    <rapi-doc spec-url = "\${jsonEndpoint}"> </rapi-doc>
  </body>
</html>` + '`',
      );
      results.push(`  );`);
      results.push('});');
    }
  }

  results.push('', `export { router };`, '');

  if (toImportFromConf.length) {
    results.splice(
      2,
      0,
      `import { ${toImportFromConf.join(', ')} } from '${formatImportPath(path.parse(outputRouter).dir, outputBaseConf)}';`,
    );
  }
  if (toImportFromProute.length) {
    results.splice(
      2,
      0,
      `import { ${toImportFromProute.join(', ')} } from 'proute';`,
    );
  }

  return results.join('\n');
};
