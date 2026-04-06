import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from './error-handler';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(messages.join(', '));
    }
    req[source] = result.data;
    next();
  };
}
