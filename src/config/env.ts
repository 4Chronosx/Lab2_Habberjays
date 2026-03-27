import dotenv from "dotenv";

dotenv.config();

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ""));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

const parsedPort = Number.parseInt(process.env.PORT || "8000", 10);
const port = Number.isFinite(parsedPort) ? parsedPort : 8000;

const localApiUrl = `http://localhost:${port}`;
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5500").replace(
  /\/+$/,
  "",
);
const liveUrl = (process.env.LIVE_URL || "").replace(/\/+$/, "");
const apiBaseUrl = (
  process.env.API_BASE_URL || (isProduction ? liveUrl || localApiUrl : localApiUrl)
).replace(/\/+$/, "");

const configuredOrigins = parseCsv(process.env.CORS_ORIGINS);
const fallbackOrigins = isProduction
  ? [frontendUrl, apiBaseUrl]
  : [
      `http://localhost:${port}`,
      "http://localhost:5500",
      "http://localhost:5501",
      frontendUrl,
      apiBaseUrl,
    ];

export const env = {
  nodeEnv,
  isProduction,
  port,
  frontendUrl,
  liveUrl,
  apiBaseUrl,
  swaggerServerUrl: (process.env.SWAGGER_SERVER_URL || apiBaseUrl).replace(/\/+$/, ""),
  corsOrigins: unique(configuredOrigins.length > 0 ? configuredOrigins : fallbackOrigins),
  databaseUrl: process.env.DATABASE_URL,
  pgSsl: parseBoolean(process.env.PG_SSL, isProduction),
  pgSslRejectUnauthorized: parseBoolean(process.env.PG_SSL_REJECT_UNAUTHORIZED, false),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "",
};
