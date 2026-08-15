import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text = "Funfy Sticker", font = "Arial", color = "#f43f5e", shape = "die-cut" } = body;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <rect x="20" y="20" width="360" height="360" rx="40" fill="#ffffff" stroke="${color}" stroke-width="12"/>
        <text x="200" y="215" font-family="${font}, sans-serif" font-size="36" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle">${text}</text>
      </g>
    </svg>`;

    const svgBase64 = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

    return NextResponse.json({
      success: true,
      message: `Custom ${shape} sticker generated for text '${text}'.`,
      stickerSpec: {
        text,
        font,
        color,
        shape,
      },
      resultImageBase64: svgBase64,
    });
  } catch (err: any) {
    console.error("Error in /api/sticker-generate:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
