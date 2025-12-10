import { Card, CardContent, Typography, Box } from "@mui/material";
import { StaticDatePicker } from "@mui/x-date-pickers";
import { blue, grey } from "@mui/material/colors"; // Thêm grey
import { useEffect, useState } from "react";

// ... Interface không đổi ...
interface CalendarViewProps {
  date: Date | null;
  setDate: (date: Date | null) => void;
}




export function CalendarView({ date, setDate }: CalendarViewProps) {


  // Maintain a local clock for display only (do not modify the selected date)
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timelocal = now;
  const i = timelocal.getHours();
  const time = `${i < 10 ? '0' + i : i}:${timelocal.getMinutes() < 10 ? '0' + timelocal.getMinutes() : timelocal.getMinutes()} :${timelocal.getSeconds() < 10 ? '0' + timelocal.getSeconds() : timelocal.getSeconds()} ${timelocal.getHours() >= 12 ? 'PM' : 'AM'}`


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: { xs: '100%', lg: 320 } }}>
      <Card elevation={0} sx={{ border: `1px solid ${grey[200]}` }}>
        <StaticDatePicker
          displayStaticWrapperAs="desktop"
          value={date}
          onChange={(newDate) => setDate(newDate)}
          sx={{
            '.MuiPickersLayout-toolbar, .MuiDialogActions-root': { display: 'none' },
            '.MuiPickersDay-root.Mui-selected': {
              backgroundColor: blue[600],
              color: 'white',
              borderRadius: '50%',
              '&:hover': { backgroundColor: blue[700] },
              '&:focus': { backgroundColor: blue[600] }
            },
          }}
        />
      </Card>
      <Card elevation={0} sx={{ border: `1px solid ${grey[200]}` }}>
        <CardContent>
          <Typography variant="body1" fontWeight={500} color="text.secondary">
            Tổng lịch {date?.toLocaleDateString('vi-VN')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Nha khoa {time}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2, textAlign: 'center' }}>
            <Box>
              <Typography variant="h4" color="primary" fontWeight="bold">13</Typography>
              <Typography variant="body2" color="text.secondary">Buổi sáng</Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="primary" fontWeight="bold">11</Typography>
              <Typography variant="body2" color="text.secondary">Buổi chiều</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}