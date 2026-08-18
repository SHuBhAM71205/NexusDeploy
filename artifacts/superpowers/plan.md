# Real Cloud Deployment & Token Authentication Implementation Plan

Replace mock static deployments with real platform authentication (Vercel, Netlify, Render, Railway, GitHub) and live deployment execution of user folders and repositories via the host Agent.

## Goal
1. Prompt users for platform API tokens (Vercel, Netlify, Render, Railway, GitHub) when credentials are missing before deployment.
2. Deploy actual user local folders or repositories to cloud platforms using real CLI/API executions in the host Agent.
3. Stream real live CLI/API logs via WebSockets and display actual live deployment URLs and statuses across the UI instead of mock data ("Jane Doe", static logs).

## Assumptions
- The Host Agent runs on `http://localhost:3030` and has access to Node.js CLI tools (`npx vercel`, `npx netlify`, Render API, `npx railway`).
- Tokens are stored locally in the Agent's secure keychain (`agent/services/keychain.js`).
- The user provides valid API tokens for their target deployment platforms.

## Plan

### Step 1: Add Platform Token Prompt Modal & Credential Pre-flight Check
- **Files**:
  - `d:/sem7project1trial1/frontenduseful/src/components/ui/TokenPromptModal.tsx`
  - `d:/sem7project1trial1/frontenduseful/src/components/ui/NewProjectModal.tsx`
  - `d:/sem7project1trial1/frontenduseful/src/pages/ProjectsPage.tsx`
- **Change**:
  - Create `TokenPromptModal.tsx` to prompt user for missing platform API tokens (Vercel Personal Access Token, Netlify Access Token, Render API Key, Railway Token, GitHub PAT).
  - Add pre-flight credential verification in `NewProjectModal` and `ProjectsPage`. Before starting deployment, call `agentApi.getCredentialStatus(provider)`. If missing, open `TokenPromptModal`, prompt user to enter token, and save via `agentApi.saveCredential(provider, token)`.
- **Verify**:
  - Verify `TokenPromptModal` renders correctly when selecting a platform without saved credentials.

### Step 2: Implement Real Host Agent Execution for Railway & Cloud CLI Deployers
- **Files**:
  - `d:/sem7project1trial1/agent/services/deployer.js`
- **Change**:
  - Update `deployer.js` to implement native Railway deployment via CLI (`npx railway up`) or API using the saved Railway token.
  - Ensure Vercel, Netlify, Render, and Railway deployers accept user folder path, repository URL, and environment variables, returning real live production URLs and streaming stdout/stderr to WebSocket subscribers.
- **Verify**:
  - Restart host agent (`npm start` in `agent/`) and verify deployer modules load without errors.

### Step 3: Wire Project Creation & Deployment Actions directly to Host Agent (`agentApi.deploy`)
- **Files**:
  - `d:/sem7project1trial1/frontenduseful/src/services/api.ts`
  - `d:/sem7project1trial1/frontenduseful/src/components/ui/TriggerDeployModal.tsx`
  - `d:/sem7project1trial1/frontenduseful/src/pages/ProjectsPage.tsx`
- **Change**:
  - Update project creation and trigger deployment actions to call `agentApi.deploy(...)` with actual target folder path (`root_directory`), platform, repo URL, and custom environment variables.
  - Fetch live active projects from `agentApi.getProjects()` instead of mock arrays in `api.ts`.
- **Verify**:
  - Trigger project deployment and verify network request hits `http://localhost:3030/api/agent/deploy`.

### Step 4: Stream Live Real-Time Logs & Display Real Deployment Data in Dashboard
- **Files**:
  - `d:/sem7project1trial1/frontenduseful/src/pages/DeploymentsPage.tsx`
  - `d:/sem7project1trial1/frontenduseful/src/features/dashboard/DashboardPage.tsx`
  - `d:/sem7project1trial1/agent/index.js`
- **Change**:
  - Connect `DeploymentsPage.tsx` to WebSocket stream (`agentApi.connectLogStream`) to display live build/deployment stdout in real time.
  - Replace hardcoded mock deployment logs and mock author ("Jane Doe") with live deployment records and actual live deployment URLs (`https://<app>.vercel.app`, `https://<app>.netlify.app`, `https://<app>.onrender.com`, `https://<app>.up.railway.app`).
- **Verify**:
  - Run `npm run build` in `d:/sem7project1trial1/frontenduseful` to confirm clean compilation with 0 TypeScript/ESLint errors.

## Risks & mitigations
- **Risk**: CLI tools (`vercel`, `netlify`, `railway`) may not be pre-installed on user machine.
- **Mitigation**: Deployer executes commands via `npx`, which automatically downloads and runs CLI binaries on-demand.
- **Risk**: User provides invalid or expired token.
- **Mitigation**: Deployer catches CLI/API authentication errors, broadcasts readable error messages to live WebSocket log stream, and prompts user to re-enter token.

## Rollback plan
- Revert edits to `frontenduseful/src` and `agent/services/deployer.js` using git checkout or restoring previous file state.
