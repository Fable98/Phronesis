import path from "path";

export interface AllowedFileType {
  mimeType: string;
  extension: string;
}

const EXECUTABLE_EXTENSIONS = new Set([
  "exe",
  "sh",
  "bat",
  "cmd",
  "msi",
  "com",
  "scr",
  "ps1",
  "js",
  "mjs",
  "cjs",
  "ts",
  "php",
  "py",
  "rb",
  "pl",
  "jar",
  "bin",
  "dll",
  "so",
  "dylib",
  "app",
  "vbs",
  "html",
  "htm",
  "svg"
]);

const ALLOWED_EXTENSION_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

export function validateFilenameSafety(originalName: string): { safeBasename: string; ext: string } {
  const basename = path.basename(originalName).trim();
  if (!basename || basename.startsWith(".")) {
    throw new Error("Invalid filename");
  }

  const parts = basename.split(".");
  if (parts.length !== 2) {
    throw new Error("Double extensions or extensionless files are not allowed");
  }

  const ext = `.${parts[1]!.toLowerCase()}`;
  const rawExt = parts[1]!.toLowerCase();
  if (EXECUTABLE_EXTENSIONS.has(rawExt)) {
    throw new Error("Executable files are not allowed");
  }

  if (!ALLOWED_EXTENSION_MAP[ext]) {
    throw new Error("Unsupported file extension. Allowed: PDF, PNG, JPEG");
  }

  const cleanBase = parts[0]!.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "file";
  return { safeBasename: `${cleanBase}${ext}`, ext };
}

export function detectMagicBytes(buffer: Buffer): AllowedFileType | null {
  if (buffer.length < 4) {
    return null;
  }

  // PDF: %PDF-
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { mimeType: "application/pdf", extension: "pdf" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  return null;
}
