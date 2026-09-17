# Liên Hoa CRM

CRM nội bộ cho Liên Hoa Global Education.

## Luồng nghiệp vụ

Facebook Page → Inbox/Lead → Tự động chia Sale → Sale chăm sóc → Follow-up → Chốt đơn → Thu học phí → KPI → Báo cáo Ban giám đốc.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Node.js / Express API
- PostgreSQL
- Meta Graph API + Webhook

## Cấu trúc

```text
frontend/   giao diện CRM
backend/    API và nghiệp vụ
 database/  schema, migration, seed
 docs/       tài liệu kiến trúc
```

## Trạng thái

Bản đầu tiên tập trung vào CRM Lead/Sale và có sẵn vị trí để kết nối Facebook/Meta sau khi cấu hình Meta App và webhook.
