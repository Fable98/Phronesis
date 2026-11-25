import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as modulesService from "./modules.service";

export async function listModules(req: Request, res: Response): Promise<void> {
  const modules = await modulesService.listCourseModules(req.params.courseId!, req.user);
  sendSuccess(res, { modules });
}

export async function createModule(req: Request, res: Response): Promise<void> {
  const mod = await modulesService.createModule(req.params.courseId!, req.user!, req.body);
  sendSuccess(res, { module: mod }, 201);
}

export async function updateModule(req: Request, res: Response): Promise<void> {
  const mod = await modulesService.updateModule(req.params.id!, req.user!, req.body);
  sendSuccess(res, { module: mod });
}

export async function reorderModules(req: Request, res: Response): Promise<void> {
  const modules = await modulesService.reorderModules(
    req.params.courseId!,
    req.user!,
    req.body.moduleIds
  );
  sendSuccess(res, { modules });
}

export async function deleteModule(req: Request, res: Response): Promise<void> {
  await modulesService.deleteModule(req.params.id!, req.user!);
  sendSuccess(res, { deleted: true });
}
