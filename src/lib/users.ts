import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sign } from "hono/jwt";

const JWT_ACCESS_SECRET = (process.env.JWT_ACCESS_SECRET as string) || "access";
const JWT_REFRESH_SECRET =
  (process.env.JWT_REFRESH_SECRET as string) || "refresh";

interface Props {
  s3: S3Client;
  file: File;
  filename: string;
  fileType: string;
  folder: string;
  bucketName: string;
  extension: string;
}
//  Upload Avatar to S3
const uploadAvatar = async ({
  s3,
  file,
  filename,
  fileType = "image/jpeg",
  folder = "avatars",
  bucketName,
  extension = "webp",
}: Props) => {
  try {
    const arrayBuffer = await file.arrayBuffer(); // Convert file to Buffer
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${folder}/${filename}.${extension}`, // Save inside an 'uploads/avatars' folder
      ContentType: fileType,
      Body: buffer,
    });

    await s3.send(command);
  } catch (error: any) {
    throw new Error(error);
  }
};

//  Generate Access Key for the access to the s3 bucket
const generateS3AccessKey = async ({
  filename,
  s3,
}: {
  filename: string;
  s3: S3Client;
}) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/avatars/${filename}`,
    });

    return await getSignedUrl(s3, command, { expiresIn: 60 * 60 * 24 * 7 }); // Expiry set to 7 days
    // return await getSignedUrl(s3, command, { expiresIn: 60 * 1 }); // One minuit for testing.
  } catch (error: any) {
    throw new Error(error);
  }
};

const extractFilename = (url: string) => {
  const match = url.match(/uploads\/avatars\/([^?]+)/);
  return match ? match[1] : null;
};

//  Generate Access Token
const generateAccessToken = async ({
  account,
  expMinutes = 5,
}: {
  account: {
    id: string;
    role: "super_admin" | "admin" | "manager" | "customer";
    identifier: string;
  };
  expMinutes?: number;
}) => {
  const token = await sign(
    {
      ...account,
      exp: Math.floor(Date.now() / 1000) + 60 * expMinutes,
    },
    JWT_ACCESS_SECRET
  );

  if (!token) {
    throw new Error("Token generated failed");
  }

  return token;
};

//  Generate Refresh Token
const generateRefreshToken = async ({
  account,
  expDays = 7,
}: {
  account: {
    id: string;
    role: "super_admin" | "admin" | "manager" | "customer";
    identifier: string;
  };
  expDays?: number;
}) => {
  const token = await sign(
    {
      ...account,
      // exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * expDays,
      exp: Math.floor(Date.now() / 1000) + 60,
    },
    JWT_REFRESH_SECRET
  );

  if (!token) {
    throw new Error("Token generated failed");
  }
  return token;
};

export {
  uploadAvatar,
  generateS3AccessKey,
  generateAccessToken,
  generateRefreshToken,
  extractFilename,
};
