import "server-only";
import PDFDocument from "pdfkit";
import { AlignmentType, Document, Footer, HeadingLevel, Packer, PageBreak, PageNumber, Paragraph, TextRun } from "docx";
import { formatFundingAmount, type ProposalDocumentData } from "@/lib/proposal-document";

const PDF_MARGIN = 64;

export async function renderProposalPdf(data: ProposalDocumentData) {
  const french = data.metadata.locale === "fr";
  const document = new PDFDocument({ size: "A4", margins: { top: PDF_MARGIN, right: PDF_MARGIN, bottom: 72, left: PDF_MARGIN }, bufferPages: true, info: { Title: data.metadata.title, Author: data.metadata.applicantDisplayName || "Proposal applicant" } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => { document.on("end", () => resolve(Buffer.concat(chunks))); document.on("error", reject); });
  document.fillColor("#1d2a24").font("Helvetica-Bold").fontSize(23).text(data.metadata.title, { align: "left" });
  document.moveDown(1.4).strokeColor("#34785b").lineWidth(1.5).moveTo(PDF_MARGIN, document.y).lineTo(210 * 2.83465 - PDF_MARGIN, document.y).stroke();
  const coverRows = [[french ? "PRÉPARÉ PAR" : "PREPARED BY", data.metadata.applicantDisplayName], [french ? "PRÉPARÉ POUR" : "PREPARED FOR", data.metadata.fundingOrganization], [french ? "OPPORTUNITÉ DE FINANCEMENT" : "FUNDING OPPORTUNITY", data.metadata.opportunityTitle], [french ? "LIEU DU PROJET" : "PROJECT LOCATION", data.metadata.projectLocation], [french ? "DURÉE DU PROJET" : "PROJECT DURATION", data.metadata.projectDuration], [french ? "FINANCEMENT DEMANDÉ" : "FUNDING REQUESTED", formatFundingAmount(data.metadata.amountRequested, data.metadata.currency, data.metadata.locale)], ["DATE", data.metadata.preparedOn]].filter(([, value]) => Boolean(value));
  for (const [label, value] of coverRows) { document.moveDown(1.25).font("Helvetica").fontSize(10).fillColor("#5b655f").text(label, { characterSpacing: 1.2 }); document.moveDown(0.3).font("Helvetica-Bold").fontSize(12).fillColor("#1d2a24").text(value); }
  if (data.metadata.status === "draft") document.moveDown(2).font("Helvetica-Oblique").fontSize(10).fillColor("#6b746f").text(french ? "Brouillon de proposition" : "Draft proposal");
  document.addPage();
  data.sections.forEach((section, index) => {
    const headingHeight = document.heightOfString(`${index + 1}. ${section.title}`, { width: document.page.width - PDF_MARGIN * 2 });
    const firstHeight = section.paragraphs[0] ? document.heightOfString(section.paragraphs[0], { width: document.page.width - PDF_MARGIN * 2, lineGap: 3 }) : 0;
    if (document.y + headingHeight + Math.min(firstHeight, 90) > document.page.height - 90) document.addPage();
    document.font("Helvetica-Bold").fontSize(14).fillColor("#1d2a24").text(`${index + 1}. ${section.title}`);
    document.moveDown(0.55);
    for (const paragraph of section.paragraphs) {
      document.font("Helvetica").fontSize(10.5).fillColor("#26312b").text(paragraph, { lineGap: 3, paragraphGap: 8, align: "left" });
    }
    document.moveDown(1.1);
  });
  const range = document.bufferedPageRange();
  for (let page = 1; page < range.count; page += 1) {
    document.switchToPage(page);
    const footerY = document.page.height - 44;
    document.font("Helvetica").fontSize(8.5).fillColor("#68716c").text(data.metadata.title.slice(0, 60), PDF_MARGIN, footerY, { width: document.page.width - PDF_MARGIN * 2 - 90, lineBreak: false });
    document.text(french ? `Page ${page} sur ${range.count - 1}` : `Page ${page} of ${range.count - 1}`, document.page.width - PDF_MARGIN - 90, footerY, { width: 90, align: "right", lineBreak: false });
  }
  document.end();
  return completed;
}

export async function renderProposalDocx(data: ProposalDocumentData) {
  const french = data.metadata.locale === "fr";
  const body: Paragraph[] = [
    new Paragraph({ text: data.metadata.title, heading: HeadingLevel.TITLE, spacing: { after: 720 } }),
    ...[[french ? "Préparé par" : "Prepared by", data.metadata.applicantDisplayName], [french ? "Préparé pour" : "Prepared for", data.metadata.fundingOrganization], [french ? "Opportunité de financement" : "Funding opportunity", data.metadata.opportunityTitle], [french ? "Lieu du projet" : "Project location", data.metadata.projectLocation], [french ? "Durée du projet" : "Project duration", data.metadata.projectDuration], [french ? "Financement demandé" : "Funding requested", formatFundingAmount(data.metadata.amountRequested, data.metadata.currency, data.metadata.locale)], ["Date", data.metadata.preparedOn]].filter(([, value]) => Boolean(value)).flatMap(([label, value]) => [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: "59645E", size: 20 })], spacing: { after: 100 } }), new Paragraph({ text: value, spacing: { after: 320 } })]),
    ...(data.metadata.status === "draft" ? [new Paragraph({ children: [new TextRun({ text: french ? "Brouillon de proposition" : "Draft proposal", italics: true, color: "68716C" })] })] : []),
    new Paragraph({ children: [new PageBreak()] }),
  ];
  data.sections.forEach((section, index) => {
    body.push(new Paragraph({ text: `${index + 1}. ${section.title}`, heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 240, after: 140 } }));
    for (const paragraph of section.paragraphs) body.push(new Paragraph({ text: paragraph, spacing: { after: 180, line: 330 } }));
  });
  const document = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22, color: "26312B" }, paragraph: { spacing: { line: 330 } } } }, paragraphStyles: [{ id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 44, bold: true, color: "1D2A24" }, paragraph: { spacing: { after: 360 } } }, { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 28, bold: true, color: "1D2A24" }, paragraph: { keepNext: true } }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1276, right: 1276, bottom: 1276, left: 1276 } } }, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${data.metadata.title.slice(0, 55)}  ·  `, color: "68716C", size: 18 }), new TextRun({ children: ["Page ", PageNumber.CURRENT, french ? " sur " : " of ", PageNumber.TOTAL_PAGES], color: "68716C", size: 18 })] })] }) }, children: body }],
  });
  return Packer.toBuffer(document);
}
