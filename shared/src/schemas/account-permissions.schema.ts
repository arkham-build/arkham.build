import { z } from "zod";

export const ACCOUNT_PERMISSIONS = {
  SCANS_DOWNLOAD: "scans:download",
} as const;

export type AccountPermission =
  (typeof ACCOUNT_PERMISSIONS)[keyof typeof ACCOUNT_PERMISSIONS];
export type AccountPermissions = AccountPermission[];

export const AccountPermissionSchema: z.ZodType<AccountPermission> = z.literal(
  Object.values(ACCOUNT_PERMISSIONS),
);
export const AccountPermissionsSchema: z.ZodType<AccountPermissions> = z
  .array(z.string())
  .transform((permissions) =>
    permissions.flatMap((permission) => {
      const result = AccountPermissionSchema.safeParse(permission);
      return result.success ? [result.data] : [];
    }),
  );
