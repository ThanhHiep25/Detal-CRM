import { useState } from 'react';
import {
    Box, Typography, TextField, IconButton, Paper, Radio,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { grey } from '@mui/material/colors';
import { Referrer, referrerSearchResults } from '@/data/data';

interface ReferrerSearchSectionProps {
    onReferrerSelect: (referrer: Referrer | null) => void;
}

export function ReferrerSearchSection({ onReferrerSelect }: ReferrerSearchSectionProps) {
    const [selectedReferrerId, setSelectedReferrerId] = useState<number | null>(null);

    const handleSelect = (row: Referrer) => {
        setSelectedReferrerId(row.id);
        onReferrerSelect(row);
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                    <Typography variant="h6">Người giới thiệu</Typography>
                    <Typography variant="body2" color="text.secondary">Thêm người giới thiệu</Typography>
                </Box>
                <Box>
                    <IconButton size="small"><SearchIcon /></IconButton>
                    <IconButton size="small"><AddIcon /></IconButton>
                    <IconButton size="small"><ArrowUpwardIcon /></IconButton>
                    <IconButton size="small"><ArrowDownwardIcon /></IconButton>
                </Box>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${grey[200]}` }}>
                <Box sx={{ p: 1 }}>
                    <TextField
                        fullWidth
                        variant="standard"
                        size="small"
                        placeholder="eg. tìm kiếm theo tên, số điện thoại hoặc mã số"
                        InputProps={{ disableUnderline: true }}
                    />
                </Box>
                <Table sx={{ minWidth: 650 }} size="small">
                    <TableHead sx={{ bgcolor: grey[50] }}>
                        <TableRow>
                            <TableCell width="5%">#</TableCell>
                            <TableCell width="5%"></TableCell>
                            <TableCell>Tên</TableCell>
                            <TableCell>Mã</TableCell>
                            <TableCell>Số Điện Thoại</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {referrerSearchResults.map((row, index) => (
                            <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell padding="none">
                                    <Radio
                                        checked={selectedReferrerId === row.id}
                                        onChange={() => handleSelect(row)}
                                        value={row.id}
                                    />
                                </TableCell>
                                <TableCell component="th" scope="row">{row.name}</TableCell>
                                <TableCell>{row.code}</TableCell>
                                <TableCell>{row.phone}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}