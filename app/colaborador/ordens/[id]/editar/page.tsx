import { OrderEditorPage } from '@/components/order-editor-page'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OrderEditorPage orderId={id} collaboratorMode />
}
