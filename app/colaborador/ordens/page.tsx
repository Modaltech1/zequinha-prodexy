import { OrdersPage } from '@/components/orders-page'

export default function Page() {
  return (
    <OrdersPage
      title="Minhas Ordens de Serviço"
      description="Crie e acompanhe as ordens de serviço da operação."
      collaboratorMode
    />
  )
}
