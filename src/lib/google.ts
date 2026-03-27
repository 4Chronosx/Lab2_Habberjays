import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";

export const google = new OAuth2Client(env.googleClientId);