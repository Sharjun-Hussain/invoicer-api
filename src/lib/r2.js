import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

export const uploadToR2 = async (fileBuffer, fileName, contentType) => {
    try {
        const bucketName = process.env.R2_BUCKET_NAME;
        const publicUrl = process.env.R2_PUBLIC_URL;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await s3Client.send(command);

        // Return the full public URL for the uploaded file
        return `${publicUrl}/${fileName}`;
    } catch (error) {
        console.error("R2 Upload Error:", error);
        throw new Error("Failed to upload image to Cloudflare R2");
    }
};
