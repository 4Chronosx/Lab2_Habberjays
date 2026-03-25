import rateLimit from "express-rate-limit";

function buildLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: message,
    },
  });
}

export const globalLimiter = buildLimiter(
  15 * 60 * 1000,
  100,
  "Too many requests, please try again later.",
);

export const authLimiter = buildLimiter(
  15 * 60 * 1000,
  10,
  "Too many authentication requests, please try again later.",
);
