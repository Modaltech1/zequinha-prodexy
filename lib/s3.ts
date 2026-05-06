import { S3Client } from '@aws-sdk/client-s3'

const S3_REGION = process.env.AWS_REGION || 'us-east-1'

export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || ''

const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

export const s3 = new S3Client({
    region: S3_REGION,
    ...(accessKeyId && secretAccessKey
        ? {
              credentials: {
                  accessKeyId,
                  secretAccessKey,
              },
          }
        : {}),
})

export function getS3PublicUrl(key: string) {
    if (!S3_BUCKET_NAME) {
        return key
    }

    return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${key}`
}
