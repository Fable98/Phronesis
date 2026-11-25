import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as usersService from "./users.service";
import { ListUsersQuery } from "./users.types";

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListUsersQuery;
  const { users, meta } = await usersService.listUsers(query);
  sendSuccess(res, { users }, 200, meta);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await usersService.getUserById(req.params.id!);
  sendSuccess(res, { user });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const user = await usersService.createUser(req.body);
  sendSuccess(res, { user }, 201);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const user = await usersService.updateUser(req.params.id!, req.body);
  sendSuccess(res, { user });
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const user = await usersService.updateUserRole(req.params.id!, req.body.role);
  sendSuccess(res, { user });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  await usersService.deleteUser(req.params.id!);
  sendSuccess(res, { deleted: true });
}
