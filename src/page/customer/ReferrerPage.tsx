import { useState } from 'react';
import {
    Box, Grid, Paper, Typography, Button, TextField, FormControl,
    InputLabel, Select, MenuItem, IconButton, RadioGroup, FormControlLabel, Radio, Stack
} from "@mui/material";
import { grey, red } from '@mui/material/colors';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { referrers } from '@/data/data';


// Style cho input
const inputStyles = { '& .MuiFilledInput-root': { border: '1px solid transparent', borderRadius: '8px', backgroundColor: grey[100], '&:hover': { backgroundColor: grey[200] }, '&.Mui-focused': { backgroundColor: 'white', borderColor: 'primary.main' }, '&::before, &::after': { display: 'none' } }, '& .MuiInputLabel-root': { '&.Mui-focused': { color: 'primary.main' } } };

// Kiểu dữ liệu cho người giới thiệu
interface Referrer {
    id?: string;
    name?: string;
    phone?: string;
    phone2?: string;
    email?: string;
    branch?: string;
    address?: string;
}

export function ReferrerPage() {
    const [selectedReferrerId, setSelectedReferrerId] = useState('EM0127');
    const [formData, setFormData] = useState<Referrer | undefined>(
        referrers.find(r => r.id === selectedReferrerId)
    );

    const handleSelectReferrer = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newId = event.target.value;
        setSelectedReferrerId(newId);
        const selectedData = referrers.find(r => r.id === newId);
        setFormData(selectedData);
    };

    const handleInputChange = (field: keyof Referrer) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => prev ? { ...prev, [field]: event.target.value } : undefined);
    }

    return (
        <Box sx={{ p: 2, bgcolor: grey[50], minHeight: '100vh' }}>
            {/* Tiêu đề trang */}
            <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
                Người giới thiệu
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Thêm mới/Chỉnh sửa Người giới thiệu</Typography>

            {/* Nội dung chính của trang */}
            <Paper elevation={0} sx={{ p: 2, border: `1px solid ${grey[200]}` }}>
                <Grid container spacing={3}>
                    {/* Cột trái */}
                    <Grid item xs={12} md={3}>
                       <Box sx={{ width: '100%', height: 160, bgcolor: grey[200], borderRadius: 2, mb: 2 }} />
                       <Button variant="text" size="small">Hướng dẫn</Button>
                    </Grid>

                    {/* Cột phải */}
                    <Grid item xs={12} md={9}>
                        {/* Phần tìm kiếm và form nằm trong một box riêng */}
                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                            {/* Phần tìm kiếm */}
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={4}><FormControl fullWidth size="small"><InputLabel>Loại</InputLabel><Select label="Loại" defaultValue="employee"><MenuItem value="employee">Nhân viên</MenuItem></Select></FormControl></Grid>
                                <Grid item xs={7}><TextField fullWidth size="small" placeholder="công" InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{mr: 1}}/> }}/></Grid>
                                <Grid item xs={1}><IconButton><AddCircleOutlineIcon /></IconButton></Grid>
                            </Grid>

                            {/* Kết quả tìm kiếm */}
                            <Box sx={{ my: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Danh sách tìm kiếm</Typography>
                                <RadioGroup value={selectedReferrerId} onChange={handleSelectReferrer}>
                                    {referrers.map(r => (
                                        <FormControlLabel
                                            key={r.id} value={r.id} control={<Radio />}
                                            label={
                                                <Box>
                                                    <Typography variant="body1">{r.name}</Typography>
                                                    <Typography variant="body2" color="text.secondary">{r.id} / {r.phone}</Typography>
                                                </Box>
                                            }
                                        />
                                    ))}
                                </RadioGroup>
                            </Box>

                            {/* Form chi tiết */}
                            <Grid container spacing={2}>
                                <Grid item xs={12}><Typography variant="body1" fontWeight="bold">Nhân viên: {formData?.id || ''}</Typography></Grid>
                                <Grid item xs={12} md={4}><TextField disabled fullWidth label="Mã" value={formData?.id || ''} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                                <Grid item xs={12} md={4}><TextField disabled fullWidth label="Tên" value={formData?.name || ''} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                                <Grid item xs={12} md={4}><TextField disabled fullWidth label="Điện thoại" value={formData?.phone || ''} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                                <Grid item xs={12} md={6}><TextField fullWidth label="Điện thoại 2" placeholder="eg. điện thoại" value={formData?.phone2 || ''} onChange={handleInputChange('phone2')} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                                <Grid item xs={12} md={6}><TextField fullWidth label="Email" placeholder="eg. email" value={formData?.email || ''} onChange={handleInputChange('email')} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                                <Grid item xs={12} md={6}><FormControl fullWidth variant="filled" sx={inputStyles}><InputLabel shrink>Chi nhánh</InputLabel><Select value={formData?.branch || 'q1'}><MenuItem value="q1">Nha khoa- Quận 1</MenuItem></Select></FormControl></Grid>
                                <Grid item xs={12} md={6}><TextField fullWidth label="Địa chỉ" placeholder="eg. địa chỉ" value={formData?.address || ''} onChange={handleInputChange('address')} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                                <Grid item xs={12}><TextField fullWidth label="Ghi chú" multiline rows={3} placeholder="Ghi chú" variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                            </Grid>
                        </Box>
                    </Grid>
                </Grid>
                {/* Các nút hành động */}
                <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 3, borderTop: `1px solid ${grey[200]}`, pt: 2 }}>
                    <Button variant="outlined" sx={{ textTransform: 'none', borderRadius: '8px' }}>Đóng</Button>
                    <Button variant="contained" sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: red[500], '&:hover': { bgcolor: red[700]} }}>Ẩn</Button>
                    <Button variant="contained" disableElevation sx={{ textTransform: 'none', borderRadius: '8px' }}>Lưu</Button>
                </Stack>
            </Paper>
        </Box>
    );
}