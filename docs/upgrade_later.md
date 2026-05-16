# Later Upgrade List

1. Add CAPTCHA to `POST /v1/public/leads` after basic rate limiting is in place.
2. Add full staff-management screens and permission controls beyond the initial `OWNER` and `STAFF` roles.
3. Add E2E tests for lead flow, car CRUD, image upload, and deal creation.
4. Add audit logs for sensitive admin actions.
5. Add error tracking and structured application logs.
6. Define a clear API versioning policy for future breaking changes in `/v2`.
7. Move car image storage from local filesystem to S3, Cloudinary, or another object storage provider.
8. Add notification integrations such as WhatsApp, email, or push notifications.
9. Add public SEO web pages if the showroom needs search-engine discovery.
