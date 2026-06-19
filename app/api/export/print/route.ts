import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { printExports, stories, illustrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

// GET /api/export/print — list exports
export async function GET() {
  const db = getDb();
  const all = db.select().from(printExports).all();
  return NextResponse.json(all);
}

// POST /api/export/print — generate print-ready PDF
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storyId, trimWidth, trimHeight, bleedMm, includeCover } = body;

    if (!storyId) {
      return NextResponse.json({ error: "storyId required" }, { status: 400 });
    }

    const db = getDb();
    const story = db.select().from(stories).where(eq(stories.id, storyId)).get();
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const illData = db
      .select()
      .from(illustrations)
      .where(eq(illustrations.storyId, storyId))
      .all()
      .sort((a: any, b: any) => a.order - b.order);

    const trimW = trimWidth || 8.5;
    const trimH = trimHeight || 8.5;
    const bleed = bleedMm || 3;

    // Build HTML for print
    const html = buildPrintHtml({
      title: story.title,
      scenes: illData.map((ill: any, i: number) => ({
        pageNumber: ill.pageNumber,
        imagePath: ill.imagePath,
      })),
      trimWidth: trimW,
      trimHeight: trimH,
      bleedMm: bleed,
    });

    // Save HTML (PDF generation via Puppeteer would go here in production)
    const exportDir = path.resolve("data", "print");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const htmlPath = path.join(exportDir, `${uuid()}.html`);
    fs.writeFileSync(htmlPath, html);

    const exportId = uuid();
    const printExport = {
      id: exportId,
      storyId,
      pdfPath: `/data/print/${path.basename(htmlPath)}`,
      settings: {
        trimWidth: trimW,
        trimHeight: trimH,
        bleedMm: bleed,
        pageCount: illData.length,
        includeCover: includeCover ?? true,
      },
      status: "draft",
    };

    db.insert(printExports).values(printExport).run();

    const created = db.select().from(printExports).where(eq(printExports.id, exportId)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Print export error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildPrintHtml(params: {
  title: string;
  scenes: { pageNumber: number; imagePath: string }[];
  trimWidth: number;
  trimHeight: number;
  bleedMm: number;
}): string {
  const bleedIn = params.bleedMm / 25.4;
  const pageWidth = params.trimWidth + bleedIn * 2;
  const pageHeight = params.trimHeight + bleedIn * 2;

  const pages = params.scenes
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map(
      (scene) => /* html */ `
    <div class="page">
      <div class="bleed">
        <img src="${scene.imagePath}" alt="Page ${scene.pageNumber}" />
      </div>
      <div class="page-number">${scene.pageNumber}</div>
    </div>`
    )
    .join("\n");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${params.title} — Print Ready</title>
  <style>
    @page {
      size: ${pageWidth}in ${pageHeight}in;
      margin: 0;
      bleed: ${bleedIn}in;
      marks: crop cross;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; }
    .page {
      width: ${pageWidth}in;
      height: ${pageHeight}in;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      background: #0f172a;
    }
    .bleed {
      position: absolute;
      inset: ${bleedIn}in;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bleed img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .page-number {
      position: absolute;
      bottom: ${bleedIn + 0.3}in;
      right: ${bleedIn + 0.3}in;
      font-size: 10pt;
      color: rgba(255,255,255,0.3);
    }
    .cover { page: cover; }
  </style>
</head>
<body>${pages}</body>
</html>`;
}
