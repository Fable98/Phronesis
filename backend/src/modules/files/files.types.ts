import { z } from "zod";
import { attachCourseMaterialSchema } from "./files.schemas";

export type AttachCourseMaterialInput = z.infer<typeof attachCourseMaterialSchema>;

export interface UploadedFileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}
