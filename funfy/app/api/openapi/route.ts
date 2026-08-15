import { NextResponse } from "next/server";
import openApiSpec from "@/public/openapi.json";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const host = req.headers.get("host") || url.host;
    const protocol = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
    const serverUrl = `${protocol}://${host}`;

    const dynamicSpec = {
      ...openApiSpec,
      servers: [
        {
          url: serverUrl,
          description: "Active Funfy Server Host",
        },
      ],
    };

    return NextResponse.json(dynamicSpec);
  } catch (err: any) {
    return NextResponse.json(openApiSpec);
  }
}
