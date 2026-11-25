import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as filesService from "./files.service";

export async function upload(req: Request, res: Response): Promise<void> {
  const file = await filesService.uploadFile(req.file, req.user!);
  sendSuccess(res, { file }, 201);
}

export async function streamFile(req: Request, res: Response): Promise<void> {
  const { stream, originalName, mimeType, sizeBytes } =
    await filesService.getAuthorizedFileStream(req.params.id!, req.user!);

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Length", String(sizeBytes));
  res.setHeader("Content-Disposition", `inline; filename="${originalName}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");

  stream.pipe(res);
}

export async function attachMaterial(req: Request, res: Response): Promise<void> {
  const material = await filesService.attachCourseMaterial(
    req.params.courseId!,
    req.user!,
    req.body
  );
  sendSuccess(res, { material }, 201);
}

export async function deleteMaterial(req: Request, res: Response): Promise<void> {
  await filesService.removeCourseMaterial(req.params.courseId!, req.params.materialId!, req.user!);
  sendSuccess(res, { deleted: true });
}
