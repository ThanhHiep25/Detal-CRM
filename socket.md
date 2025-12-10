Socket integration guide (Realtime appointments)

Mục tiêu: hướng dẫn FE tích hợp realtime để cập nhật ngay khi có thay đổi lịch hẹn.

Checklist (những nội dung file này sẽ cover):
- Contract / event payload (dạng JSON) và topic names
- Cài đặt client (SockJS + STOMP) — cài đặt npm / CDN
- Ví dụ plain JavaScript (subscribe / disconnect)
- Ví dụ React hook (kèm initial fetch + reconcile/upsert)
- Chiến lược reconcile (duplicates, deletes, ordering)
- Timezone & hiển thị thời gian
- Reconnect / heartbeat / retry
- Bảo mật (JWT / cookies) và best-practices
- Hướng dẫn test end-to-end (notify-test + tạo appointment)

1) Contract / event payload

Topic names (backend hiện dùng):
- /topic/appointments/global  — global admin view
- /topic/appointments/dentist.{dentistId} — timeline cho một nha sĩ cụ thể

Event payload hiện tại (JSON):
- id: number
- dentistId: number | null
- scheduledTime: ISO-8601 instant (UTC) string, ví dụ "2025-11-05T09:00:00Z"
- endTime: ISO-8601 instant (UTC) string or null
- estimatedMinutes: integer
- status: string (PENDING | CONFIRMED | CANCELLED | COMPLETED)
- label: string (hiển thị ngắn)

Gợi ý: nếu được, mở rộng thêm fields:
- eventType: CREATED | UPDATED | DELETED
- updatedAt: ISO string
- minimal customerName (nếu privacy cho phép)

2) Cài đặt client

NPM (FE project):
```bash
npm install sockjs-client @stomp/stompjs
# hoặc yarn add sockjs-client @stomp/stompjs
```

Nếu không dùng bundler, bạn có thể load qua CDN (ví dụ unpkg).

3) Plain JavaScript example (kết nối, subscribe, disconnect)

```javascript
// Giả sử server STOMP endpoint: /ws
const socket = new SockJS('/ws');
const stompClient = Stomp.over(socket);
stompClient.debug = null; // tắt log nếu muốn

function connect(dentistId, onEvent) {
  stompClient.connect({}, frame => {
    console.log('Connected', frame);
    stompClient.subscribe('/topic/appointments/global', msg => onEvent(JSON.parse(msg.body)));
    if (dentistId) {
      stompClient.subscribe('/topic/appointments/dentist.' + dentistId, msg => onEvent(JSON.parse(msg.body)));
    }
  }, error => {
    console.error('STOMP connect error', error);
    // implement retry/backoff here if desired
  });
}

function disconnect() {
  if (stompClient && stompClient.connected) {
    stompClient.disconnect(() => console.log('Disconnected'));
  }
}
```

4) React hook mẫu (initial fetch + realtime + reconcile)

File: a hook ví dụ useAppointmentsRealtime.js

```javascript
import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// Helper convert ISO instant -> Date
const parseInstant = s => s ? new Date(s) : null;

function upsert(map, evt) {
  const id = evt.id;
  const appt = {
    id,
    dentistId: evt.dentistId,
    scheduledTime: parseInstant(evt.scheduledTime),
    endTime: parseInstant(evt.endTime),
    estimatedMinutes: evt.estimatedMinutes,
    status: evt.status,
    label: evt.label,
    _lastEventAt: new Date()
  };
  map.set(id, appt);
  return map;
}

export function useAppointmentsRealtime({ dentistId, date }) {
  const [appointments, setAppointments] = useState([]);
  const mapRef = useRef(new Map());
  const clientRef = useRef(null);

  // initial fetch for a day
  useEffect(() => {
    async function load() {
      const d = date || new Date().toISOString().slice(0,10);
      try {
        const res = await fetch(`/api/appointments/dentist/${dentistId}/day?date=${d}`);
        if (!res.ok) return;
        const json = await res.json();
        const m = new Map();
        for (const a of json.data || []) {
          m.set(a.id, {
            ...a,
            scheduledTime: a.scheduledTime ? new Date(a.scheduledTime) : null,
            endTime: a.endTime ? new Date(a.endTime) : null
          });
        }
        mapRef.current = m;
        setAppointments(Array.from(m.values()).sort((x,y)=> (x.scheduledTime||0) - (y.scheduledTime||0)));
      } catch (e) { console.error('fetch init', e); }
    }
    if (dentistId) load();
  }, [dentistId, date]);

  // realtime subscription
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000
    });

    client.onConnect = () => {
      client.subscribe('/topic/appointments/global', msg => {
        const ev = JSON.parse(msg.body);
        if (!ev.dentistId || ev.dentistId === dentistId) {
          const m = mapRef.current;
          upsert(m, ev);
          mapRef.current = m;
          setAppointments(Array.from(m.values()).sort((x,y)=> (x.scheduledTime||0) - (y.scheduledTime||0)));
        }
      });
      client.subscribe('/topic/appointments/dentist.' + dentistId, msg => {
        const ev = JSON.parse(msg.body);
        const m = mapRef.current;
        upsert(m, ev);
        mapRef.current = m;
        setAppointments(Array.from(m.values()).sort((x,y)=> (x.scheduledTime||0) - (y.scheduledTime||0)));
      });
    };

    client.activate();
    clientRef.current = client;

    return () => {
      try { client.deactivate(); } catch(e){}
    };
  }, [dentistId]);

  // optional: refresh single appointment from server if event is partial
  const refreshAppointment = async (id) => {
    try {
      const res = await fetch(`/api/appointments/${id}`); // implement endpoint if needed
      if (!res.ok) return;
      const a = await res.json();
      const m = mapRef.current;
      m.set(a.id, { ...a, scheduledTime: new Date(a.scheduledTime), endTime: new Date(a.endTime) });
      mapRef.current = m;
      setAppointments(Array.from(m.values()).sort((x,y)=> (x.scheduledTime||0) - (y.scheduledTime||0)));
    } catch(e) { console.error(e); }
  };

  return { appointments, refreshAppointment };
}
```

5) Chiến lược reconcile (một số rules thiết yếu)
- Key: luôn dùng id làm key duy nhất.
- Upsert: nhận event -> ghi đè/merge vào bản ghi hiện tại.
- Ordering: nếu event có field updatedAt thì bỏ qua events cũ hơn giá trị current.updatedAt.
- Deletes: nếu backend gửi eventType=DELETED, xóa khỏi map. Nếu backend không gửi, cân nhắc backend gửi DELETED event.
- Partial events: nếu event thiếu trường (ví dụ không có customerName), FE có thể gọi GET /api/appointments/{id} để lấy chi tiết.
- Missed events: khi reconnected, thực hiện refetch day schedule để đồng bộ (tùy policy: pull full day hoặc pull appointments changed since lastSeen).

6) Timezone & hiển thị
- Backend gửi Instant (UTC). FE parse bằng new Date(evt.scheduledTime) để convert vào timezone client.
- Khi render timeline, dùng thư viện date-fns / luxon / moment để format và tính toán.
- Nếu muốn hiển thị theo timezone clinic, backend nên gửi timezone hoặc client biết timezone clinic.

7) Reconnect / robustness
- Dùng client `reconnectDelay` để tự động reconnect.
- Khi reconnect thành công, refetch current day's schedule để phòng trường hợp missed events.
- Heartbeats (incoming/outgoing) giúp phát hiện broken connection.

8) Bảo mật
- Nếu dùng JWT: khi kết nối STOMP, pass header Authorization: 'Bearer <token>' trong connect().
  - Lưu ý: nếu dùng SockJS + STOMP, một số client libs cho phép truyền headers trong connect. Server cần cấu hình để đọc header và authenticate principal ở handshake (Spring Security WebSocket config).
- Nếu dùng cookie-based session, ensure same-site, secure flags set.
- Không gửi sensitive data trong event nếu không cần thiết.

9) Testing end-to-end
- Start backend (project của bạn). Ví dụ:
```bash
mvn -DskipTests spring-boot:run
```
- Mở một trang FE (dùng hook hoặc plain JS) và subscribe topics.
- Test notify-test endpoint (đã tạo trong backend):
```bash
curl -X POST http://localhost:8080/api/appointments/15/notify-test
```
- Kết quả mong đợi: FE console sẽ log event JSON.
- Test tạo appointment thường quy: gọi POST /api/appointments (payload theo CreateAppointmentDto). Sau khi server lưu sẽ publish event automatically; FE subscribe sẽ nhận.

10) Debugging tips
- Nếu FE không nhận message:
  - Kiểm tra console log của STOMP client (bật debug tạm thời).
  - Kiểm tra server logs để xem `AppointmentNotifier` đã gọi convertAndSend.
  - Kiểm tra topic bạn subscribe có đúng dentistId.
  - Kiểm tra cors / allowed origins cho WebSocket endpoint (/ws) nếu có lỗi kết nối.

11) Optional enhancements (backend & FE)
- Backend: thêm eventType và updatedAt trong AppointmentEvent.
- Backend: publish specific user/topic if you have per-user views (e.g. /user/queue/appointments)
- FE: implement delta-sync after reconnect (pull changed since last known timestamp)
- FE: show toast/notification khi có appointment mới hoặc được confirm/cancel

12) Ví dụ CSS nhỏ cho timeline items
```css
.timeline-item { border-left: 4px solid; padding: 8px; margin-bottom: 6px; }
.timeline-item.pending { border-color: #F0AD4E; background: #FFF8E6; }
.timeline-item.confirmed { border-color: #0D6EFD; background: #E9F2FF; }
.timeline-item.cancelled { border-color: #DC3545; background: #FFE9EA; }
.timeline-item.completed { border-color: #28A745; background: #E9FFEE; }
```

13) Tích hợp cụ thể: React (Vite) và Next.js

A. React (Vite) — admin app

- Cài đặt (trong project Vite):

```bash
npm install sockjs-client @stomp/stompjs
# hoặc
yarn add sockjs-client @stomp/stompjs
```

- Cấu hình env (Vite):
  - Tạo file `.env` hoặc `.env.local` với biến (ví dụ nếu backend khác host):

```
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_ENDPOINT=/ws
```

Vite sẽ expose biến prefix VITE_. Trong code bạn có thể dùng `import.meta.env.VITE_WS_ENDPOINT`.

- Ví dụ component dùng hook `useAppointmentsRealtime` (đặt hook ở `src/hooks/useAppointmentsRealtime.js`):

```jsx
import React from 'react';
import { useAppointmentsRealtime } from '../hooks/useAppointmentsRealtime';

export default function DentistTimeline({ dentistId }) {
  const { appointments, refreshAppointment } = useAppointmentsRealtime({ dentistId });

  return (
    <div>
      <h3>Schedule for dentist {dentistId}</h3>
      {appointments.map(a => (
        <div key={a.id} className={`timeline-item ${a.status?.toLowerCase()}`}>
          <div>{a.label}</div>
          <div>{a.scheduledTime ? new Date(a.scheduledTime).toLocaleString() : '—'}</div>
        </div>
      ))}
    </div>
  );
}
```

- Gửi Authorization header (JWT) khi connect (nếu cần):
  - Nếu dùng `@stomp/stompjs` Client + SockJS, bạn có thể set `connectHeaders`:

```javascript
const token = localStorage.getItem('token');
const client = new Client({
  webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_ENDPOINT || '/ws'),
  reconnectDelay: 5000,
  connectHeaders: { Authorization: token ? `Bearer ${token}` : '' },
});
```

- Dev proxy (Vite) — nếu backend chạy ở port khác và bạn muốn tránh CORS for SockJS:
  - `vite.config.js` (dev server) có thể cấu hình proxy cho API/WS. Ví dụ:

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    }
  }
});
```

Lưu ý: SockJS có thể dùng xhr-polling, vì vậy proxy cần support http và ws.

B. Next.js — khách hàng (client-only)

- Đặc thù Next.js:
  - Kết nối WebSocket và STOMP phải chạy ở client (browser). Không gọi STOMP trong SSR.
  - Sử dụng dynamic import với `{ ssr: false }` hoặc kiểm tra `typeof window !== 'undefined'` để chỉ khởi tạo ở client.

- Cài đặt:
```bash
npm install sockjs-client @stomp/stompjs
# hoặc yarn add sockjs-client @stomp/stompjs
```

- Ví dụ component Next.js (pages hoặc app) — file `components/DentistTimelineClient.js`:

```jsx
// components/DentistTimelineClient.js
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export default function DentistTimelineClient({ dentistId }) {
  const [appointments, setAppointments] = useState([]);
  const mapRef = useRef(new Map());
  const clientRef = useRef(null);

  useEffect(() => {
    // initial fetch
    (async () => {
      const res = await fetch(`/api/appointments/dentist/${dentistId}/day`);
      if (!res.ok) return;
      const json = await res.json();
      const m = new Map();
      for (const a of json.data || []) {
        m.set(a.id, { ...a, scheduledTime: a.scheduledTime ? new Date(a.scheduledTime) : null });
      }
      mapRef.current = m;
      setAppointments(Array.from(m.values()));
    })();

    // realtime
    const client = new Client({ webSocketFactory: () => new SockJS('/ws'), reconnectDelay: 5000 });
    client.onConnect = () => {
      client.subscribe('/topic/appointments/dentist.' + dentistId, msg => {
        const ev = JSON.parse(msg.body);
        const m = mapRef.current;
        m.set(ev.id, { ...ev, scheduledTime: ev.scheduledTime ? new Date(ev.scheduledTime) : null });
        mapRef.current = m;
        setAppointments(Array.from(m.values()).sort((x,y)=> (x.scheduledTime||0)-(y.scheduledTime||0)));
      });
    };
    client.activate();
    clientRef.current = client;

    return () => { try { client.deactivate(); } catch(e){} };
  }, [dentistId]);

  if (typeof window === 'undefined') return null; // no SSR

  return (
    <div>
      {appointments.map(a => <div key={a.id}>{a.label} — {a.scheduledTime?.toLocaleString()}</div>)}
    </div>
  );
}
```

- Import vào page bằng dynamic để tắt SSR:
```jsx
import dynamic from 'next/dynamic';
const DentistTimelineClient = dynamic(() => import('../components/DentistTimelineClient'), { ssr: false });

export default function Page({ dentistId }) {
  return <DentistTimelineClient dentistId={dentistId} />;
}
```

C. Lưu ý chung cho cả hai stack
- Không khởi tạo STOMP trên server (SSR) — luôn client-only.
- Nếu dùng auth: gửi token trong connect headers như ví dụ React. Với Next.js bạn lấy token từ cookie hoặc localStorage (client-side).
- Nếu FE và BE khác origin, cấu hình CORS/WebSocket allowed origins ở backend hoặc proxy dev.

14) Kết luận
- Tôi đã thêm hướng dẫn dành riêng cho `React (Vite)` và `Next.js` vào `socket.md`, bao gồm ví dụ component, hook, env vars, proxy dev, và cách gửi Authorization header.
- Nếu bạn muốn tôi: (A) tạo file demo static `realtime-demo.html` trong `src/main/resources/static/` để kiểm thử nhanh, hoặc (B) thêm ví dụ cấu hình server-side (Spring Security WebSocket handshake) để chấp nhận `Authorization` header — chọn 1 tùy bạn.
