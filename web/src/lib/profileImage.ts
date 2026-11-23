export interface DriveImageLink {
  shareUrl: string;
  imageUrl: string;
}

export function parseDriveImageLink(value: string): DriveImageLink | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== "drive.google.com") return null;

    const pathMatch = url.pathname.match(/\/file\/d\/([\w-]+)/);
    const fileId = pathMatch?.[1] ?? url.searchParams.get("id");
    if (!fileId || !/^[\w-]{10,200}$/.test(fileId)) return null;

    return {
      shareUrl: `https://drive.google.com/file/d/${fileId}/view`,
      imageUrl: `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w512`,
    };
  } catch {
    return null;
  }
}
