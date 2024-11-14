import path from 'path';

export function formatImportPath(outputDir: string, moduleId: string) {
  const { name, dir } = path.parse(moduleId);
  const relativePath = path.relative(outputDir, path.resolve(dir, name));
  if (relativePath.startsWith('.')) {
    return relativePath;
  }
  return `./${relativePath}`;
}
