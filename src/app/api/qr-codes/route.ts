import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

// A beautiful mockup SVG representing a default QR code to write when the folder is empty
const DEFAULT_QR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="qr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="16" fill="#0f172a"/>
  <!-- Outer Finder Pattern Top-Left -->
  <rect x="12" y="12" width="22" height="22" rx="4" fill="url(#qr-grad)" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="16" y="16" width="14" height="14" rx="2" fill="#0f172a"/>
  <rect x="19" y="19" width="8" height="8" rx="1" fill="url(#qr-grad)"/>
  
  <!-- Outer Finder Pattern Top-Right -->
  <rect x="66" y="12" width="22" height="22" rx="4" fill="url(#qr-grad)" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="70" y="16" width="14" height="14" rx="2" fill="#0f172a"/>
  <rect x="73" y="19" width="8" height="8" rx="1" fill="url(#qr-grad)"/>
  
  <!-- Outer Finder Pattern Bottom-Left -->
  <rect x="12" y="66" width="22" height="22" rx="4" fill="url(#qr-grad)" stroke="#1e293b" stroke-width="1.5"/>
  <rect x="16" y="70" width="14" height="14" rx="2" fill="#0f172a"/>
  <rect x="19" y="73" width="8" height="8" rx="1" fill="url(#qr-grad)"/>
  
  <!-- Random mock modules (dots) -->
  <rect x="40" y="12" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="48" y="12" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="56" y="12" width="5" height="5" rx="1" fill="#38bdf8"/>
  
  <rect x="40" y="20" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="48" y="20" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="56" y="20" width="5" height="5" rx="1" fill="#2dd4bf"/>
  
  <rect x="40" y="28" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="48" y="28" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="56" y="28" width="5" height="5" rx="1" fill="#38bdf8"/>
  
  <rect x="12" y="40" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="20" y="40" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="28" y="40" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="36" y="40" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="44" y="40" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="52" y="40" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="60" y="40" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="68" y="40" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="76" y="40" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="84" y="40" width="5" height="5" rx="1" fill="#2dd4bf"/>
  
  <rect x="12" y="48" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="20" y="48" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="28" y="48" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="36" y="48" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="44" y="48" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="52" y="48" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="60" y="48" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="68" y="48" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="76" y="48" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="84" y="48" width="5" height="5" rx="1" fill="#38bdf8"/>

  <rect x="12" y="56" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="20" y="56" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="28" y="56" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="36" y="56" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="44" y="56" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="52" y="56" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="60" y="56" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="68" y="56" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="76" y="56" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="84" y="56" width="5" height="5" rx="1" fill="#2dd4bf"/>

  <rect x="40" y="66" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="48" y="66" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="56" y="66" width="5" height="5" rx="1" fill="#2dd4bf"/>

  <rect x="40" y="74" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="48" y="74" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="56" y="74" width="5" height="5" rx="1" fill="#38bdf8"/>

  <rect x="40" y="82" width="5" height="5" rx="1" fill="#2dd4bf"/>
  <rect x="48" y="82" width="5" height="5" rx="1" fill="#38bdf8"/>
  <rect x="56" y="82" width="5" height="5" rx="1" fill="#2dd4bf"/>
</svg>`;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dirPath = path.join(process.cwd(), "public", "assets", "images");

    // Ensure the folder exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    let files = fs.readdirSync(dirPath);
    
    // Filter for image files
    let images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp"].includes(ext);
    });

    // If empty, write the default mock QR code
    if (images.length === 0) {
      const defaultFile = "default-qr.svg";
      const filePath = path.join(dirPath, defaultFile);
      fs.writeFileSync(filePath, DEFAULT_QR_SVG, "utf-8");
      images = [defaultFile];
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Failed to load QR code images:", error);
    return NextResponse.json({ error: "Unable to load QR codes" }, { status: 500 });
  }
}
