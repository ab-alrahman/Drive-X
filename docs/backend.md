
## 11. أمور ناقصة أو تحتاج توضيح من الباكند خارج openapi.yaml

هذا القسم هو checklist للأمور التي لا يغطيها `openapi.yaml` بشكل كامل، أو التي تحتاج قرار تنفيذي واضح من فريق الباكند قبل الربط مع لوحة التحكم والتطبيق.

### 11.1 Seed Admin User

المطلوب:

1. طريقة إنشاء أول حساب admin.
2. تحديد بيانات seed الأولي:
   - `email`
   - `password`
   - `fullName`
   - `role`: `OWNER`
3. تحديد هل يتم seed عبر script أم migration أم command منفصل.

### 11.2 Environment Variables

المطلوب توثيق هذه المتغيرات في backend:

```text
DATABASE_URL
PORT
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
ACCESS_TOKEN_TTL
REFRESH_TOKEN_TTL
UPLOAD_DIR
PUBLIC_BASE_URL
ADMIN_WEB_ORIGIN
```

### 11.3 JWT Policy

المطلوب تحديد:

1. مدة access token.
2. مدة refresh token.
3. هل refresh token يعمل rotation عند التجديد؟
4. هل يتم تخزين refresh token كـ hash في قاعدة البيانات؟
5. هل يتم revoke لكل refresh tokens عند تغيير كلمة المرور مستقبلا؟

### 11.4 Image Upload Rules

المطلوب تحديد:

1. الحد الأقصى لحجم الصورة.
2. الأنواع المسموحة:
   - `jpg`
   - `jpeg`
   - `png`
   - `webp`
3. هل يتم ضغط الصور؟
4. هل يتم إنشاء thumbnails؟
5. هل يمكن تعيين صورة `primary`؟
6. هل يمكن إعادة ترتيب الصور؟
7. هل حذف الصورة يحذف الملف من التخزين أم فقط السجل؟

### 11.5 Rate Limit Policy

المطلوب تحديد rate limit لهذه المسارات:

```text
POST /v1/public/leads
POST /v1/admin/auth/login
```

القرارات المطلوبة:

1. عدد الطلبات المسموح لكل IP.
2. مدة النافذة الزمنية.
3. هل يتم التقييد حسب phone أو email أيضا للـ leads؟
4. شكل رسالة الخطأ عند `429`.

### 11.6 CORS Policy

المطلوب تحديد:

1. origins المسموحة للوحة التحكم.
2. طريقة التعامل مع React Native app.
3. allowed methods.
4. allowed headers.
5. هل credentials مطلوبة أم لا.

### 11.7 Admin Permissions

المطلوب توضيح صلاحيات `OWNER` و `STAFF`.

أسئلة يجب حسمها:

1. هل `STAFF` يستطيع إضافة سيارة؟
2. هل `STAFF` يستطيع تعديل سيارة؟
3. هل `STAFF` يستطيع حذف سيارة؟
4. هل `STAFF` يستطيع رفع وحذف الصور؟
5. هل `STAFF` يستطيع تغيير lead status؟
6. هل `STAFF` يستطيع إنشاء deal؟
7. هل staff management مؤجل أم مطلوب في MVP؟

### 11.8 Rental Status Policy

المطلوب تحديد سياسة حالة السيارة عند صفقة الإيجار.

أسئلة:

1. عند إنشاء deal نوعه `RENT`، هل تصبح السيارة `RENTED`؟
2. هل تبقى السيارة `AVAILABLE` إذا كان الإيجار لفترة مستقبلية؟
3. كيف ترجع السيارة إلى `AVAILABLE` بعد انتهاء الإيجار؟
4. هل الرجوع يكون يدوي من admin أم تلقائي عبر job لاحقا؟

### 11.9 Deal Side Effects

المطلوب تحديد التأثيرات التلقائية عند إنشاء deal.

عند deal نوعه `SALE`:

1. هل تتحول السيارة تلقائيا إلى `SOLD`؟
2. هل يتحول lead تلقائيا إلى `CLOSED`؟

عند deal نوعه `RENT`:

1. هل تتحول السيارة إلى `RENTED`؟
2. هل يتحول lead إلى `CLOSED`؟
3. هل نحتاج حفظ فترة الإيجار داخل deal أم يكفي وجودها في lead؟

### 11.10 Validation Details

المطلوب تحديد:

1. صيغة رقم الهاتف المقبولة.
2. هل email مطلوب أم اختياري للـ lead؟
3. هل city مطلوب؟
4. هل `deliveryAddress` مطلوب فقط عند `requestDelivery=true`؟
5. هل `rentalEndDate` مطلوب مع `rentalStartDate`؟
6. هل يسمح بتاريخ إيجار في الماضي؟
7. هل year له حد أدنى وأعلى مطابق للـ schema؟

### 11.11 Error Codes List

المطلوب توحيد error codes مثل:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
UPLOAD_ERROR
INTERNAL_SERVER_ERROR
```

### 11.12 Pagination Defaults

المطلوب تحديد:

```text
default page = 1
default limit = 20
max limit = 100
```

ويجب تطبيق ذلك على:

1. cars list.
2. leads list.
3. deals list.

### 11.13 Sorting Options

المطلوب دعم sorting واضح.

للسيارات:

```text
newest
priceAsc
priceDesc
yearDesc
```

للطلبات:

```text
newest
oldest
```

للصفقات:

```text
newest
oldest
```

### 11.14 Dashboard Summary Additions

`openapi.yaml` يغطي dashboard summary الأساسي، لكن لوحة تحكم أقوى ستستفيد من إضافات اختيارية:

1. `recentLeads`
2. `recentCars`
3. `leadsByStatus`
4. `dealsThisMonth`
5. `commissionByMonth`

هذه ليست ضرورية لأول MVP، لكنها مفيدة لتقليل عدد requests في صفحة Overview.

### 11.15 Audit Fields and Logs

المطلوب تحديد:

1. هل نكتفي بـ `updated_by` في MVP؟
2. هل نحتاج audit log table لاحقا؟
3. ما الأحداث التي يجب تسجيلها؟
   - car created
   - car updated
   - car deleted
   - lead status changed
   - deal created
   - admin login/logout

### 11.16 Upload Public URL

المطلوب تحديد طريقة بناء رابط الصورة العام.

مثال:

```text
PUBLIC_BASE_URL/uploads/cars/{carId}/{fileName}
```

ويجب أن يرجع الباكند `image_url` جاهز للاستخدام من:

1. React Native app.
2. Admin dashboard.
3. Visitor web pages إن وجدت لاحقا.
