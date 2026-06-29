import type { Identity } from "@arkham-build/shared";
import type { ReactNode } from "react";
import { SteamIcon } from "@/components/icons/steam-icon";

export type OAuthProviderId = Extract<
  Identity,
  { canDisconnect: boolean }
>["provider"];

type BaseOAuthProviderConfig = {
  connectHelpKey: string;
  connectPath: string;
  icon(className?: string): ReactNode;
  provider: OAuthProviderId;
};

export type LoginOAuthProviderConfig = BaseOAuthProviderConfig & {
  canLogin: true;
  loginLabelKey: string;
  loginPath: string;
  signupLabelKey: string;
  signupPath: string;
};

export type OAuthProviderConfig =
  | LoginOAuthProviderConfig
  | (BaseOAuthProviderConfig & { canLogin: false });

export const OAUTH_PROVIDER_CONFIGS: OAuthProviderConfig[] = [
  {
    canLogin: true,
    connectHelpKey: "settings.account.oauth.connect_help",
    connectPath: "/auth/arkhamdb/connect",
    icon: () => <i className="icon-elder_sign" />,
    loginLabelKey: "auth.login.with_arkhamdb",
    loginPath: "/auth/arkhamdb/login",
    provider: "arkhamdb",
    signupLabelKey: "auth.signup.with_arkhamdb",
    signupPath: "/auth/arkhamdb/signup",
  },
  {
    canLogin: false,
    connectHelpKey: "settings.account.oauth.connect_help_steam",
    connectPath: "/auth/steam/connect",
    icon: (className) => <SteamIcon className={className} />,
    provider: "steam",
  },
];

export const LOGIN_OAUTH_PROVIDER_CONFIGS = OAUTH_PROVIDER_CONFIGS.filter(
  (config): config is LoginOAuthProviderConfig => config.canLogin,
);
