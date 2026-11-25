import { z } from "zod";
import { createSubmissionSchema, gradeSubmissionSchema } from "./submissions.schemas";

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
