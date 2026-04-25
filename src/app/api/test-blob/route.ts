import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const content = `HomeCheff Motion Blob test - ${new Date().toISOString()}\n`;
    const filename = `test/homecheff-motion-${Date.now()}.txt`;

    const blob = await put(filename, content, {
      access: "public",
      contentType: "text/plain; charset=utf-8",
      addRandomSuffix: true,
    });

    return NextResponse.json(
      {
        message: "Blob upload successful",
        url: blob.url,
        pathname: blob.pathname,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Blob upload failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
