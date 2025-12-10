import { useEffect, useState } from 'react';
// Using Tailwind for modal styling; MUI imports removed
import { Appointment, statusColors } from '@/data/data';
import type { AppointmentItem } from '@/services/appointments';

interface AppointmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  // Accept either the app's internal Appointment shape or the richer AppointmentItem from the API
  appointment: Appointment | AppointmentItem | null;
  onSave?: (appointment: Appointment) => void; // optional - when provided the modal can save
  fullScreen?: boolean;
}

// Normalized view model used by the modal for rendering
interface ViewAppointment {
  id: number;
  customerName: string;
  customerEmail?: string;
  label?: string;
  service?: string;
  startTime?: string; // human-friendly
  endTime?: string; // human-friendly
  scheduledTimeRaw?: string; // ISO
  estimatedMinutes?: number | null;
  dentistName?: string;
  assistantName?: string;
  branchName?: string;
  notes?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function AppointmentDetailModalDental({ open, onClose, appointment, fullScreen }: AppointmentDetailModalProps) {
  // Local state holds the appointment snapshot (read-only)
  const [view, setView] = useState<ViewAppointment | null>(null);

  useEffect(() => {
    if (!appointment) {
      setView(null);
      return;
    }

    // If it's already the compact Appointment shape, use directly
    const isDataAppointment = (v: unknown): v is Appointment => {
      return !!v && typeof v === 'object' && 'startTime' in (v as Record<string, unknown>) && 'endTime' in (v as Record<string, unknown>) && 'doctorId' in (v as Record<string, unknown>);
    };

    if (isDataAppointment(appointment)) {
      const appt = appointment as Appointment;
      setView({
        id: appt.id,
        customerName: appt.customerName,
        service: appt.service,
        startTime: appt.startTime,
        endTime: appt.endTime,
        status: (appt as unknown as Record<string, unknown>).status as string | undefined,
      });
      return;
    }

    // it's likely an AppointmentItem from the API — normalize fields
    const it = appointment as AppointmentItem;
    const scheduled = it.scheduledTime ? new Date(it.scheduledTime) : null;
    const est = (typeof it.estimatedMinutes === 'number' && it.estimatedMinutes > 0) ? it.estimatedMinutes : (typeof it.estimatedMinutes === 'number' ? it.estimatedMinutes : (typeof it.serviceDuration === 'number' ? it.serviceDuration : null));
    const end = scheduled && est ? new Date(scheduled.getTime() + (est || 0) * 60000) : null;

    setView({
      id: it.id,
      label: it.label,
      customerName: it.customerName ?? it.customerUsername ?? '',
      customerEmail: it.customerEmail ?? undefined,
      service: it.serviceName ?? undefined,
      startTime: scheduled ? scheduled.toLocaleString() : undefined,
      endTime: end ? end.toLocaleString() : undefined,
      scheduledTimeRaw: it.scheduledTime,
      estimatedMinutes: typeof it.estimatedMinutes === 'number' ? it.estimatedMinutes : typeof it.serviceDuration === 'number' ? it.serviceDuration : null,
      dentistName: it.dentistName,
      assistantName: it.assistantName,
      branchName: it.branchName,
      notes: it.notes ?? null,
      status: it.status ?? undefined,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    });
  }, [appointment]);

  if (!open || !view) return null;

  const status = (view.status || 'confirmed').toString() as keyof typeof statusColors;
  const colors = statusColors[status] || statusColors.confirmed;

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

  {/* Modal panel */}
  <div className={fullScreen ? "relative bg-white w-full h-full mx-0" : "relative bg-white rounded-xl shadow-lg w-full max-w-2xl mx-4"}>
        <div className={fullScreen ? "flex items-center justify-between px-4 py-3" : "flex items-center justify-between px-4 py-3 border-b"}>
          <h3 className="text-lg font-semibold">Chi tiết lịch hẹn</h3>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800">Đóng</button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Khách hàng</div>
              <div className="text-sm font-medium text-gray-900">{view.customerName || 'Khách hàng'}</div>
              {view.customerEmail ? <div className="text-xs text-gray-500">{view.customerEmail}</div> : null}
            </div>

            <div>
              <div className="text-xs text-gray-500">Dịch vụ</div>
              <div className="text-sm text-gray-900">{view.service || '-'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Thời gian</div>
              <div className="text-sm text-gray-900">{view.startTime ?? '-'}{view.endTime ? ` — ${view.endTime}` : ''}</div>
              {view.estimatedMinutes ? <div className="text-xs text-gray-500">Thời lượng: {view.estimatedMinutes} phút</div> : null}
            </div>
            <div>
              <div className="text-xs text-gray-500">Bác sĩ / Phụ tá</div>
              <div className="text-sm text-gray-900">{view.dentistName ?? '-'}{view.assistantName ? ` / ${view.assistantName}` : ''}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Chi nhánh</div>
            <div className="text-sm text-gray-900">{view.branchName ?? '-'}</div>
          </div>

          {view.notes ? (
            <div>
              <div className="text-xs text-gray-500">Ghi chú</div>
              <div className="text-sm text-gray-900">{view.notes}</div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Tạo lúc</div>
              <div className="text-sm text-gray-900">{view.createdAt ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Cập nhật</div>
              <div className="text-sm text-gray-900">{view.updatedAt ?? '-'}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Trạng thái</div>
            <div className="mt-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium"
                style={{ backgroundColor: colors.light, color: colors.text, border: `1px solid ${colors.main}` }}
              >
                {view.status}
              </span>
            </div>
          </div>
        </div>

        <div className={fullScreen ? "flex justify-end px-4 py-3" : "flex justify-end px-4 py-3 border-t"}>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100 text-sm text-gray-800 hover:bg-gray-200">Đóng</button>
        </div>
      </div>
    </div>
  );
}