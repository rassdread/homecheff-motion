import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export function serveHomeCheffBrandPng(publicRelativePath: string): NextResponse {
  const body = readFileSync(
    join(process.cwd(), "public", publicRelativePath.replace(/^\//, ""))
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
