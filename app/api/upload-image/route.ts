// app/api/update-image/route.ts
import { NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, S3_BUCKET_NAME, getS3PublicUrl } from '@/lib/s3'

export const runtime = 'nodejs'

function sanitizeFileName(fileName: string) {
    return fileName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase()
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const itemId = String(formData.get('itemId') || 'temp')
        const folder = String(formData.get('folder') || 'itens')

        if (!file) {
            return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const originalName = sanitizeFileName(file.name || 'imagem')
        const extension = originalName.includes('.') ? originalName.split('.').pop() : 'jpg'
        const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`

        await s3.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: file.type || 'application/octet-stream',
            })
        )

        return NextResponse.json({
            success: true,
            key,
            url: getS3PublicUrl(key),
        })
    } catch (error) {
        console.error('Erro no upload para S3:', error)
        return NextResponse.json({ error: 'Erro ao enviar imagem para o S3.' }, { status: 500 })
    }
}