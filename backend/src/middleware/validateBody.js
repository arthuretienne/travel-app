// Generic body validator. Pass a zod schema and the request body will be
// parsed and replaced with the parsed (typed) value, or the request rejected
// with a 400 listing the offending paths.
//
// Bound everything you care about (string lengths, numeric ranges, array
// sizes) — defence in depth against prompt injection and oversized payloads.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.slice(0, 10).map(i => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ error: 'Invalid request body', issues });
    }
    req.body = result.data;
    next();
  };
}
