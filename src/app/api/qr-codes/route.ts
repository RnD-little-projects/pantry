import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dirPath = path.join(process.cwd(), "public", "assets", "images");

    // No folder means no QR codes uploaded yet; the modal shows its empty state
    const files = fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];

    // Filter for image files
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp"].includes(ext);
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Failed to load QR code images:", error);
    return NextResponse.json({ error: "Unable to load QR codes" }, { status: 500 });
  }
}
