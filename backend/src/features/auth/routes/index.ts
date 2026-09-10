import { Hono } from "hono";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import emailAuthRoutes from "./email-auth.ts";
import identityManagementRoutes from "./identity-management.ts";
import oauthRoutes, {
  arkhamdbOAuthCallbackRoutes,
  arkhamdbOAuthRoutes,
} from "./oauth.ts";
import passwordRecoveryRoutes from "./password-recovery.ts";

const routes = new Hono<HonoEnv>();

routes.route("/", emailAuthRoutes);
routes.route("/", identityManagementRoutes);
routes.route("/", passwordRecoveryRoutes);
routes.route("/", oauthRoutes);

export default routes;

export { arkhamdbOAuthCallbackRoutes, arkhamdbOAuthRoutes };
