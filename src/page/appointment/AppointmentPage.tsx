import { useState, useEffect } from "react";
import { AppointmentForm } from "../../components/appointment/AppointmentForm";
import { CalendarView } from "../../components/appointment/CalendarView";
import { Typography, Stack } from "@mui/material";
import { ScheduleTimeline } from "@/components/appointment/ScheduleTimeline";
import { DentistAPI, type Dentist } from '../../services/dentist';

export function AppointmentPage() {
  const [date, setDate] = useState<Date | null>(new Date());
  // lift dentist selection so the timeline (page-level) can read it
  const [dentistId, setDentistId] = useState<number | ''>('');
  const [dentists, setDentists] = useState<Dentist[]>([]);

  useEffect(() => {
    let mounted = true;
    DentistAPI.getDentists()
      .then(res => {
        if (!mounted) return;
        if (res && res.success && Array.isArray(res.data)) setDentists(res.data);
        else setDentists([]);
      })
      .catch(() => { if (mounted) setDentists([]); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-4 bg-white rounded-xl">
         {/* Header Section */}
        <div className="bg-gradient-to-r mb-5 from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="uppercase text-xs tracking-[0.2em] opacity-80">Khởi tạo</p>
              <Typography variant="h5" fontWeight="bold" className="text-white">Lịch hẹn tư vấn / điều trị </Typography>
             
            </div>
            
          </div>
        </div>
      
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        {/* Cột trái */}
        <CalendarView date={date} setDate={setDate} />
        
        {/* Cột phải */}
        <Stack direction="column" spacing={2} sx={{ flex: 1 }}>
          <AppointmentForm dentistId={dentistId} setDentistId={setDentistId} pageDate={date} setPageDate={setDate} />
          {/* Show timeline for selected day (ScheduleTimeline used on the page level for both tabs) */}
          <ScheduleTimeline
            dentistId={typeof dentistId === 'number' ? dentistId : undefined}
            // format date using local date parts to avoid UTC offset shifting the day
            date={date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : undefined}
            dentistName={dentists.find(d => d.id === dentistId)?.name}
          />
        </Stack>
      </Stack>
    </div>
  );
}