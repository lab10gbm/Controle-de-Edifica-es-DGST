import {
  GenericStatisticalMatrixResult,
  MONTH_ABBR,
  REPORT_CATEGORIES,
} from './statisticalReport';

export interface PrintStudioOptions {
  order: 'table-first' | 'chart-first';
  orientation: 'portrait' | 'landscape';
  showTable: boolean;
  showChart: boolean;
  showOfficialHeader: boolean;
  showDistribution: boolean;
  showSignature: boolean;
  pageBreakBetween: boolean;
}

export interface StatisticalReportLabels {
  reportTitle?: string;
  chartTitle?: string;
  rowColumnLabel?: string;
  categories?: readonly string[];
  emptyMessage?: string;
  filePrefix?: string;
}

interface GenerateStatisticalPdfParams {
  matrix: GenericStatisticalMatrixResult<unknown, string>;
  officialTitle: string;
  reportYear: number;
  monthsSubtitle: string;
  hiddenMonths: Set<number>;
  monthColors: string[];
  svgElement: SVGSVGElement | null;
  options?: Partial<PrintStudioOptions>;
  labels?: StatisticalReportLabels;
}

function serializeStyledSvgToDataUrl(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '1920');
  clone.setAttribute('height', '780');

  clone.querySelectorAll('text').forEach((textEl) => {
    const cls = textEl.getAttribute('class') || '';
    textEl.removeAttribute('class');

    if (cls.includes('fill-slate-600')) {
      textEl.setAttribute('fill', '#475569');
    } else {
      textEl.setAttribute('fill', '#334155');
    }

    if (cls.includes('text-[10px]')) {
      textEl.setAttribute('font-size', '10');
    } else if (cls.includes('text-[10.5px]')) {
      textEl.setAttribute('font-size', '10.5');
    } else {
      textEl.setAttribute('font-size', '11');
    }

    if (cls.includes('font-bold')) {
      textEl.setAttribute('font-weight', '700');
    } else if (cls.includes('font-semibold')) {
      textEl.setAttribute('font-weight', '600');
    }

    if (cls.includes('font-mono')) {
      textEl.setAttribute('font-family', 'Courier New, monospace');
    } else {
      textEl.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    }
  });

  clone.querySelectorAll('rect, line, g').forEach((el) => {
    el.removeAttribute('class');
  });

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

async function svgToPngDataUrl(svgEl: SVGSVGElement): Promise<string | null> {
  try {
    const dataUrl = serializeStyledSvgToDataUrl(svgEl);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 780;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export async function generateStatisticalPdfReport({
  matrix,
  officialTitle,
  reportYear,
  monthsSubtitle,
  hiddenMonths,
  monthColors,
  svgElement,
  options,
  labels,
}: GenerateStatisticalPdfParams): Promise<void> {
  const reportTitle = (
    labels?.reportTitle || 'ESTATÍSTICA DE SOLICITAÇÕES DE PROCESSOS'
  ).toUpperCase();
  const chartTitle = (
    labels?.chartTitle || 'GRÁFICO DA ESTATÍSTICA DE SOLICITAÇÕES DE PROCESSOS'
  ).toUpperCase();
  const rowColumnLabel = (labels?.rowColumnLabel || 'PROCESSO').toUpperCase();
  const categories = labels?.categories || REPORT_CATEGORIES;
  const emptyMessage =
    labels?.emptyMessage || 'Sem registros encontrados para o período selecionado.';
  const filePrefix = labels?.filePrefix || 'quadro-grafico';

  const opts: PrintStudioOptions = {
    order: options?.order ?? 'table-first',
    orientation: options?.orientation ?? 'portrait',
    showTable: options?.showTable ?? true,
    showChart: options?.showChart ?? true,
    showOfficialHeader: options?.showOfficialHeader ?? true,
    showDistribution: options?.showDistribution ?? false,
    showSignature: options?.showSignature ?? false,
    pageBreakBetween: options?.pageBreakBetween ?? false,
  };

  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = opts.orientation === 'landscape' ? 297 : 210;
  const pageHeight = opts.orientation === 'landscape' ? 210 : 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;

  const pngDataUrl =
    opts.showChart && svgElement && matrix.grandTotal > 0
      ? await svgToPngDataUrl(svgElement)
      : null;

  let cursorY = 11;

  const ensureSpace = (neededH: number) => {
    if (cursorY + neededH > pageHeight - 14) {
      doc.addPage();
      cursorY = 12;
    }
  };

  const renderTableCard = () => {
    const headerBlockH = opts.showOfficialHeader ? 42 : 17;
    const rowsCount = matrix.rows.length;
    const headerH = 8.5;
    const rowH = 9;
    const tableH = headerH + rowsCount * rowH + rowH;
    const distH = opts.showDistribution ? 28 : 0;
    const cardH = headerBlockH + tableH + distH + 6;

    ensureSpace(cardH);
    const startY = cursorY;

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, startY, contentWidth, cardH, 2.5, 2.5, 'FD');

    let innerY = startY;

    if (opts.showOfficialHeader) {
      doc.setFillColor(153, 27, 27);
      doc.circle(centerX, innerY + 8, 4.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(255, 255, 255);
      doc.text('SST', centerX, innerY + 8.8, { align: 'center' });

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO', centerX, innerY + 17, {
        align: 'center',
      });

      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('COMANDO DE BOMBEIRO DA ÁREA DA COSTA VERDE', centerX, innerY + 21.5, {
        align: 'center',
      });
      doc.text('10º GRUPAMENTO DE BOMBEIRO MILITAR', centerX, innerY + 26, {
        align: 'center',
      });

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(reportTitle, centerX, innerY + 33, {
        align: 'center',
      });

      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${officialTitle.toUpperCase()} / ${reportYear}`, centerX, innerY + 37.5, {
        align: 'center',
      });
      innerY += 41.5;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(reportTitle, centerX, innerY + 7, {
        align: 'center',
      });
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${officialTitle.toUpperCase()} / ${reportYear}`, centerX, innerY + 12, {
        align: 'center',
      });
      innerY += 16.5;
    }

    const tableX = marginX + 6;
    const tableW = contentWidth - 12;
    const colProcW = opts.orientation === 'landscape' ? 92 : 64;
    const colTotalW = opts.orientation === 'landscape' ? 28 : 20;
    const monthCount = Math.max(1, matrix.months.length);
    const colMonthW = (tableW - colProcW - colTotalW) / monthCount;

    let curY = innerY;
    doc.setLineWidth(0.3);
    doc.setDrawColor(30, 41, 59);

    // Header row
    doc.setFillColor(226, 232, 240);
    doc.rect(tableX, curY, tableW, headerH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(rowColumnLabel, tableX + colProcW / 2, curY + 5.6, { align: 'center' });

    let colX = tableX + colProcW;
    doc.line(colX, curY, colX, curY + headerH);
    for (const m of matrix.months) {
      doc.text(MONTH_ABBR[m] || '', colX + colMonthW / 2, curY + 5.6, { align: 'center' });
      colX += colMonthW;
      doc.line(colX, curY, colX, curY + headerH);
    }
    doc.text('TOTAL', colX + colTotalW / 2, curY + 5.6, { align: 'center' });
    curY += headerH;

    // Rows
    for (const row of matrix.rows) {
      doc.setFillColor(255, 255, 255);
      doc.rect(tableX, curY, tableW, rowH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(row.category, tableX + colProcW / 2, curY + 5.8, { align: 'center' });

      colX = tableX + colProcW;
      doc.line(colX, curY, colX, curY + rowH);
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);

      for (const m of matrix.months) {
        const val = row.byMonth[m] || 0;
        doc.setTextColor(val > 0 ? 15 : 148, val > 0 ? 23 : 163, val > 0 ? 42 : 184);
        doc.text(String(val), colX + colMonthW / 2, curY + 5.8, { align: 'center' });
        colX += colMonthW;
        doc.line(colX, curY, colX, curY + rowH);
      }

      doc.setFont('courier', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(row.total), colX + colTotalW / 2, curY + 5.8, { align: 'center' });
      curY += rowH;
    }

    // Total Row
    doc.setFillColor(241, 245, 249);
    doc.rect(tableX, curY, tableW, rowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL', tableX + colProcW / 2, curY + 5.8, { align: 'center' });

    colX = tableX + colProcW;
    doc.line(colX, curY, colX, curY + rowH);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);

    for (const m of matrix.months) {
      const val = matrix.totalsByMonth[m] || 0;
      doc.text(String(val), colX + colMonthW / 2, curY + 5.8, { align: 'center' });
      colX += colMonthW;
      doc.line(colX, curY, colX, curY + rowH);
    }
    doc.text(String(matrix.grandTotal), colX + colTotalW / 2, curY + 5.8, { align: 'center' });
    curY += rowH;

    if (opts.showDistribution) {
      curY += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('DISTRIBUIÇÃO PERCENTUAL NO PERÍODO:', tableX, curY);
      curY += 4.5;

      const colW = tableW / 2;
      categories.forEach((cat, idx) => {
        const row = matrix.rows.find((r) => r.category === cat);
        const count = row?.total || 0;
        const pct = matrix.grandTotal > 0 ? ((count / matrix.grandTotal) * 100).toFixed(1).replace('.', ',') : '0,0';
        const px = tableX + (idx % 2) * colW;
        const py = curY + Math.floor(idx / 2) * 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(`${cat}: ${count} (${pct}%)`, px, py);
      });
    }

    cursorY = startY + cardH + 5;
  };

  const renderChartCard = () => {
    const imgW = opts.orientation === 'landscape' ? Math.min(contentWidth - 16, 235) : contentWidth - 14;
    const imgH = (imgW * 780) / 1920;
    const cardH = 30 + imgH;

    ensureSpace(cardH);
    const startY = cursorY;

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, startY, contentWidth, cardH, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(chartTitle, centerX, startY + 7.5, {
      align: 'center',
    });

    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${officialTitle.toUpperCase()} / ${reportYear}`, centerX, startY + 12.5, {
      align: 'center',
    });

    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX + 4, startY + 16, contentWidth - 8, cardH - 20, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(monthsSubtitle, marginX + 8, startY + 22);

    const visibleMonths = matrix.months.filter((m) => !hiddenMonths.has(m));
    let legendX = pageWidth - marginX - 8;
    for (let i = visibleMonths.length - 1; i >= 0; i--) {
      const m = visibleMonths[i];
      const origIdx = matrix.months.indexOf(m);
      const hexColor = monthColors[origIdx % monthColors.length] || '#3B75AF';
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);

      const abbr = MONTH_ABBR[m] || '';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const textW = doc.getTextWidth(abbr);
      legendX -= textW;
      doc.setTextColor(51, 65, 85);
      doc.text(abbr, legendX, startY + 22);

      legendX -= 4.2;
      doc.setFillColor(r, g, b);
      doc.rect(legendX, startY + 19.2, 3, 3, 'F');
      legendX -= 3.5;
    }

    if (pngDataUrl) {
      const imgX = (pageWidth - imgW) / 2;
      doc.addImage(pngDataUrl, 'PNG', imgX, startY + 26, imgW, imgH);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(emptyMessage, centerX, startY + 28 + imgH / 2, {
        align: 'center',
      });
    }

    cursorY = startY + cardH + 5;
  };

  const blocks =
    opts.order === 'table-first'
      ? [
          ...(opts.showTable ? [renderTableCard] : []),
          ...(opts.showChart ? [renderChartCard] : []),
        ]
      : [
          ...(opts.showChart ? [renderChartCard] : []),
          ...(opts.showTable ? [renderTableCard] : []),
        ];

  blocks.forEach((renderBlock, idx) => {
    if (idx > 0 && opts.pageBreakBetween) {
      doc.addPage();
      cursorY = 12;
    }
    renderBlock();
  });

  if (opts.showSignature) {
    ensureSpace(24);
    const sigY = Math.max(cursorY + 8, pageHeight - 28);
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    const lineW = 72;
    const leftLineX = centerX - lineW - 10;
    const rightLineX = centerX + 10;
    doc.line(leftLineX, sigY, leftLineX + lineW, sigY);
    doc.line(rightLineX, sigY, rightLineX + lineW, sigY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Chefe da SST / 10º GBM', leftLineX + lineW / 2, sigY + 4, { align: 'center' });
    doc.text('Diretor / Comandante', rightLineX + lineW / 2, sigY + 4, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const emitidoEm = new Date().toLocaleDateString('pt-BR');
  doc.text(
    `CBMERJ · 10º GBM (Angra dos Reis) · SST · Emitido em ${emitidoEm}`,
    centerX,
    pageHeight - 6,
    { align: 'center' }
  );

  const safeSlug = officialTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase();
  doc.save(`${filePrefix}-${safeSlug}-${reportYear}.pdf`);
}
