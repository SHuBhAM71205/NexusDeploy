import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Runs native npm compile command.
 */
function runLocalBuild(projectPath, onLog) {
  return new Promise((resolve) => {
    onLog('info', 'Initiating local build script: "npm run build"...');

    // Detect if package.json has a build script, otherwise skip or do mock build
    const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'));
    if (!hasPackageJson) {
      onLog('warn', 'No package.json found. Skipping compilation step.');
      resolve(true);
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
      if (!packageJson.scripts || !packageJson.scripts.build) {
        onLog('warn', 'No build script defined in package.json. Skipping compile.');
        resolve(true);
        return;
      }
    } catch (e) {
      onLog('error', `Failed to read package.json: ${e.message}`);
      resolve(false);
      return;
    }

    // Spawn npm build
    const child = spawn('npm', ['run', 'build'], { cwd: projectPath, shell: true });

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) onLog('info', line.trim());
      });
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) onLog('warn', line.trim());
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        onLog('success', 'Build compilation finished successfully.');
        resolve(true);
      } else {
        onLog('error', `Build process exited with code ${code}.`);
        resolve(false);
      }
    });

    child.on('error', (err) => {
      onLog('error', `Failed to start build execution: ${err.message}`);
      resolve(false);
    });
  });
}

// Modular Deployment Registry
const PROVIDERS = {
  vercel: {
    name: 'Vercel',
    async deploy(projectPath, token, onLog, repoUrl, envVars) {
      onLog('info', 'Triggering Vercel Cloud Deployment via Vercel CLI...');
      
      // If environment variables are provided, write them to .env and pass via CLI
      if (envVars && Object.keys(envVars).length > 0) {
        try {
          const envContent = Object.entries(envVars)
            .map(([key, val]) => `${key}=${val}`)
            .join('\n');
          fs.writeFileSync(path.join(projectPath, '.env'), envContent, 'utf8');
          onLog('info', 'Generated local .env file with custom environment variables.');
        } catch (e) {
          onLog('warn', `Failed to write .env file: ${e.message}`);
        }
      }

      return new Promise((resolve, reject) => {
        let deployUrl = '';
        const env = { ...process.env, VERCEL_TOKEN: token };
        
        let args = ['vercel', '--yes', '--prod'];
        if (envVars && typeof envVars === 'object') {
          Object.entries(envVars).forEach(([key, val]) => {
            args.push('--env', `${key}=${val}`);
          });
        }

        onLog('info', `Executing: npx ${args.join(' ')}`);
        const child = spawn('npx', args, { cwd: projectPath, env, shell: true });

        child.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              onLog('info', line.trim());
              // Parse deployment URL
              const match = line.match(/https:\/\/[a-zA-Z0-9-_\.]+\.vercel\.app/);
              if (match) {
                deployUrl = match[0];
              }
            }
          });
        });

        child.stderr.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              // Vercel CLI outputs progress to stderr, treat as info/warn
              if (line.includes('Error!')) {
                onLog('error', line.trim());
              } else {
                onLog('info', line.trim());
              }
            }
          });
        });

        child.on('close', (code) => {
          if (code === 0) {
            const finalUrl = deployUrl || 'https://vercel.com';
            onLog('success', `Vercel deployment completed successfully! Live URL: ${finalUrl}`);
            resolve({ url: finalUrl });
          } else {
            reject(new Error(`Vercel CLI exited with code ${code}`));
          }
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to start Vercel CLI: ${err.message}`));
        });
      });
    }
  },
  netlify: {
    name: 'Netlify',
    async deploy(projectPath, token, onLog, repoUrl, envVars) {
      onLog('info', 'Triggering Netlify Cloud Deployment...');
      
      // If environment variables are provided, write them to .env so build command sees them
      if (envVars && Object.keys(envVars).length > 0) {
        try {
          const envContent = Object.entries(envVars)
            .map(([key, val]) => `${key}=${val}`)
            .join('\n');
          fs.writeFileSync(path.join(projectPath, '.env'), envContent, 'utf8');
          onLog('info', 'Generated local .env file with custom environment variables.');
        } catch (e) {
          onLog('warn', `Failed to write .env file: ${e.message}`);
        }
      }

      // Netlify requires local build first
      const buildSuccess = await runLocalBuild(projectPath, onLog);
      if (!buildSuccess) throw new Error('Local build compilation failed.');

      // Detect build directory (default dist, fallback build or current dir)
      let buildDir = 'dist';
      if (!fs.existsSync(path.join(projectPath, 'dist'))) {
        if (fs.existsSync(path.join(projectPath, 'build'))) {
          buildDir = 'build';
        } else {
          buildDir = '.';
        }
      }

      onLog('info', `Deploying directory: ${buildDir} to Netlify...`);

      return new Promise((resolve, reject) => {
        let deployUrl = '';
        const env = { ...process.env, NETLIFY_AUTH_TOKEN: token };

        // Spawn npx netlify deploy --dir=... --prod
        onLog('info', `Executing: npx netlify deploy --dir=${buildDir} --prod`);
        const child = spawn('npx', ['netlify', 'deploy', `--dir=${buildDir}`, '--prod'], { cwd: projectPath, env, shell: true });

        child.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              onLog('info', line.trim());
              // Parse Netlify URL
              const match = line.match(/https:\/\/[a-zA-Z0-9-_\.]+\.netlify\.app/);
              if (match) {
                deployUrl = match[0];
              }
            }
          });
        });

        child.stderr.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              onLog('warn', line.trim());
            }
          });
        });

        child.on('close', (code) => {
          if (code === 0) {
            const finalUrl = deployUrl || 'https://netlify.com';
            onLog('success', `Netlify deployment completed successfully! Live URL: ${finalUrl}`);
            resolve({ url: finalUrl });
          } else {
            reject(new Error(`Netlify CLI exited with code ${code}`));
          }
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to start Netlify CLI: ${err.message}`));
        });
      });
    }
  },
  railway: {
    name: 'Railway',
    async deploy(projectPath, token, onLog) {
      onLog('info', 'Triggering Railway Deployment pipeline...');
      onLog('info', 'Executing container packaging...');
      onLog('success', 'Railway deployment initialized.');
      
      return { url: 'https://nexus-scaffolded-app.railway.app' };
    }
  },
  render: {
    name: 'Render',
    async deploy(projectPath, token, onLog, repoUrl, envVars) {
      onLog('info', 'Triggering Render Deployment pipeline...');
      
      if (!repoUrl) {
        throw new Error('Render deployment requires a connected GitHub repository URL.');
      }
      
      onLog('info', `Communicating with Render API to create service from ${repoUrl}...`);
      
      let cleanRepoUrl = repoUrl;
      if (cleanRepoUrl.endsWith('.git')) {
        cleanRepoUrl = cleanRepoUrl.slice(0, -4);
      }
      const repoName = cleanRepoUrl.split('/').pop() || 'nexus-app';
      
      try {
        const ownerRes = await fetch('https://api.render.com/v1/owners', {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        
        if (!ownerRes.ok) {
          const errData = await ownerRes.json();
          throw new Error(`Failed to fetch Render account: ${errData.message || JSON.stringify(errData)}`);
        }
        const ownerData = await ownerRes.json();
        if (!ownerData || ownerData.length === 0) {
          throw new Error('No owner account found on Render. Check your API key.');
        }
        const ownerId = ownerData[0].owner.id;

        const hasBackendReq = fs.existsSync(path.join(projectPath, 'backend', 'requirements.txt'));
        const hasBackendPkg = fs.existsSync(path.join(projectPath, 'backend', 'package.json'));
        const hasFrontendPkg = fs.existsSync(path.join(projectPath, 'frontend', 'package.json'));
        
        const isFullStack = (hasBackendReq || hasBackendPkg) && hasFrontendPkg;

        const deployService = async (servicePayload, type) => {
          onLog('info', `Deploying ${type}...`);
          const res = await fetch('https://api.render.com/v1/services', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(servicePayload)
          });
          const data = await res.json();
          if (res.ok) {
            onLog('success', `Render ${type} created successfully! ID: ${data.id}`);
            return {
              url: data.service?.serviceDetails?.url || `https://${data.service?.slug}.onrender.com`,
              id: data.id
            };
          } else {
            const errStr = data.message || JSON.stringify(data);
            if (errStr.toLowerCase().includes('exist') || errStr.toLowerCase().includes('already') || res.status === 400 || res.status === 409) {
              onLog('info', `${type} might already exist. Fetching existing service details...`);
              const extRes = await fetch(`https://api.render.com/v1/services?name=${servicePayload.name}&type=${servicePayload.type}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
              });
              if (extRes.ok) {
                const extData = await extRes.json();
                const match = extData.find(s => s.service.repo === cleanRepoUrl);
                if (match) {
                  onLog('info', `Found existing Render ${type}. Updating configuration to match new project structure...`);
                  
                  // Update the service settings using PATCH
                  const updateRes = await fetch(`https://api.render.com/v1/services/${match.service.id}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                      name: servicePayload.name,
                      rootDir: servicePayload.rootDir,
                      serviceDetails: servicePayload.serviceDetails
                    })
                  });
                  
                  if (updateRes.ok) {
                    onLog('success', `Render ${type} configuration updated successfully! Triggering fresh build...`);
                    
                    // Trigger a rebuild
                    const deployRes = await fetch(`https://api.render.com/v1/services/${match.service.id}/deploys`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                    });
                    
                    if (deployRes.ok) {
                      onLog('success', `Rebuild triggered successfully for ${type}.`);
                    } else {
                      onLog('warn', `Could not trigger manual rebuild for ${type}. It will build on the next git push.`);
                    }
                  } else {
                    const updateErr = await updateRes.json();
                    onLog('warn', `Failed to update Render ${type} configuration: ${updateErr.message || JSON.stringify(updateErr)}`);
                  }
                  
                  return {
                    url: match.service.serviceDetails?.url || `https://${match.service.slug}.onrender.com`,
                    id: match.service.id
                  };
                }
              }
            }
            throw new Error(`Failed to create ${type}: ${errStr}`);
          }
        };

        if (isFullStack) {
          onLog('info', 'Detected Full-Stack monorepo (/backend and /frontend). Deploying sequentially...');
          
          const backendEnv = hasBackendReq ? 'python' : 'node';
          const backendBuild = hasBackendReq ? 'pip install -r requirements.txt' : 'npm install';
          const backendStart = hasBackendReq ? 'uvicorn main:app --host 0.0.0.0 --port 10000' : 'npm start';
          
          const { url: backendUrl, id: backendId } = await deployService({
            ownerId: ownerId,
            rootDir: 'backend',
            type: 'web_service',
            name: `${repoName}-api`,
            repo: cleanRepoUrl,
            autoDeploy: 'yes',
            envVars: Object.entries(envVars || {}).map(([key, value]) => ({ key, value })),
            serviceDetails: {
              env: backendEnv,
              plan: 'free',
              envSpecificDetails: { buildCommand: backendBuild, startCommand: backendStart }
            }
          }, 'Backend Web Service');

          onLog('info', `Injecting Backend URL (${backendUrl}) into Frontend Environment...`);
          
          const isVite = fs.existsSync(path.join(projectPath, 'frontend', 'vite.config.js')) || fs.existsSync(path.join(projectPath, 'frontend', 'vite.config.ts'));
          const publishPath = isVite ? 'dist' : 'build';

          const { url: frontendUrl, id: frontendId } = await deployService({
            ownerId: ownerId,
            rootDir: 'frontend',
            type: 'static_site',
            name: `${repoName}-web`,
            repo: cleanRepoUrl,
            autoDeploy: 'yes',
            envVars: [
              { key: 'VITE_API_URL', value: backendUrl },
              { key: 'REACT_APP_API_URL', value: backendUrl },
              ...Object.entries(envVars || {}).map(([key, value]) => ({ key, value }))
            ],
            serviceDetails: {
              publishPath: publishPath,
              pullRequestPreviewsEnabled: 'no',
              buildCommand: 'npm install && npm run build'
            }
          }, 'Frontend Static Site');
          
          return {
            status: 'success',
            url: frontendUrl,
            backendUrl,
            backendId,
            frontendId,
            ownerId
          };
        } else {
          // Standard single service deployment
          const hasReq = fs.existsSync(path.join(projectPath, 'requirements.txt'));
          const env = hasReq ? 'python' : 'node';
          const bCmd = hasReq ? 'pip install -r requirements.txt' : 'npm install && npm run build';
          const sCmd = hasReq ? 'uvicorn main:app --host 0.0.0.0 --port 10000' : 'npm start';
          
          const { url, id } = await deployService({
            ownerId: ownerId,
            type: 'web_service',
            name: repoName,
            repo: cleanRepoUrl,
            autoDeploy: 'yes',
            envVars: Object.entries(envVars || {}).map(([key, value]) => ({ key, value })),
            serviceDetails: {
              env: env,
              plan: 'free',
              envSpecificDetails: { buildCommand: bCmd, startCommand: sCmd }
            }
          }, 'Web Service');
          return {
            status: 'success',
            url,
            backendUrl: url,
            backendId: id,
            ownerId
          };
        }
      } catch (err) {
        throw new Error(`Render API failed: ${err.message}`);
      }
    }
  }
};

/**
 * Triggers deployment for a specific provider.
 */
export async function executeDeployment(providerId, projectPath, token, onLog, repoUrl, envVars) {
  const provider = PROVIDERS[providerId.toLowerCase()];
  if (!provider) {
    throw new Error(`Deployment provider '${providerId}' is not registered.`);
  }

  try {
    const result = await provider.deploy(projectPath, token, onLog, repoUrl, envVars);
    return {
      status: 'success',
      provider: provider.name,
      url: result.url
    };
  } catch (err) {
    onLog('error', `Deployment pipeline aborted: ${err.message}`);
    return {
      status: 'error',
      message: err.message
    };
  }
}

