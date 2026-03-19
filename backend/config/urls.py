import os

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Spirit Revival Africa"
admin.site.site_title = "SRA Admin"
admin.site.index_title = "Welcome to the Spirit Revival Africa Admin Portal"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/common/", include("apps.common.urls")),
    # Hero collage — unified endpoint + photo management
    path("api/", include("apps.content.photo_urls")),
    # General content (sermons, books, etc.)
    path("api/content/", include("apps.content.urls")),
    path("api/groups/", include("apps.groups.urls")),
    path("api/messaging/", include("apps.messaging.urls")),
    path("api/prayer/", include("apps.prayer.urls")),
    path("api/discipleship/", include("apps.discipleship.urls")),
    path("api/hubs/", include("apps.hubs.urls")),
    path("api/worship/", include("apps.worship.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
elif os.getenv("MEDIA_STORAGE", "local") == "local":
    # Serve uploaded media via Django on Truehost (local filesystem storage).
    # For high-traffic deployments switch MEDIA_STORAGE to cloudinary or s3.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
