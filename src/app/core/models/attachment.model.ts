export interface Attachment {
  id: string;          // UUID
  name: string;        // e.g. "screenshot.png"
  mimeType: string;    // e.g. "image/png"
  size: number;        // size in bytes
  data: Blob | ArrayBuffer; // Binary content
  createdAt: number;
}
