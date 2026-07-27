PROVIDERS = {
    "github": {
        "name": "GitHub",
        "authType": "oauth",
        "capabilities": ["deploy", "logs", "rollback", "env", "ci_cd"],
        "fields": [],
        "capabilityProfile": {
            "Deploy": "❌",
            "Logs": "Actions",
            "Rollback": "Workflow rerun",
            "Env Vars": "Secrets",
            "Metrics": "CI metrics",
            "Domains": "❌"
        }
    },
    "vercel": {
        "name": "Vercel",
        "authType": "oauth",
        "capabilities": ["deploy", "logs", "rollback", "env", "domains"],
        "fields": [],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "✅",
            "Env Vars": "✅",
            "Metrics": "Basic",
            "Domains": "✅"
        }
    },
    "netlify": {
        "name": "Netlify",
        "authType": "oauth",
        "capabilities": ["deploy", "logs", "rollback", "env", "domains"],
        "fields": [],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "✅",
            "Env Vars": "✅",
            "Metrics": "Basic",
            "Domains": "✅"
        }
    },
    "render": {
        "name": "Render",
        "authType": "apikey",
        "capabilities": ["deploy", "logs", "services", "env", "domains"],
        "fields": [
            {"name": "apiKey", "label": "Render API Key", "type": "password", "placeholder": "rnd_xxxxxxxxxxxxxxxxxxxx"}
        ],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "Limited",
            "Env Vars": "✅",
            "Metrics": "Limited",
            "Domains": "✅"
        }
    },
    "railway": {
        "name": "Railway",
        "authType": "apikey",
        "capabilities": ["deploy", "logs", "env", "domains"],
        "fields": [
            {"name": "apiKey", "label": "Railway API Key", "type": "password", "placeholder": "raw_xxxxxxxxxxxxxxxxxxxx"}
        ],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "Depends",
            "Env Vars": "✅",
            "Metrics": "Basic",
            "Domains": "✅"
        }
    },
    "aws": {
        "name": "AWS",
        "authType": "credentials",
        "capabilities": ["deploy", "logs", "infrastructure", "rollback", "env", "metrics", "domains"],
        "fields": [
            {"name": "accessKeyId", "label": "Access Key ID", "type": "text", "placeholder": "AKIAXXXXXXXXXXXXXXXX"},
            {"name": "secretAccessKey", "label": "Secret Access Key", "type": "password", "placeholder": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"},
            {"name": "region", "label": "AWS Region", "type": "text", "placeholder": "us-east-1"}
        ],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "✅",
            "Env Vars": "✅",
            "Metrics": "CloudWatch",
            "Domains": "Route53"
        }
    },
    "azure": {
        "name": "Azure",
        "authType": "credentials",
        "capabilities": ["deploy", "logs", "infrastructure", "rollback", "env", "metrics", "domains"],
        "fields": [
            {"name": "tenantId", "label": "Tenant ID", "type": "text", "placeholder": "00000000-0000-0000-0000-000000000000"},
            {"name": "clientId", "label": "Client ID", "type": "text", "placeholder": "00000000-0000-0000-0000-000000000000"},
            {"name": "clientSecret", "label": "Client Secret", "type": "password", "placeholder": "ClientSecretValue..."}
        ],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "✅",
            "Env Vars": "✅",
            "Metrics": "Monitor",
            "Domains": "DNS Zones"
        }
    },
    "gcp": {
        "name": "GCP",
        "authType": "credentials",
        "capabilities": ["deploy", "logs", "infrastructure", "rollback", "env", "metrics", "domains"],
        "fields": [
            {"name": "projectId", "label": "GCP Project ID", "type": "text", "placeholder": "my-gcp-project"},
            {"name": "credentialsJson", "label": "Service Account JSON", "type": "textarea", "placeholder": "{ \"type\": \"service_account\", ... }"}
        ],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "✅",
            "Env Vars": "✅",
            "Metrics": "Operations",
            "Domains": "Cloud DNS"
        }
    },
    "docker": {
        "name": "Docker Host",
        "authType": "credentials",
        "capabilities": ["deploy", "logs", "containers"],
        "fields": [
            {"name": "hostUrl", "label": "Docker Host URL", "type": "text", "placeholder": "tcp://127.0.0.1:2375"}
        ],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "❌",
            "Env Vars": "✅",
            "Metrics": "Stats",
            "Domains": "❌"
        }
    },
    "kubernetes": {
        "name": "Kubernetes",
        "authType": "kubeconfig",
        "capabilities": ["deploy", "logs", "rollback", "pods"],
        "fields": [
            {"name": "kubeconfig", "label": "Kubeconfig YAML Content", "type": "textarea", "placeholder": "apiVersion: v1\nkind: Config..."}
        ],
        "capabilityProfile": {
            "Deploy": "✅",
            "Logs": "✅",
            "Rollback": "✅",
            "Env Vars": "ConfigMaps/Secrets",
            "Metrics": "Metrics Server",
            "Domains": "Ingress"
        }
    },
    "prometheus": {
        "name": "Prometheus + Grafana",
        "authType": "credentials",
        "capabilities": ["metrics", "alerts"],
        "fields": [
            {"name": "prometheusUrl", "label": "Prometheus URL", "type": "text", "placeholder": "http://localhost:9090"},
            {"name": "grafanaUrl", "label": "Grafana URL", "type": "text", "placeholder": "http://localhost:3000"}
        ],
        "capabilityProfile": {
            "Deploy": "❌",
            "Logs": "❌",
            "Rollback": "❌",
            "Env Vars": "❌",
            "Metrics": "✅",
            "Domains": "❌"
        }
    },
    "discord": {
        "name": "Discord Webhook",
        "authType": "apikey",
        "capabilities": ["notifications"],
        "fields": [
            {"name": "webhookUrl", "label": "Discord Webhook URL", "type": "text", "placeholder": "https://discord.com/api/webhooks/..."}
        ],
        "capabilityProfile": {
            "Deploy": "❌",
            "Logs": "❌",
            "Rollback": "❌",
            "Env Vars": "❌",
            "Metrics": "❌",
            "Domains": "❌"
        }
    }
}
