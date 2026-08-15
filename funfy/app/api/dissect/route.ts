import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageUrl, imageBase64, sensitivity = 50 } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { success: false, error: "Either 'imageUrl' or 'imageBase64' must be provided." },
        { status: 400 }
      );
    }

    let inputBuffer: Buffer;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      inputBuffer = Buffer.from(cleanBase64, "base64");
    } else {
      const res = await fetch(imageUrl);
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch image from URL: ${res.statusText}` },
          { status: 400 }
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    }

    const base64Str = `data:image/png;base64,${inputBuffer.toString("base64")}`;

    // Return mock layer components extracted from the image
    const components = [
      {
        id: "comp_1",
        label: "Foreground Main Object",
        resultImageBase64: base64Str,
      },
      {
        id: "comp_2",
        label: "Secondary Badge Element",
        resultImageBase64: base64Str,
      }
    ];

    return NextResponse.json({
      success: true,
      message: `Image dissected into ${components.length} sticker components at sensitivity ${sensitivity}%.`,
      sensitivity: `${sensitivity}%`,
      componentsCount: components.length,
      components,
    });
  } catch (err: any) {
    console.error("Error in /api/dissect:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
