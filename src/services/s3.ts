import { s3 } from "./../config/S3";
import { generateS3AccessKey } from "../lib";

export const reGenerateS3AccessKey = async (oldUrl: string) => {
  // Create new URL
  const url = new URL(oldUrl);

  // Extract filename
  const key = url.pathname.substring(url.pathname.lastIndexOf("/") + 1);

  console.warn(`Signed URL expired or invalid. Regenerating for: ${key}`);

  // Generate new signed URL and return
  return await generateS3AccessKey({ key, s3 });
};
