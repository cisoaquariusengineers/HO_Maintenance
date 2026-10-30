import ExcelJS from 'exceljs';
import { denyUnless } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDateTime, ticketNo } from '@/lib/format';
import { serverError } from '@/lib/http';
import { buildTicketFilter, TICKET_ORDER } from '@/lib/tickets';
import type { HistoryEntry, Ticket } from '@/lib/types';

/** Excel export of the currently filtered tickets, with their full history on a second sheet. */
export async function GET(req: Request) {
  const denied = await denyUnless('admin', 'supervisor');
  if (denied) return denied;
  try {
    const { where, args } = buildTicketFilter(new URL(req.url).searchParams);
    const tickets = await query<Ticket>(`SELECT * FROM tickets ${where} ${TICKET_ORDER}`, args);
    const ids = tickets.map((t) => t.id);
    const history = ids.length
      ? await query<HistoryEntry>('SELECT * FROM ticket_history WHERE ticket_id IN (?) ORDER BY ticket_id, created_at, id', [ids])
      : [];

    const wb = new ExcelJS.Workbook();
    wb.created = new Date();

    const ws = wb.addWorksheet('Tickets', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'Ticket No.', key: 'no', width: 11 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Floor', key: 'floor', width: 13 },
      { header: 'Area', key: 'area', width: 20 },
      { header: 'Location detail', key: 'detail', width: 20 },
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Raised by', key: 'name', width: 18 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'Raised on', key: 'created', width: 20 },
      { header: 'Assigned to', key: 'assigned', width: 16 },
      { header: 'Pending reason', key: 'pending', width: 28 },
      { header: 'Attended by', key: 'attended', width: 16 },
      { header: 'Action taken', key: 'action', width: 36 },
      { header: 'Closed by', key: 'closedBy', width: 20 },
      { header: 'Closed on', key: 'closed', width: 20 },
      { header: 'Resolution (hrs)', key: 'hours', width: 15 },
      { header: 'Times reopened', key: 'reopen', width: 14 },
      { header: 'Photo', key: 'photo', width: 30 },
    ];
    for (const t of tickets) {
      ws.addRow({
        no: ticketNo(t.id),
        type: t.type,
        status: t.status,
        floor: t.floor,
        area: t.area,
        detail: t.location_detail,
        category: t.category,
        description: t.description,
        name: t.employee_name,
        email: t.employee_email,
        created: fmtDateTime(t.created_at),
        assigned: t.assigned_to,
        pending: t.pending_reason,
        attended: t.attended_by,
        action: t.action_taken,
        closedBy: t.closed_by,
        closed: fmtDateTime(t.closed_at),
        hours: t.closed_at
          ? Math.round(((new Date(t.closed_at).getTime() - new Date(t.created_at).getTime()) / 3_600_000) * 10) / 10
          : null,
        reopen: t.reopen_count,
        photo: t.photo_url,
      });
    }

    // "History" is a reserved sheet name in Excel.
    const hs = wb.addWorksheet('Ticket History', { views: [{ state: 'frozen', ySplit: 1 }] });
    hs.columns = [
      { header: 'Ticket No.', key: 'no', width: 11 },
      { header: 'Date & time', key: 'at', width: 20 },
      { header: 'Action', key: 'action', width: 16 },
      { header: 'From', key: 'from', width: 12 },
      { header: 'To', key: 'to', width: 12 },
      { header: 'Details', key: 'note', width: 50 },
      { header: 'By', key: 'by', width: 22 },
    ];
    for (const h of history) {
      hs.addRow({
        no: ticketNo(h.ticket_id),
        at: fmtDateTime(h.created_at),
        action: h.action,
        from: h.from_status,
        to: h.to_status,
        note: h.note,
        by: h.done_by,
      });
    }

    for (const sheet of [ws, hs]) {
      const header = sheet.getRow(1);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5BC4' } };
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
    }

    const buffer = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="HO-Helpdesk-${stamp}.xlsx"`,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
