import { readdir, stat } from 'fs/promises';
import path from 'path';
import { Method } from '../../types';
import {
  EndpointModule,
  MiddlewaresModule,
  ModuleTreeNode,
  RouterModules,
} from './types';
import { sortExpressPathPriority } from './sort-express-path-priority';

const FLAT_FILE_NAME_SEPARATOR = '.';
const FLAT_FILE_NAME_TO_PATH = new RegExp('\\.', 'g');

const FILE_REGEX =
  /((?<flatPath>[a-zA-Z0-9$-.]+)\.)?(?<method>get|post|put|delete|patch|options|head|middlewares)\.(?<ext>tsx?|jsx?|mjs|cjs)$/;

export const loadRouterModules = async (
  dir: string,
): Promise<RouterModules> => {
  const s = await stat(dir);
  if (s.isDirectory()) {
    const moduleTree = await loadDirectory(dir, dir);
    const module = flattenModuleTree(moduleTree);
    return sortExpressPathPriority(module);
  }
  return {
    modules: [],
  };
};

async function loadDirectory(dir: string, rootDir): Promise<ModuleTreeNode> {
  const { name } = path.parse(path.relative(rootDir, dir));
  const result: ModuleTreeNode = {
    childen: {},
    endpoints: [],
    middlewares: [],
    pattern: name ?? '',
  };
  const directory = await readdir(dir, { withFileTypes: true });

  for (const file of directory) {
    if (file.isDirectory()) {
      const subDir = await loadDirectory(path.resolve(dir, file.name), rootDir);
      if (!result.childen[subDir.pattern]) {
        result.childen[subDir.pattern] = subDir;
      } else {
        mergeTree(result.childen[subDir.pattern], subDir);
      }
      continue;
    }

    if (file.isFile()) {
      const matched = file.name.match(FILE_REGEX);
      if (matched) {
        const moduleId = path.resolve(dir, file.name);

        const module: EndpointModule | MiddlewaresModule =
          matched.groups.method === 'middlewares'
            ? {
                type: 'middleware',
                id: moduleId,
              }
            : {
                type: 'endpoint',
                id: moduleId,
                expressPath: formatExpressEndpointPath(
                  path.relative(
                    rootDir,
                    path.resolve(
                      dir,
                      matched.groups.flatPath?.replace(
                        FLAT_FILE_NAME_TO_PATH,
                        '/',
                      ) ?? '',
                    ),
                  ),
                ),
                method: matched.groups.method as Method,
              };
        pushModuleNode(
          result,
          matched.groups.flatPath
            ? matched.groups.flatPath.split(FLAT_FILE_NAME_SEPARATOR)
            : [],
          module,
        );
      }

      continue;
    }
  }

  return result;
}

function formatExpressEndpointPath(folderPath: string) {
  if (!folderPath) {
    return '';
  }

  const expression = folderPath
    .split('/')
    .map((v) => {
      if (v.startsWith('$')) {
        return `:${v.slice(1)}`;
      }
      return v;
    })
    .join('/');
  if (!expression.startsWith('/')) {
    return `/${expression}`;
  }
  return expression;
}

function flattenModuleTree(
  tree: ModuleTreeNode,
  {
    parentsMiddlewareIds = [],
  }: {
    parentsMiddlewareIds?: string[];
  } = {},
): RouterModules {
  const res: RouterModules = {
    modules: [
      ...tree.middlewares.map((m) => m),
      ...tree.endpoints.map((endpoint) => {
        const middlewaresModuleIds = [
          ...parentsMiddlewareIds,
          ...tree.middlewares.map((m) => m.id),
        ];
        return {
          ...endpoint,
          middlewaresModuleIds,
        };
      }),
    ],
  };

  for (const childNode of Object.values(tree.childen)) {
    const flattenedChild = flattenModuleTree(childNode, {
      parentsMiddlewareIds: [
        ...parentsMiddlewareIds,
        ...tree.middlewares.map((m) => m.id),
      ],
    });
    res.modules.push(...flattenedChild.modules);
  }

  return res;
}

function pushModuleNode(
  tree: ModuleTreeNode,
  flatPath: string[],
  node: EndpointModule | MiddlewaresModule,
) {
  if (!flatPath.length) {
    if (node.type === 'endpoint') {
      tree.endpoints.push(node);
    } else if (node.type === 'middleware') {
      tree.middlewares.push(node);
    }
    return;
  }

  const [childKey, ...rest] = flatPath;
  if (childKey) {
    if (!tree.childen[childKey]) {
      tree.childen[childKey] = {
        pattern: childKey,
        childen: {},
        middlewares: [],
        endpoints: [],
      };
      pushModuleNode(tree.childen[childKey], rest, node);
    } else {
      pushModuleNode(tree.childen[childKey], rest, node);
    }
  } else {
    pushModuleNode(tree, rest, node);
  }
}
function mergeTree(treeA: ModuleTreeNode, treeB: ModuleTreeNode) {
  treeA.endpoints.push(...treeB.endpoints);
  treeA.middlewares.push(...treeB.middlewares);
  for (const [key, child] of Object.entries(treeB.childen)) {
    if (!treeA.childen[key]) {
      treeA.childen[key] = child;
    } else {
      mergeTree(treeA.childen[key], child);
    }
  }
}
