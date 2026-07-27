import fs from 'fs';
import path from 'path';

/**
 * Scan a directory on the host machine to support folder picking.
 */
export function browseDirectory(dirPath) {
  try {
    const resolvedPath = path.resolve(dirPath || process.cwd()).replace(/\\/g, '/');
    const items = fs.readdirSync(resolvedPath, { withFileTypes: true });

    const dirs = [];
    const files = [];

    // Always provide parent directory link if not root
    const parentPath = path.dirname(resolvedPath).replace(/\\/g, '/');

    for (const item of items) {
      if (item.name.startsWith('.') && item.name !== '.git') continue; // Hide hidden dotfiles except .git
      
      if (item.isDirectory()) {
        dirs.push(item.name);
      } else {
        files.push(item.name);
      }
    }

    return {
      status: 'success',
      currentPath: resolvedPath,
      parentPath: resolvedPath === parentPath ? null : parentPath,
      dirs: dirs.sort(),
      files: files.sort()
    };
  } catch (err) {
    return {
      status: 'error',
      message: `Failed to browse directory: ${err.message}`
    };
  }
}

/**
 * Analyze directory to detect git repositories and frameworks.
 */
export function analyzeDirectory(dirPath) {
  try {
    const resolvedPath = path.resolve(dirPath).replace(/\\/g, '/');
    if (!fs.existsSync(resolvedPath)) {
      return { status: 'error', message: 'Directory does not exist.' };
    }

    const items = fs.readdirSync(resolvedPath);
    const hasGit = items.includes('.git');

    let framework = 'generic';
    let type = 'unknown';

    // Framework detection rules
    if (items.includes('package.json')) {
      type = 'javascript';
      const packageJson = JSON.parse(fs.readFileSync(path.join(resolvedPath, 'package.json'), 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['react']) {
        framework = 'react';
      } else if (deps['vue']) {
        framework = 'vue';
      } else if (deps['next']) {
        framework = 'next';
      } else {
        framework = 'node';
      }
    } else if (items.includes('requirements.txt') || items.includes('setup.py') || items.includes('Pipfile') || items.includes('pyproject.toml')) {
      type = 'python';
      framework = 'python';
    } else if (items.includes('pom.xml')) {
      type = 'java';
      framework = 'maven';
    } else if (items.includes('build.gradle')) {
      type = 'java';
      framework = 'gradle';
    } else if (items.includes('go.mod')) {
      type = 'go';
      framework = 'go';
    } else if (items.includes('Cargo.toml')) {
      type = 'rust';
      framework = 'rust';
    } else if (items.some(f => f.endsWith('.sln') || f.endsWith('.csproj'))) {
      type = 'dotnet';
      framework = 'dotnet';
    }

    return {
      status: 'success',
      path: resolvedPath,
      hasGit,
      type,
      framework
    };
  } catch (err) {
    return {
      status: 'error',
      message: `Failed to analyze directory: ${err.message}`
    };
  }
}
