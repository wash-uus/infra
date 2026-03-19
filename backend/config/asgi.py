"""
ASGI config for SRA.

Currently serving pure WSGI on Truehost cPanel (Passenger) — this file is not
active in production. It is preserved so WebSocket support can be re-enabled
with minimal effort when migrating to a ASGI-capable host (DigitalOcean, Render, etc.).

To re-enable:
  1. pip install daphne channels channels-redis
  2. Add 'daphne' and 'channels' back to INSTALLED_APPS (settings.py).
  3. Restore ASGI_APPLICATION = 'config.asgi.application' in settings.py.
  4. Un-stub consumers.py and routing.py.
  5. Configure CHANNEL_LAYERS in settings.py.
"""
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.asgi import get_asgi_application  # noqa: E402

application = get_asgi_application()

# --- WebSocket routing (re-enable when ready) ---
# from channels.auth import AuthMiddlewareStack
# from channels.routing import ProtocolTypeRouter, URLRouter
# from config.routing import websocket_urlpatterns
#
# application = ProtocolTypeRouter({
#     "http": get_asgi_application(),
#     "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
# })
