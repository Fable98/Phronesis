import { z } from "zod";
import { createEnrollmentSchema, listEnrollmentsQuerySchema } from "./enrollments.schemas";

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;
