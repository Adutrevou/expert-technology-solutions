const MAX_SIGNATURE_HTML_BYTES = 256 * 1024;

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
