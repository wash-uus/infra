"""
Phusion Passenger WSGI entry point for Truehost cPanel deployment.
cPanel → Python App → App startup file = passenger_wsgi.py
"""
import os
import sys

try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass

try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass

# Make sure the backend directory is on the path so Django can find config/
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
