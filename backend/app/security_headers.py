"""
Security headers middleware for FastAPI
Adds comprehensive security headers to all responses
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from .config import is_production


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all HTTP responses.

    Headers added:
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Prevents clickjacking attacks
    - X-XSS-Protection: Enables browser XSS protection
    - Strict-Transport-Security (HSTS): Enforces HTTPS (production only)
    - Content-Security-Policy (CSP): Controls resource loading
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Controls browser feature access
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking by disallowing framing
        response.headers["X-Frame-Options"] = "DENY"

        # Enable browser XSS protection (legacy, but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Enforce HTTPS in production (HSTS)
        if is_production():
            # max-age=31536000 (1 year), includeSubDomains, preload
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Content Security Policy
        # Security hardened CSP with minimal unsafe directives
        # Note: 'unsafe-inline' for styles is required for React/styled-components
        # 'unsafe-eval' removed - not needed for production React builds
        if is_production():
            csp_directives = [
                "default-src 'self'",
                "script-src 'self'",  # Production: no unsafe-inline or unsafe-eval
                "style-src 'self' 'unsafe-inline'",  # Required for styled-components/inline styles
                "img-src 'self' data: https:",
                "font-src 'self' data: https:",
                "connect-src 'self'",
                "frame-ancestors 'none'",  # Prevent clickjacking
                "base-uri 'self'",
                "form-action 'self'",
                "upgrade-insecure-requests",  # Auto-upgrade HTTP to HTTPS
                "block-all-mixed-content",  # Block HTTP content on HTTPS pages
            ]
        else:
            # Development: Allow eval for hot reload and dev tools
            csp_directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # Dev tools need eval
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self' data: https:",
                "connect-src 'self' ws: wss:",  # WebSocket for hot reload
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
            ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy (formerly Feature-Policy)
        # Disable potentially dangerous browser features
        permissions_policy_directives = [
            "geolocation=()",
            "microphone=()",
            "camera=()",
            "payment=()",
            "usb=()",
            "magnetometer=()",
            "gyroscope=()",
            "accelerometer=()",
        ]
        response.headers["Permissions-Policy"] = ", ".join(permissions_policy_directives)

        return response
