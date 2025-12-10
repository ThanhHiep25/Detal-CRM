import { useState, useEffect, useMemo } from 'react';
import { Grid, Typography, Box, Button, CircularProgress } from "@mui/material";
import ExcelJS from 'exceljs';
import { toast } from 'react-toastify';
import { ServiceAPI } from '@/services/service';
import { ServiceDataTable } from '@/components/services/ServiceDataTable';
import { ServiceModal } from '@/components/services/ServiceModal';

interface UserData {
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export function ServicePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  // Get user role from localStorage
  const isAdmin = useMemo(() => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return false;
      const user: UserData = JSON.parse(userData);
      return user.role === 'ROLE_ADMIN';
    } catch {
      return false;
    }
  }, []);



  const handleExportXlsx = async () => {
    try {
      setExportingXlsx(true);
      const res = await ServiceAPI.getServices();
      const dataHolder = res as unknown as { data?: unknown };
      const list = Array.isArray(dataHolder.data) ? (dataHolder.data as unknown[]) : [];
      if (!Array.isArray(list) || list.length === 0) {
        setExportingXlsx(false);
        return;
      }

      const rows = list.map((it: unknown) => {
        const item = it as Record<string, unknown>;
        const category = item['category'] && typeof item['category'] === 'object' ? ((item['category'] as Record<string, unknown>)['name'] ?? (item['category'] as Record<string, unknown>)['title'] ?? '') : (item['category'] ?? '');
        const name = (item['name'] ?? item['serviceName'] ?? item['title'] ?? '') as string;
        const code = (item['code'] ?? item['sku'] ?? '') as string;
        const priceNum = Number(item['price'] ?? item['amount'] ?? 0);
        const priceFormatted = priceNum ? `${priceNum.toLocaleString('vi-VN')} đ` : '';
        const unit = (item['unit'] ?? item['unitName'] ?? '') as string;
        const active = typeof item['active'] === 'boolean' ? ((item['active'] as boolean) ? 'Có' : 'Có') : ((item['isActive'] as boolean) ? 'Có' : 'Có');
        return {
          id: item['id'] ?? '',
          code,
          name,
          category: String(category),
          unit,
          price: priceFormatted,
          active
        } as Record<string, unknown>;
      });

      const headerCols = [
        { key: 'id', label: 'ID' },
        { key: 'code', label: 'Mã' },
        { key: 'name', label: 'Tên dịch vụ' },
        { key: 'category', label: 'Nhóm' },
        { key: 'unit', label: 'Đơn vị' },
        { key: 'price', label: 'Giá (đ)' },
        { key: 'active', label: 'Hoạt động' }
      ];

      const now = new Date();
      const exportedAt = now.toISOString().replace('T', ' ').slice(0, 19);
      const reportTitle = 'BÁO CÁO: DANH SÁCH DỊCH VỤ';

      const totalCount = rows.length;
      const totalPriceSum = list.reduce((s: number, it) => s + Number((it as Record<string, unknown>)['price'] ?? (it as Record<string, unknown>)['amount'] ?? 0), 0);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Services');

      sheet.columns = headerCols.map(h => ({ header: h.label, key: h.key, width: 24 }));

      const lastCol = headerCols.length;
      sheet.mergeCells(1, 1, 1, lastCol);
      const titleCell = sheet.getCell('A1');
      titleCell.value = reportTitle;
      titleCell.font = { name: 'Arial', size: 14, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>;

      const companyName = 'NHAKHOA CRM';
      sheet.getCell('A2').value = 'Đơn vị';
      sheet.getCell('B2').value = companyName;
      sheet.getCell('A3').value = 'Thời gian xuất';
      sheet.getCell('B3').value = exportedAt;
      sheet.getCell('A4').value = 'Bộ lọc';

      sheet.getCell('A5').value = 'Số lượng bản ghi';
      sheet.getCell('B5').value = totalCount;
      sheet.getCell('A6').value = 'Tổng giá (đ)';
      sheet.getCell('B6').value = totalPriceSum;

      const headerRowNumber = 8;
      const headerRow = sheet.getRow(headerRowNumber);
      headerCols.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h.label;
        cell.font = { bold: true, name: 'Arial', size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as ExcelJS.Fill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>;
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as Partial<ExcelJS.Borders>;
      });
      headerRow.height = 20;

      sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

      let rowIndex = headerRowNumber + 1;
      rows.forEach((r, idx) => {
        const row = sheet.getRow(rowIndex);
        headerCols.forEach((h, ci) => {
          const val = r[h.key] as string | number | null | undefined;
          const cell = row.getCell(ci + 1);
          cell.value = (val ?? '') as string | number;
          if (h.key === 'name' || h.key === 'category') cell.alignment = { wrapText: true, vertical: 'top' } as Partial<ExcelJS.Alignment>;
        });
        const isAlt = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
          if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } } as ExcelJS.Fill;
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as Partial<ExcelJS.Borders>;
        });
        row.commit();
        rowIndex++;
      });

      sheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber, column: lastCol } };

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `services-${(new Date()).toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      console.debug('Exported services count', totalCount);
    } catch (err) {
      console.error('service export error', err);
      toast.error('Lỗi khi xuất Excel. Vui lòng cài `exceljs` và thử lại.');
    } finally {
      setExportingXlsx(false);
    }
  };

  // load services to compute categories dynamically
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await ServiceAPI.getServices();
        const data = res && (res as unknown as { data?: unknown }).data;
        const list = Array.isArray(data) ? data as unknown[] : [];
        const map = new Map<string, { id: string; name: string; count: number }>();
        for (const s of list) {
          const row = s as unknown as Record<string, unknown>;
          let cat: unknown = null;
          if ('categoryId' in row) cat = row['categoryId'];
          else if (row['category'] && typeof row['category'] === 'object') {
            const c = row['category'] as Record<string, unknown>;
            cat = (c['id'] ?? c['categoryId'] ?? c['name']) ?? row['category'];
          } else {
            cat = row['category'];
          }
          const id = cat == null ? 'uncategorized' : String(cat);
          let name = id === 'uncategorized' ? 'Khác' : id;
          if (cat && typeof cat === 'object') {
            const cobj = cat as Record<string, unknown>;
            if (cobj['name'] && typeof cobj['name'] === 'string') name = String(cobj['name']);
          }
          if (!map.has(id)) map.set(id, { id, name, count: 0 });
          map.get(id)!.count += 1;
        }
        if (!mounted) return;



      } catch {
        if (!mounted) return;

      }
    })();
    return () => { mounted = false; };
  }, [reloadKey]);

  return (
    <div className="p-4 bg-white rounded-xl">

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản lý</p>
            <Typography variant="h5" fontWeight="bold" className="text-white">Danh sách dịch vụ</Typography>
          </div>
          <Box>
            <Button variant="contained" onClick={handleExportXlsx} disabled={exportingXlsx} startIcon={exportingXlsx ? <CircularProgress size={18} /> : undefined}>
              {exportingXlsx ? 'Đang xuất...' : 'Xuất Excel'}
            </Button>
          </Box>
        </div>
      </div>


      <Grid container >
        {/* Cột phải: Bảng dữ liệu */}
        <Grid item xs={12} md={12}>
          <ServiceDataTable onAddService={() => setModalOpen(true)} reloadKey={reloadKey} categoryFilter={undefined} isAdmin={isAdmin} />
        </Grid>
      </Grid>

      {/* Modal thêm/sửa dịch vụ */}
      {modalOpen && (
        <ServiceModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          mode="create"
          onSaved={() => { setReloadKey(k => k + 1); setModalOpen(false); }}
        />
      )}
    </div>
  );
}