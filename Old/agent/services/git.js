import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function getGitStatus(repoPath) {
  try {
    const { stdout: statusOut } = await execPromise('git status --porcelain', { cwd: repoPath });
    const { stdout: branchOut } = await execPromise('git branch --show-current', { cwd: repoPath });

    const untrackedCount = statusOut.split('\n').filter(line => line.startsWith('??')).length;
    const modifiedCount = statusOut.split('\n').filter(line => line.startsWith(' M') || line.startsWith('M ')).length;

    let history = [];
    try {
      const { stdout: logOut } = await execPromise('git log -n 5 --oneline', { cwd: repoPath });
      history = logOut.trim().split('\n').filter(Boolean);
    } catch (_) {}

    let remoteUrl = '';
    try {
      const { stdout: remoteOut } = await execPromise('git config --get remote.origin.url', { cwd: repoPath });
      remoteUrl = remoteOut.trim();
    } catch (_) {}

    return {
      status: 'success',
      branch: branchOut.trim() || 'main',
      modified: modifiedCount,
      untracked: untrackedCount,
      history,
      remoteUrl
    };
  } catch (err) {
    return {
      status: 'error',
      message: `Failed to read git status: ${err.message}`
    };
  }
}

/**
 * Creates a repository on GitHub via REST API
 */
export async function createGitHubRepository(repoName, token, onLog) {
  onLog('info', `Connecting to GitHub REST API to create repository '${repoName}'...`);
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repoName,
        private: true,
        description: 'Scaffolded and managed by Nexus DevOps Platform'
      })
    });

    const data = await response.json();
    if (response.status === 201) {
      onLog('success', `GitHub repository created successfully: ${data.html_url}`);
      return { status: 'success', repoUrl: data.html_url };
    } else if (response.status === 422 && data.errors?.some(e => e.message?.includes('already exists'))) {
      // Find the user/org name to construct the URL
      const userRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = await userRes.json();
      const fallbackUrl = `https://github.com/${userData.login}/${repoName}`;
      onLog('warn', `GitHub repository '${repoName}' already exists. Reusing: ${fallbackUrl}`);
      return { status: 'success', repoUrl: fallbackUrl };
    } else {
      throw new Error(data.message || `GitHub returned status ${response.status}`);
    }
  } catch (err) {
    onLog('error', `GitHub repository creation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Runs local Git commands to stage, commit, and push project to remote
 */
export async function initializeAndPushRepository(projectPath, repoUrl, token, onLog) {
  onLog('info', 'Initializing Git configuration on host...');
  
  const runCmd = async (cmd, desc) => {
    onLog('info', `Executing: ${cmd}`);
    try {
      const { stdout, stderr } = await execPromise(cmd, { cwd: projectPath });
      if (stdout.trim()) onLog('info', stdout.trim());
      if (stderr.trim()) onLog('warn', stderr.trim());
      return true;
    } catch (err) {
      let details = err.message;
      if (err.stdout) details += `\nStdout: ${err.stdout}`;
      if (err.stderr) details += `\nStderr: ${err.stderr}`;
      onLog('error', `Failed to ${desc}: ${details}`);
      throw err;
    }
  };

  try {
    // 1. Ensure git init
    await execPromise('git rev-parse --is-inside-work-tree', { cwd: projectPath })
      .catch(async () => {
        onLog('info', 'Directory is not a git repository. Running git init...');
        await runCmd('git init', 'initialize git repository');
        await runCmd('git checkout -b main', 'set default branch to main');
      });

    // 2. Configure dummy identity if none exists
    try {
      await execPromise('git config user.name', { cwd: projectPath });
    } catch (_) {
      onLog('info', 'Git user.name not set on host. Configuring default...');
      await runCmd('git config user.name "Nexus DevOps"', 'set git user.name');
    }
    try {
      await execPromise('git config user.email', { cwd: projectPath });
    } catch (_) {
      onLog('info', 'Git user.email not set on host. Configuring default...');
      await runCmd('git config user.email "nexus@local.dev"', 'set git user.email');
    }

    // 2.5 Find and clean nested .git directories (submodule prevention)
    try {
      const items = fs.readdirSync(projectPath);
      for (const item of items) {
        const itemPath = path.join(projectPath, item);
        if (fs.statSync(itemPath).isDirectory()) {
          const nestedGitPath = path.join(itemPath, '.git');
          if (fs.existsSync(nestedGitPath)) {
            onLog('info', `Detected nested git repo inside '${item}'. Cleaning to prevent submodule issues...`);
            if (process.platform === 'win32') {
              await execPromise(`rmdir /s /q "${nestedGitPath}"`, { cwd: projectPath }).catch((err) => {
                onLog('warn', `Failed to delete nested .git folder via cmd: ${err.message}`);
              });
            } else {
              fs.rmSync(nestedGitPath, { recursive: true, force: true });
            }
            // Remove from git cache so it can be tracked as a normal directory
            await execPromise(`git rm --cached -r "${item}"`, { cwd: projectPath }).catch(() => {});
          }
        }
      }
    } catch (e) {
      onLog('warn', `Failed to clean nested git repositories: ${e.message}`);
    }

    // 3. Stage and commit
    await runCmd('git add .', 'stage files');
    
    // Check if there are changes to commit
    const { stdout: statusOut } = await execPromise('git status --porcelain', { cwd: projectPath });
    if (statusOut.trim()) {
      let commitMsg = "Automated commit: Update infrastructure and code configs";
      try {
        await execPromise('git rev-parse HEAD', { cwd: projectPath });
      } catch (_) {
        commitMsg = "Initial commit from Nexus DevOps Platform";
      }
      await runCmd(`git commit --allow-empty --no-verify -m "${commitMsg}"`, 'commit changes');
    } else {
      onLog('info', 'No new changes to commit.');
    }

    // 4. Authenticate remote URL
    const cleanUrl = repoUrl.replace(/^https?:\/\//, '');
    const authUrl = `https://${token}@${cleanUrl}${cleanUrl.endsWith('.git') ? '' : '.git'}`;

    // Remove existing origin if set
    try {
      await execPromise('git remote remove origin', { cwd: projectPath });
    } catch (_) {}

    await runCmd(`git remote add origin ${authUrl}`, 'add remote origin');
    
    // 5. Push to remote
    onLog('info', 'Pushing codebase to remote repository...');
    await runCmd('git -c credential.helper= push -u origin main --force', 'push codebase to remote');
    
    onLog('success', 'Local repository successfully synchronized and pushed to GitHub.');
    return { status: 'success' };
  } catch (err) {
    if (err.message.includes('without `workflow` scope')) {
      onLog('error', 'Push rejected: Your GitHub Personal Access Token is missing the `workflow` scope. Please generate a new token on GitHub with both `repo` and `workflow` scopes enabled to push CI/CD files.');
    } else {
      onLog('error', `Git push pipeline failed: ${err.message}`);
    }
    throw err;
  }
}
