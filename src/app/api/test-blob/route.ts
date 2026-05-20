import { NextResponse } from "next/server";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";

export async function POST() {
  try {
    const content = `HomeCheff Motion Blob test - ${new Date().toISOString()}\n`;
    const filename = `test/homecheff-motion-${Date.now()}.txt`;

    const blob = await uploadPublicBlob({
      pathname: filename,
      body: content,
      contentType: "text/plain; charset=utf-8",
      addRandomSuffix: true,
      context: { uploadTarget: filename, provider: "test-blob" },
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
