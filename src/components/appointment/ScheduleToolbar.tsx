import { Box, Button, IconButton } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';

export function ScheduleToolbar() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2, borderBottom: '1px solid #e0e0e0' }}>
      <Button variant="outlined" size="small">Hôm nay</Button>
      <IconButton size="small"><ChevronLeftIcon /></IconButton>
      <IconButton size="small"><ChevronRightIcon /></IconButton>
      <DatePicker sx={{ '& .MuiInputBase-root': { height: '32px' } }} />
      <Box sx={{ flexGrow: 1 }} />
      <Button variant="outlined" startIcon={<PrintIcon />}>In lịch</Button>
      <Button variant="contained" disableElevation startIcon={<AddIcon />}>Thêm lịch hẹn</Button>
    </Box>
  );
}