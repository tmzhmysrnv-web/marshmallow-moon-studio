import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Use PNG, JPEG, WEBP, or GIF.` },
        { status: 400 }
      );
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 5MB." },
        { status: 400 }
      );
    }

    // Check Blob token is configured
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN not configured. Add it in Vercel environment variables." },
        { status: 500 }
      );
    }

    // Upload to Vercel Blob
    const ext = file.name.split(".").pop() || "png";
    const filename = `characters/${uuid()}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
      token,
    });

    console.log("✓ Reference image uploaded:", blob.url);

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
