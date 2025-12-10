import { useEffect, useRef, useState } from 'react';
import type { AppointmentItem } from '@/services/appointments';
import { AppointmentAPI } from '@/services/appointments';
// Runtime websocket client + stomp. These are runtime deps; install if missing:
// npm install sockjs-client @stomp/stompjs
import SockJS from 'sockjs-client';
import { Client, Message } from '@stomp/stompjs';
import type { StompHeaders } from '@stomp/stompjs';

export function useAppointmentsRealtime(options?: { dentistId?: number | null; date?: string; wsEndpoint?: string; token?: string }) {
  const { dentistId = null, date = null, wsEndpoint, token } = options || {};
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [connected, setConnected] = useState(false);
  const mapRef = useRef<Map<number, AppointmentItem>>(new Map());
  const clientRef = useRef<Client | null>(null);

  // helper to upsert an appointment object into the map and update state
  const upsert = (evt: unknown) => {
    if (!evt || typeof evt !== 'object') return;
    const rec = evt as Record<string, unknown>;
    const idVal = rec.id ?? rec['appointmentId'];
    if (idVal == null) return;
    const id = Number(idVal);
    // Try to normalize to AppointmentItem shape as best-effort
    // helpers to safely extract nested .name fields
    const extractName = (v: unknown): string | undefined => {
      if (v && typeof v === 'object' && 'name' in (v as Record<string, unknown>)) return String((v as Record<string, unknown>).name);
      return undefined;
    };

    const a: AppointmentItem = {
      id,
      label: (rec['label'] as string) ?? (rec['title'] as string) ?? String(id),
      customerId: (rec['customerId'] ?? rec['customer_id']) as number | undefined,
      customerUsername: (rec['customerUsername'] as string) ?? undefined,
      customerEmail: (rec['customerEmail'] ?? rec['customer_email']) as string | undefined,
  customerName: (rec['customerName'] as string) ?? extractName(rec['customer']) ?? null,
      serviceId: (rec['serviceId'] ?? rec['service_id']) as number | undefined,
  serviceName: (rec['serviceName'] as string) ?? extractName(rec['service']) ?? undefined,
      serviceDuration: (rec['estimatedMinutes'] ?? rec['serviceDuration']) as number | null,
      dentistId: (rec['dentistId'] ?? rec['dentist_id'] ?? rec['dentistRefId']) as number | undefined,
      dentistRefId: (rec['dentistRefId'] ?? rec['dentist_ref_id']) as number | undefined,
  dentistName: (rec['dentistName'] as string) ?? extractName(rec['dentist']) ?? undefined,
      assistantId: (rec['assistantId'] ?? rec['assistant_id']) as number | undefined,
      assistantName: (rec['assistantName'] as string) ?? undefined,
      branchId: (rec['branchId'] ?? rec['branch_id']) as number | undefined,
      branchName: (rec['branchName'] as string) ?? undefined,
      scheduledTime: (rec['scheduledTime'] ?? rec['scheduled_time'] ?? rec['scheduledLocal']) as string | undefined,
      estimatedMinutes: (rec['estimatedMinutes'] ?? rec['estimated_minutes'] ?? rec['serviceDuration']) as number | undefined,
      notes: (rec['notes'] ?? rec['note']) as string | undefined,
      status: (rec['status'] ?? rec['state']) as string | undefined,
      receptionistId: (rec['receptionistId'] as number) ?? undefined,
      createdAt: (rec['createdAt'] ?? rec['created_at']) as string | undefined,
      updatedAt: (rec['updatedAt'] ?? rec['updated_at']) as string | undefined,
    } as AppointmentItem;

    mapRef.current.set(id, { ...(mapRef.current.get(id) || {}), ...a });
    // set sorted array
    const arr = Array.from(mapRef.current.values()).sort((x, y) => {
      const tx = x.scheduledTime ? new Date(x.scheduledTime).getTime() : 0;
      const ty = y.scheduledTime ? new Date(y.scheduledTime).getTime() : 0;
      return tx - ty;
    });
    setAppointments(arr);
  };

  // initial load function
  useEffect(() => {
    let mounted = true;
    function isApiResponse<T>(v: unknown): v is { success: boolean; data?: T } {
      return !!v && typeof v === 'object' && 'success' in (v as Record<string, unknown>);
    }
    async function loadInitial() {
      try {
        let raw: unknown[] = [];
        if (dentistId != null) {
          const res = await AppointmentAPI.getDaySchedule(dentistId, date || new Date().toISOString().slice(0, 10));
          if (isApiResponse<unknown[]>(res)) raw = res.data || [];
          else if (Array.isArray(res)) raw = res as unknown[];
          else raw = [];
        } else {
          const res = await AppointmentAPI.getAll();
          if (isApiResponse<unknown[]>(res)) raw = res.data || [];
          else if (Array.isArray(res)) raw = res as unknown[];
          else raw = [];
        }

        if (!mounted) return;
        const m = new Map<number, AppointmentItem>();
        for (const it of raw || []) {
          if (!it || typeof it !== 'object') continue;
          const rec = it as Record<string, unknown>;
          if (!('id' in rec)) continue;
          m.set(Number(rec['id']), rec as unknown as AppointmentItem);
        }
        mapRef.current = m;
        const arr = Array.from(m.values()).sort((x, y) => {
          const tx = x.scheduledTime ? new Date(x.scheduledTime).getTime() : 0;
          const ty = y.scheduledTime ? new Date(y.scheduledTime).getTime() : 0;
          return tx - ty;
        });
        setAppointments(arr);
      } catch (err) {
        console.error('useAppointmentsRealtime: initial load failed', err);
      }
    }
    loadInitial();
    return () => { mounted = false; };
  }, [dentistId, date]);

  // realtime subscription
  useEffect(() => {
    let active = true;

    try {
      const endpoint = wsEndpoint || (import.meta.env.VITE_WS_ENDPOINT as string) || '/ws';
      console.debug('useAppointmentsRealtime: connecting to ws endpoint', endpoint);
      // read token from options or from localStorage / cookies (http.ts uses same keys)
      const getCookie = (name: string) => {
        try {
          const m = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^|; )' + name.replace(/([.*+?^${}()|[\\]\\])/g, '\\$1') + '=([^;]*)')) : null;
          return m ? decodeURIComponent(m[2]) : null;
        } catch {
          return null;
        }
      };

      const tokenFromStorage = typeof window !== 'undefined'
        ? (localStorage.getItem('accessToken') || getCookie('accessToken') || getCookie('access_token') || null)
        : null;
      const tokenToUse = token || tokenFromStorage || undefined;
      const connectHeaders: StompHeaders = {};
      if (tokenToUse) connectHeaders.Authorization = `Bearer ${tokenToUse}`;
      console.debug('useAppointmentsRealtime: token present for ws connect?', !!tokenToUse);

      // diagnostic probe: try fetching the SockJS info endpoint to get clearer logs when transports fail
      (async () => {
        try {
          const base = endpoint.replace(/\/$/, '');
          const infoUrl = base.endsWith('/info') ? base : (base.startsWith('http') ? `${base}/info` : `${window.location.origin}${base}/info`);
          console.debug('useAppointmentsRealtime: probing SockJS info url', infoUrl);
          const resp = await fetch(infoUrl, { method: 'GET', credentials: 'include' });
          const bodyText = await resp.text();
          console.debug('useAppointmentsRealtime: /info response', { status: resp.status, body: bodyText });
          try {
            const infoObj = JSON.parse(bodyText);
            if (infoObj && infoObj.cookie_needed) {
              const hasCookie = typeof document !== 'undefined' && !!document.cookie && document.cookie.trim().length > 0;
              if (!hasCookie) console.warn('useAppointmentsRealtime: server requires cookie (cookie_needed=true) but no cookie found in browser; handshake may fail.');
            }
          } catch {
            // ignore JSON parse errors
          }
        } catch (probeErr) {
          console.error('useAppointmentsRealtime: failed to probe /info', probeErr);
        }
      })();

      const client = new Client({
        webSocketFactory: () => {
          // create SockJS instance and attach verbose event handlers (dev-only)
          try {
            const sockRaw = new SockJS(endpoint, null, {
              //transports: 'websocket',
            });
            const sock = sockRaw as {
              onopen?: (ev: Event) => void;
              onmessage?: (ev: MessageEvent) => void;
              onclose?: (ev: CloseEvent) => void;
              onerror?: (ev: Event) => void;
            };
            try {
              sock.onopen = (ev: Event) => console.debug('useAppointmentsRealtime: SockJS onopen', ev);
              sock.onmessage = (ev: MessageEvent) => {
                const maybe = ev as unknown as { data?: unknown };
                const preview = maybe && typeof maybe.data !== 'undefined' ? String(maybe.data).slice(0, 200) : ev;
                console.debug('useAppointmentsRealtime: SockJS onmessage', preview);
              };
              sock.onclose = (ev: CloseEvent) => console.warn('useAppointmentsRealtime: SockJS onclose', ev);
              sock.onerror = (ev: Event) => console.error('useAppointmentsRealtime: SockJS onerror', ev);
            } catch (attachErr) {
              console.debug('useAppointmentsRealtime: failed to attach SockJS handlers', attachErr);
            }
            return sockRaw as unknown as WebSocket;
          } catch (e) {
            console.error('useAppointmentsRealtime: failed to create SockJS', e);
            // rethrow to let stomp client handle activation error
            throw e;
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        connectHeaders,
      });

      // enable stomp debug output (prints protocol traffic in console)
      try {
        // client.debug exists on stompjs Client instances
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        client.debug = (m: string) => console.debug('[STOMP]', m);
      } catch (dbgErr) {
        console.debug('useAppointmentsRealtime: failed to enable stomp debug', dbgErr);
      }

      client.onConnect = (frame) => {
        if (!active) return;
        console.debug('useAppointmentsRealtime: STOMP connected', { frame, dentistId });
        setConnected(true);

        client.subscribe('/topic/appointments/global', (msg: Message) => {
          try {
            const ev = JSON.parse(msg.body);
            upsert(ev);
          } catch (subErr) {
            console.error('useAppointmentsRealtime: failed to parse global message', subErr);
          }
        });

        if (dentistId != null) {
          client.subscribe('/topic/appointments/dentist.' + dentistId, (msg: Message) => {
            try {
              const ev = JSON.parse(msg.body);
              upsert(ev);
            } catch (subErr) {
              console.error('useAppointmentsRealtime: failed to parse dentist message', subErr);
            }
          });
        }
      };

      client.onStompError = (frame) => {
        console.error('useAppointmentsRealtime: STOMP error', frame);
      };
      client.onWebSocketClose = (ev: CloseEvent) => {
        console.warn('useAppointmentsRealtime: WebSocket closed', ev);
        setConnected(false);
      };
      client.onWebSocketError = (ev: Event) => {
        console.error('useAppointmentsRealtime: WebSocket error', ev);
        setConnected(false);
      };

  client.activate();
      clientRef.current = client;

      return () => {
        active = false;
        try {
          clientRef.current?.deactivate();
        } catch (deactErr) {
          console.error('useAppointmentsRealtime: error deactivating client', deactErr);
        }
        clientRef.current = null;
        setConnected(false);
      };
    } catch (err) {
      console.error('useAppointmentsRealtime: failed to start STOMP client', err);
      return () => { /* noop */ };
    }
  }, [dentistId, token, wsEndpoint]);

  const refreshAppointment = async (id: number) => {
    try {
      const res = await fetch(`/api/appointments/${id}/notify-test`);
      if (!res.ok) return;
      const a = await res.json();
      upsert(a);
    } catch (e) {
      console.error(e);
    }
  };

  return { appointments, refreshAppointment, connected };
}
