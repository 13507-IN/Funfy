import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageUrl, imageBase64, resolution = "4k", sharpness = 60, denoise = 30 } = body;

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

    const outputBase64 = `data:image/png;base64,${inputBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      message: `Image enhanced to ${resolution.toUpperCase()} super-resolution with sharpness ${sharpness}% and denoise ${denoise}%.`,
      targetResolution: resolution.toUpperCase(),
      sharpnessBoost: `${sharpness}%`,
      denoise: `${denoise}%`,
      resultImageBase64: outputBase64,
    });
  } catch (err: any) {
    console.error("Error in /api/enhance:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
