// app/api/delete-image/route.ts
import { NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3, S3_BUCKET_NAME } from '@/lib/s3'

export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const key = body?.key as string | undefined

        if (!key) {
            return NextResponse.json({ error: 'Chave do arquivo não informada.' }, { status: 400 })
        }

        await s3.send(
            new DeleteObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: key,
            })
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erro ao excluir imagem do S3:', error)
        return NextResponse.json({ error: 'Erro ao excluir imagem do S3.' }, { status: 500 })
    }
}