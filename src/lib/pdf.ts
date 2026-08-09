import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { APP_NAME } from "./constants"
import { formatDateTime } from "./format"

const MARGIN = 14

export interface ReportSection {
  heading?: string
  head: string[]
  rows: (string | number)[][]
}

/** Monta um relatório em PDF com título, resumo (linhas rótulo/valor) e uma ou mais tabelas. */
export function buildReport(params: {
  title: string
  subtitle?: string
  summary?: { label: string; value: string }[]
  sections: ReportSection[]
}): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(params.title, MARGIN, 18)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(110)
  doc.text(`${APP_NAME} — gerado em ${formatDateTime(new Date().toISOString())}`, MARGIN, 24)
  if (params.subtitle) doc.text(params.subtitle, MARGIN, 29)
  doc.setTextColor(20)

  let cursorY = params.subtitle ? 36 : 31

  if (params.summary?.length) {
    const columns = 4
    const colWidth = (pageWidth - MARGIN * 2) / columns
    params.summary.forEach((item, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      const x = MARGIN + col * colWidth
      const y = cursorY + row * 14
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(item.label.toUpperCase(), x, y)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(20)
      doc.text(item.value, x, y + 6)
      doc.setFont("helvetica", "normal")
    })
    const rowsUsed = Math.ceil(params.summary.length / columns)
    cursorY += rowsUsed * 14 + 6
  }

  for (const section of params.sections) {
    if (section.heading) {
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text(section.heading, MARGIN, cursorY)
      doc.setFont("helvetica", "normal")
      cursorY += 5
    }
    autoTable(doc, {
      head: [section.head],
      body: section.rows,
      startY: cursorY,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [33, 128, 199] },
      theme: "striped",
    })
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  return doc
}

export function downloadReport(doc: jsPDF, filename: string): void {
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
}