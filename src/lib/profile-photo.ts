export function getDriveImageUrl(link: string): string | null {
  if (!link.trim()) return null;

  try {
    const url = new URL(link.trim());
    const allowedHosts = new Set(["drive.google.com", "www.drive.google.com", "docs.google.com"]);
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) return null;

    const fileId = url.pathname.match(/\/(?:file\/)?d\/([^/]+)/)?.[1] || url.searchParams.get("id");
    if (!fileId || !/^[A-Za-z0-9_-]{10,}$/.test(fileId)) return null;

    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w512`;
  } catch {
    return null;
  }
}
