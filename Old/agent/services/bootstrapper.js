import fs from 'fs';
import path from 'path';

const DOCKERFILE_TEMPLATE = `# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

const DOCKER_COMPOSE_TEMPLATE = `version: '3.8'

services:
  web:
    build: .
    ports:
      - "8080:80"
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"

  prometheus:
    image: prom/prometheus:v2.52.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
`;

const PROMETHEUS_TEMPLATE = `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  - job_name: 'web-service'
    static_configs:
      - targets: ['web:80']
`;

const CICD_TEMPLATE = `name: Scaffolder CI/CD Workflow

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run Build
        run: npm run build --if-present
`;

const K8S_DEPLOYMENT_TEMPLATE = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {app_name}-deployment
  labels:
    app: {app_name}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: {app_name}
  template:
    metadata:
      labels:
        app: {app_name}
    spec:
      containers:
      - name: {app_name}
        image: {app_name}:latest
        ports:
        - containerPort: 80
`;

const K8S_SERVICE_TEMPLATE = `apiVersion: v1
kind: Service
metadata:
  name: {app_name}-service
spec:
  selector:
    app: {app_name}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
`;

export function bootstrapProject(folderPath, stack, docker, k8s, cicd) {
  try {
    const targetDir = path.resolve(folderPath).replace(/\\/g, '/');
    const appName = path.basename(targetDir.replace(/\/$/, '')) || 'nexus-app';

    fs.mkdirSync(targetDir, { recursive: true });
    const results = [];

    if (docker) {
      // Write Dockerfile
      const dockerfilePath = path.join(targetDir, 'Dockerfile');
      fs.writeFileSync(dockerfilePath, DOCKERFILE_TEMPLATE);
      results.push('Dockerfile');

      // Write docker-compose.yml
      const composePath = path.join(targetDir, 'docker-compose.yml');
      fs.writeFileSync(composePath, DOCKER_COMPOSE_TEMPLATE);
      results.push('docker-compose.yml');

      // Write prometheus.yml under monitoring/
      const monDir = path.join(targetDir, 'monitoring');
      fs.mkdirSync(monDir, { recursive: true });
      const promPath = path.join(monDir, 'prometheus.yml');
      fs.writeFileSync(promPath, PROMETHEUS_TEMPLATE);
      results.push('monitoring/prometheus.yml');
    }

    if (cicd) {
      // Write GitHub Workflow
      const workflowDir = path.join(targetDir, '.github', 'workflows');
      fs.mkdirSync(workflowDir, { recursive: true });
      const workflowPath = path.join(workflowDir, 'ci-cd.yml');
      fs.writeFileSync(workflowPath, CICD_TEMPLATE);
      results.push('.github/workflows/ci-cd.yml');
    }

    if (k8s) {
      // Write Kubernetes manifests
      const k8sDir = path.join(targetDir, 'k8s');
      fs.mkdirSync(k8sDir, { recursive: true });

      const deployPath = path.join(k8sDir, 'deployment.yml');
      fs.writeFileSync(deployPath, K8S_DEPLOYMENT_TEMPLATE.replace(/{app_name}/g, appName));
      results.push('k8s/deployment.yml');

      const servicePath = path.join(k8sDir, 'service.yml');
      fs.writeFileSync(servicePath, K8S_SERVICE_TEMPLATE.replace(/{app_name}/g, appName));
      results.push('k8s/service.yml');
    }

    return {
      status: 'success',
      message: `Successfully bootstrapped project at ${targetDir}`,
      files: results,
      resolved_path: targetDir
    };
  } catch (err) {
    return {
      status: 'error',
      message: `Failed to bootstrap project: ${err.message}`
    };
  }
}
