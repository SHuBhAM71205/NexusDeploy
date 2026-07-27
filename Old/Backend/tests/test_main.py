from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_get_data():
    response = client.get("/api/data")
    assert response.status_code == 200
    assert "metrics" in response.json()

def test_trigger_error():
    response = client.get("/api/error")
    assert response.status_code == 500

def test_get_providers():
    response = client.get("/api/providers")
    assert response.status_code == 200
    providers = response.json()
    assert "github" in providers
    assert "vercel" in providers
    assert "aws" in providers
    assert providers["github"]["authType"] == "oauth"
    assert providers["aws"]["authType"] == "credentials"

def test_automate_endpoint():
    payload = {
        "projectName": "test-project",
        "intent": "Deploy a React App",
        "platform": "vercel",
        "repository": "github",
        "monitoring": "prometheus",
        "cicd": "github",
        "notifications": "discord",
        "credentials": {
            "github": "ghp_mocktoken123",
            "vercel": "vcl_mocktoken456"
        }
    }
    response = client.post("/api/automate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "logs" in data
    assert len(data["logs"]) > 0
    assert "github_url" in data

