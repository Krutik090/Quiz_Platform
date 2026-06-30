import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

interface ValidationTargets {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/** Parses and replaces req.body/query/params with the Zod-validated (and coerced/defaulted) result. */
export function validate(targets: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (targets.body) req.body = targets.body.parse(req.body);
      if (targets.query) req.query = targets.query.parse(req.query);
      if (targets.params) req.params = targets.params.parse(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}
