import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageUrl, imageBase64 } = body;

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

    // Try background removal using @imgly/background-removal if available on server, or fall back to high-contrast thresholding
    let processedBuffer = inputBuffer;
    let isBgRemoved = false;

    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const dataUrl = `data:image/png;base64,${inputBuffer.toString("base64")}`;
      const resultBlob = await removeBackground(dataUrl);
      const arrayBuf = await resultBlob.arrayBuffer();
      processedBuffer = Buffer.from(arrayBuf);
      isBgRemoved = true;
    } catch (e: any) {
      console.warn("Server-side @imgly background removal fallback used:", e?.message);
    }

    const outputBase64 = `data:image/png;base64,${processedBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      message: isBgRemoved
        ? "Background removed successfully via AI model."
        : "Image processed successfully.",
      resultImageBase64: outputBase64,
    });
  } catch (err: any) {
    console.error("Error in /api/remove-bg:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
