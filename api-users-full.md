# Hướng dẫn tích hợp API: POST /api/users/full

Mục đích
- Tạo một người dùng mới (User) và gán toàn bộ thông tin hồ sơ (UserProfile) trong 1 lần gọi API.

Endpoint
- URL: `POST /api/users/full`
- Nội dung: JSON trong body
- Kết quả: trả về thông tin kết hợp `UserFullResponse` (user + profile)

Authentication
- Sử dụng Bearer token (Authorization: Bearer <token>) nếu API server yêu cầu xác thực. Trong code hiện tại, controller chưa bắt buộc @PreAuthorize trên endpoint này, nhưng môi trường thực tế thường sẽ cần quyền ADMIN/RECEPTIONIST.

Request body (CreateUserFullRequest)
- Các trường thường dùng (ví dụ):
  - username (string) - bắt buộc nên có
  - email (string) - bắt buộc nên có
  - password (string) - mật khẩu thô (server sẽ băm bằng BCrypt). Có thể để rỗng nếu tài khoản OAuth.
  - role (enum) - optional (mặc định là `CUSTOMER` nếu không cung cấp)
  - fullName, enabled, emailVerified, themePreference, languagePreference, notificationPreference, debt, serviceStatus, avatarUrl

- Thông tin profile (được gán vào `UserProfile`):
  - phone (string)
  - birthDate (string) - định dạng ISO `yyyy-MM-dd` (ví dụ: `1990-05-10`)
  - gender (string)
  - address (string)
  - emergencyContact (string)
  - sourceId (long) - id của bản ghi Source (nếu có)
  - sourceDetail (string)
  - branchId (long) - id của chi nhánh
  - nationalityId (long) - id của Nationality
  - occupationId (long) - id của Occupation
  - province, district, ward (string)
  - isReturning (boolean)
  - referrerId (long) - id của User referrer (nếu có)
  - customerGroupIds (array of long) - danh sách id nhóm khách hàng (nếu có)

Lưu ý về dữ liệu và hành vi
- Trường `role` là enum `UserRole` trong code; nếu không gửi role, controller sẽ dùng `UserRole.CUSTOMER` mặc định.
- `birthDate` phải là `yyyy-MM-dd`. Nếu không đúng định dạng server sẽ ném IllegalArgumentException (HTTP 400).
- Nếu `sourceId`, `branchId`, `nationalityId`, `occupationId`, `referrerId` hoặc `customerGroupIds` chứa id không tồn tại, hệ thống sẽ bỏ qua giá trị đó (không gán). Tức là chỉ các id hợp lệ mới được liên kết.
- Nếu `username` hoặc `email` đã tồn tại, `createUser` sẽ ném exception (tùy impl có thể trả về 400/409). Kiểm tra lỗi trả về để xử lý phù hợp.
- Sau khi tạo, server tự động tạo `UserProfile` và `UserPreferences` mặc định nếu chưa có.

Ví dụ request (JSON)
{
  "username": "nguyenvana",
  "email": "vana@example.com",
  "password": "SuperSecret123",
  "role": "CUSTOMER",
  "fullName": "Nguyen Van A",
  "enabled": true,
  "emailVerified": false,
  "avatarUrl": "https://example.com/avatars/ava.jpg",
  "phone": "0123456789",
  "birthDate": "1990-05-10",
  "gender": "male",
  "address": "123 Le Loi, HCMC",
  "emergencyContact": "0123450000",
  "sourceId": 3,
  "sourceDetail": "Facebook campaign",
  "branchId": 1,
  "nationalityId": 2,
  "occupationId": 4,
  "province": "Hồ Chí Minh",
  "district": "Quận 1",
  "ward": "Phường Bến Nghé",
  "isReturning": false,
  "referrerId": 10,
  "customerGroupIds": [2, 5]
}

Response
- HTTP 200 OK (ApiResponse wrapper) — trả về `UserFullResponse` (object):
  - id, username, email, role, provider, fullName, emailVerified, enabled, theme/language/notification, createdAt, updatedAt, debt, serviceStatus, avatarUrl
  - profile: `UserProfileResponse` với tất cả trường profile mở rộng (sourceId/sourceName, branchId/branchName, nationalityId, occupationId, province/district/ward, isReturning, referrerId/referrerName, customerGroupIds/customerGroupNames, ...)

Ví dụ response (rút gọn)
{
  "status": "OK",
  "message": "User created",
  "data": {
    "id": 123,
    "username": "nguyenvana",
    "email": "vana@example.com",
    "role": "CUSTOMER",
    "fullName": "Nguyen Van A",
    "enabled": true,
    "emailVerified": false,
    "avatarUrl": "https://example.com/avatars/ava.jpg",
    "profile": {
      "id": 456,
      "userId": 123,
      "phone": "0123456789",
      "birthDate": "1990-05-10",
      "gender": "male",
      "address": "123 Le Loi, HCMC",
      "sourceId": 3,
      "sourceName": "Facebook",
      "sourceDetail": "Facebook campaign",
      "branchId": 1,
      "branchName": "Main branch",
      "customerGroupIds": [2,5]
    }
  }
}

HTTP status & lỗi thường gặp
- 200 OK — tạo thành công.
- 400 Bad Request — dữ liệu không hợp lệ (ví dụ birthDate sai định dạng, payload thiếu trường bắt buộc tuỳ chính sách).
- 409 Conflict — username/email đã tồn tại (cách xử lý tùy impl; hiện impl ném IllegalArgumentException).
- 500 Internal Server Error — lỗi không mong muốn ở server.

Ví dụ curl (test nhanh)
curl -X POST "https://your-server.example.com/api/users/full" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "username": "nguyenvana",
    "email": "vana@example.com",
    "password": "SuperSecret123",
    "fullName": "Nguyen Van A",
    "phone": "0123456789",
    "birthDate": "1990-05-10"
  }'

Debug & kiểm tra
- Nếu nhận lỗi liên quan tới `sourceId`/`branchId`..., kiểm tra các bảng tương ứng (Source, Branch, Nationality, Occupation, CustomerGroup) để đảm bảo id đã tồn tại.
- Kiểm tra log của server để biết chi tiết exception (ví dụ: duplicate username/email, parse error...).

Gợi ý phát triển tiếp
- Bổ sung validation (JSR-303 annotations) trên `CreateUserFullRequest`.
- Thêm các test tích hợp (MockMvc + @SpringBootTest) cho endpoint này.
- Nếu endpoint cần quyền chỉ ADMIN/STAFF, thêm @PreAuthorize và cập nhật tài liệu để chỉ rõ quyền cần thiết.

File này được tạo tự động để hướng dẫn tích hợp endpoint `/api/users/full` trong project.

