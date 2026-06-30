import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { Parser as CsvParser } from "json2csv";
import type { EventAnalytics } from "@tribastion/shared";

export const exportService = {
  toCsv(analytics: EventAnalytics): string {
    const parser = new CsvParser({
      fields: ["rank", "username", "participantId", "score"],
    });
    return parser.parse(analytics.finalRankings);
  },

  async toXlsx(analytics: EventAnalytics): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Tribastion Quiz Platform";

    const rankingsSheet = workbook.addWorksheet("Final Rankings");
    rankingsSheet.columns = [
      { header: "Rank", key: "rank", width: 10 },
      { header: "Username", key: "username", width: 30 },
      { header: "Participant ID", key: "participantId", width: 30 },
      { header: "Score", key: "score", width: 12 },
    ];
    rankingsSheet.addRows(analytics.finalRankings);

    const questionsSheet = workbook.addWorksheet("Question Performance");
    questionsSheet.columns = [
      { header: "Prompt", key: "prompt", width: 50 },
      { header: "Total Responses", key: "totalResponses", width: 16 },
      { header: "Correct", key: "correctCount", width: 12 },
      { header: "Incorrect", key: "incorrectCount", width: 12 },
      { header: "Skipped", key: "skippedCount", width: 12 },
      { header: "Avg Response Time (ms)", key: "averageResponseTimeMs", width: 20 },
    ];
    questionsSheet.addRows(analytics.questions);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },

  async toPdf(analytics: EventAnalytics): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).fillColor("#EC008C").text(analytics.quizTitle, { align: "left" });
      doc.fontSize(10).fillColor("#333333").text(`Event ID: ${analytics.eventId}`);
      if (analytics.startedAt) doc.text(`Started: ${analytics.startedAt}`);
      if (analytics.endedAt) doc.text(`Ended: ${analytics.endedAt}`);
      doc.moveDown();

      doc.fontSize(14).fillColor("#000000").text("Participation");
      doc.fontSize(10).text(`Joined: ${analytics.participation.totalJoined}`);
      doc.text(`Completed: ${analytics.participation.totalCompleted}`);
      doc.moveDown();

      doc.fontSize(14).text("Final Rankings");
      doc.fontSize(10);
      for (const entry of analytics.finalRankings.slice(0, 25)) {
        doc.text(`${entry.rank}. ${entry.username} — ${entry.score} pts`);
      }
      doc.moveDown();

      doc.fontSize(14).text("Question Performance");
      doc.fontSize(10);
      for (const q of analytics.questions) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text(q.prompt);
        doc
          .font("Helvetica")
          .text(
            `Responses: ${q.totalResponses}  Correct: ${q.correctCount}  Incorrect: ${q.incorrectCount}  Avg time: ${q.averageResponseTimeMs}ms`,
          );
      }

      doc.end();
    });
  },
};
