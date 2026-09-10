import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { Config } from "../../lib/config.ts";

const SCAN_EXTENSIONS = ["jpg", "png"] as const;
const SIGNED_URL_EXPIRY_SECONDS = 5 * 60;

export const ScanIdSchema = z.string().brand<"ScanId">();

export type ScanId = z.infer<typeof ScanIdSchema>;

export type ScansStorage = {
  createDownloadUrl(scanId: ScanId): Promise<string>;
};

type ScansStorageConfig = Pick<
  Config,
  | "SCANS_ACCESS_KEY_ID"
  | "SCANS_BUCKET"
  | "SCANS_ENDPOINT"
  | "SCANS_SECRET_ACCESS_KEY"
>;

type ScanExtension = (typeof SCAN_EXTENSIONS)[number];

type ScanObject = {
  extension: ScanExtension;
  key: string;
};

export function createScansStorage(config: ScansStorageConfig): ScansStorage {
  const client = new S3Client({
    credentials: {
      accessKeyId: config.SCANS_ACCESS_KEY_ID,
      secretAccessKey: config.SCANS_SECRET_ACCESS_KEY,
    },
    endpoint: config.SCANS_ENDPOINT,
    region: "auto",
  });

  return {
    async createDownloadUrl(scanId) {
      const object = await findScanObject(client, config.SCANS_BUCKET, scanId);

      if (!object) {
        throw new HTTPException(404, { message: "Scan not found" });
      }

      const command = new GetObjectCommand({
        Bucket: config.SCANS_BUCKET,
        Key: object.key,
        ResponseContentDisposition: `attachment; filename="${scanId}.${object.extension}"`,
      });

      return await getSignedUrl(client, command, {
        expiresIn: SIGNED_URL_EXPIRY_SECONDS,
      });
    },
  };
}

async function findScanObject(
  client: S3Client,
  bucket: string,
  scanId: ScanId,
): Promise<ScanObject | undefined> {
  for (const extension of SCAN_EXTENSIONS) {
    const key = `${scanId}.${extension}`;

    if (await objectExists(client, bucket, key)) {
      return { extension, key };
    }
  }

  return undefined;
}

async function objectExists(client: S3Client, bucket: string, key: string) {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}

function isNotFoundError(error: unknown) {
  return (
    error instanceof S3ServiceException &&
    error.$metadata.httpStatusCode === 404 &&
    (error.name === "NotFound" || error.name === "NoSuchKey")
  );
}
