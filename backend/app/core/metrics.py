"""Prometheus metrics configuration for NexusDeploy."""
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator


# Deployment lifecycle metrics
deployments_started_total = Counter(
    "nexusdeploy_deployments_started_total",
    "Total number of deployments started",
    ["provider"]
)

deployments_success_total = Counter(
    "nexusdeploy_deployments_success_total",
    "Total number of successful deployments",
    ["provider"]
)

deployments_failed_total = Counter(
    "nexusdeploy_deployments_failed_total",
    "Total number of failed deployments",
    ["provider"]
)

deployment_duration_seconds = Histogram(
    "nexusdeploy_deployment_duration_seconds",
    "Deployment duration in seconds",
    ["provider", "status"],
    buckets=[30, 60, 120, 300, 600, 1800, 3600]  # 30s to 1h
)


def instrument_app(app):
    """Instrument FastAPI app with Prometheus metrics."""
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_group_untemplated=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="fastapi_inprogress",
        inprogress_labels=True,
    )
    
    instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    return instrumentator
