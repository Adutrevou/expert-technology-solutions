const MAX_SIGNATURE_HTML_BYTES = 256 * 1024;
const MAX_SIGNATURE_IMAGE_BYTES = 1024 * 1024;
const SIGNATURE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function readSignatureHtmlFile(file: File): Promise<string> {
  const isHtml = /\.html?$/i.test(file.name) || file.type === "text/html";
  if (!isHtml) {
    throw new Error("Choose an HTML signature file ending in .html or .htm.");
  }
  if (file.size > MAX_SIGNATURE_HTML_BYTES) {
    throw new Error("The HTML signature file must be smaller than 256KB.");
  }

  const html = (await file.text()).trim();
  if (!html) {
    throw new Error("The HTML signature file is empty.");
  }
  return html;
}

export function isSignatureImageFile(file: File): boolean {
  return SIGNATURE_IMAGE_TYPES.has(file.type.toLowerCase());
}

export function validateSignatureImageFile(file: File): void {
  if (!isSignatureImageFile(file)) {
    throw new Error("Choose an HTML, PNG, JPG, or WebP signature file.");
  }
  if (file.size > MAX_SIGNATURE_IMAGE_BYTES) {
    throw new Error("The signature image must be smaller than 1MB.");
  }
}

export function buildSignatureImageHtml(fileUrl: string, altText = "Email signature"): string {
  const escapedUrl = fileUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const escapedAlt = altText.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<img src="${escapedUrl}" alt="${escapedAlt}" style="display:block;width:100%;max-width:480px;height:auto;border:0" />`;
}

export function getSignatureImageUrl(signature: string | null | undefined): string {
  const match = String(signature || "").match(/<img\b[^>]*\bsrc=["'](https:\/\/[^"']+)["']/i);
  return match?.[1]?.replace(/&amp;/g, "&") || "";
}
