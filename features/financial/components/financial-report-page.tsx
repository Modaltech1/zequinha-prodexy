'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prodexy/ui'
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  FilterX,
  Printer,
  RefreshCw,
  Search,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { AdminPage, AdminPageHeader } from '@/components/admin-page'
import tableStyles from '@/components/admin-data-table.module.css'
import { ListPagination } from '@/components/list-pagination'
import { getFinancialReport } from '@/features/financial/client/financial-api'
import {
  FINANCIAL_ORDER_STATUSES,
  FINANCIAL_STATUS_LABELS,
  UNASSIGNED_FILTER,
  type CustomerLaborSummary,
  type FinancialOrder,
  type FinancialReport,
  type FinancialReportFilters,
  type FinancialStatusFilter,
  type PartnerProductTransferSummary,
  type ProductSalesSummary,
  type ResponsibleLaborSummary,
} from '@/features/financial/domain/report'
import styles from './financial-report.module.css'

type PeriodPreset =
  | 'current-month'
  | 'previous-month'
  | 'last-30-days'
  | 'current-year'
  | 'all-time'
  | 'custom'

const ALL_FILTER = '__all'
const ORDER_PAGE_SIZE = 20
const LABOR_PAGE_SIZE = 12
const PRODUCT_PAGE_SIZE = 12
const PARTNER_PAGE_SIZE = 12

function toDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPresetRange(preset: PeriodPreset): Pick<FinancialReportFilters, 'startDate' | 'endDate'> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (preset === 'current-month') {
    return {
      startDate: toDateInput(new Date(year, month, 1)),
      endDate: toDateInput(new Date(year, month + 1, 0)),
    }
  }
  if (preset === 'previous-month') {
    return {
      startDate: toDateInput(new Date(year, month - 1, 1)),
      endDate: toDateInput(new Date(year, month, 0)),
    }
  }
  if (preset === 'last-30-days') {
    return {
      startDate: toDateInput(new Date(year, month, now.getDate() - 29)),
      endDate: toDateInput(now),
    }
  }
  if (preset === 'current-year') {
    return {
      startDate: toDateInput(new Date(year, 0, 1)),
      endDate: toDateInput(new Date(year, 11, 31)),
    }
  }
  if (preset === 'all-time') return { startDate: '', endDate: '' }
  return getPresetRange('current-month')
}

function initialFilters(): FinancialReportFilters {
  return {
    ...getPresetRange('current-month'),
    status: 'todos',
    customerId: '',
    responsibleId: '',
    paymentMethod: '',
    search: '',
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function formatQuantity(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatFilterDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function periodLabel(filters: FinancialReportFilters): string {
  if (!filters.startDate) return 'Todo o período'
  return `${formatFilterDate(filters.startDate)} a ${formatFilterDate(filters.endDate)}`
}

function statusClasses(status: FinancialOrder['status']): string {
  if (status === 'finalizada') return 'bg-emerald-100 text-emerald-800'
  if (status === 'cancelada') return 'bg-red-100 text-red-800'
  if (status === 'em_andamento') return 'bg-blue-100 text-blue-800'
  if (status === 'agendada') return 'bg-violet-100 text-violet-800'
  if (status === 'sem_status') return 'bg-slate-100 text-slate-700'
  return 'bg-amber-100 text-amber-800'
}

function MetricCard(props: {
  title: string
  value: string
  description: string
  icon: LucideIcon
}) {
  const Icon = props.icon
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{props.title}</p>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold leading-tight sm:text-2xl">{props.value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{props.description}</p>
      </CardContent>
    </Card>
  )
}

function FinancialBreakdown({ report }: { report: FinancialReport }) {
  const rows: Array<[string, number, boolean?]> = [
    ['Serviços vinculados', report.summary.serviceTotal],
    ['Produtos vinculados', report.summary.productTotal],
    ['Valor base das OS', report.summary.baseTotal],
    ['Mão de obra informada', report.summary.laborTotal],
    ['Acréscimos informados', report.summary.additionsTotal],
    ['Descontos informados', -report.summary.discountTotal],
    ['Valor final das OS', report.summary.finalTotal, true],
  ]

  return (
    <div className="space-y-2">
      {rows.map(([label, value, emphasized]) => (
        <div
          key={label}
          className={`flex items-center justify-between gap-4 border-b py-2 text-sm last:border-0 ${emphasized ? 'font-bold text-primary' : ''}`}
        >
          <span>{label}</span>
          <span className="whitespace-nowrap">{formatCurrency(value)}</span>
        </div>
      ))}
    </div>
  )
}

function LaborTable({ rows }: { rows: CustomerLaborSummary[] }) {
  return (
    <div className={tableStyles.tableScroller}>
      <table className={tableStyles.dataTable}>
        <thead><tr><th>Cliente</th><th className={tableStyles.numeric}>OS</th><th className={tableStyles.numeric}>Mão de obra</th><th className={tableStyles.numeric}>Valor final</th><th className={tableStyles.numeric}>Tíquete médio</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.customerId || row.customerName}>
              <td className="font-medium">{row.customerName}</td>
              <td className={tableStyles.numeric}>{row.orderCount}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.laborTotal)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.finalTotal)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.averageTicket)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResponsibleLaborTable({ rows }: { rows: ResponsibleLaborSummary[] }) {
  return (
    <div className={tableStyles.tableScroller}>
      <table className={tableStyles.dataTable}>
        <thead><tr><th>Responsável</th><th className={tableStyles.numeric}>OS</th><th className={tableStyles.numeric}>Mão de obra</th><th className={tableStyles.numeric}>Valor final</th><th className={tableStyles.numeric}>Tíquete médio</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.responsibleId || row.responsibleName}>
              <td className="font-medium">{row.responsibleName}</td>
              <td className={tableStyles.numeric}>{row.orderCount}</td>
              <td className={`${tableStyles.numeric} font-semibold`}>{formatCurrency(row.laborTotal)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.finalTotal)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.averageTicket)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProductSalesTable({ rows }: { rows: ProductSalesSummary[] }) {
  return (
    <div className={tableStyles.tableScroller}>
      <table className={`${tableStyles.dataTable} ${tableStyles.wideTable}`}>
        <thead><tr><th>Código</th><th>Produto</th><th className={tableStyles.numeric}>OS</th><th className={tableStyles.numeric}>Qtd.</th><th className={tableStyles.numeric}>Receita</th><th className={tableStyles.numeric}>Custo</th><th className={tableStyles.numeric}>Lucro</th><th className={tableStyles.numeric}>Repasse</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.productId}:${row.productCode || ''}`}>
              <td className="font-mono text-xs">{row.productCode || '-'}</td>
              <td className="font-medium">{row.productName}</td>
              <td className={tableStyles.numeric}>{row.orderCount}</td>
              <td className={tableStyles.numeric}>{formatQuantity(row.quantity)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.revenue)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.cost)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.profit)}</td>
              <td className={`${tableStyles.numeric} font-semibold`}>{row.isPartnerProduct ? formatCurrency(row.partnerTransfer) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PartnerTransferTable({ rows }: { rows: PartnerProductTransferSummary[] }) {
  return (
    <div className={tableStyles.tableScroller}>
      <table className={`${tableStyles.dataTable} ${tableStyles.wideTable}`}>
        <thead><tr><th>Código</th><th>Produto</th><th className={tableStyles.numeric}>OS</th><th className={tableStyles.numeric}>Qtd.</th><th className={tableStyles.numeric}>Venda</th><th className={tableStyles.numeric}>Custo</th><th className={tableStyles.numeric}>Lucro</th><th className={tableStyles.numeric}>80% custo</th><th className={tableStyles.numeric}>10% lucro</th><th className={tableStyles.numeric}>Repasse</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.productId}:${row.productCode}`}>
              <td className="font-mono text-xs font-semibold">{row.productCode}</td>
              <td className="font-medium">{row.productName}</td>
              <td className={tableStyles.numeric}>{row.orderCount}</td>
              <td className={tableStyles.numeric}>{formatQuantity(row.quantity)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.revenue)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.cost)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.profit)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.costShare)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(row.profitShare)}</td>
              <td className={`${tableStyles.numeric} font-bold text-primary`}>{formatCurrency(row.transferTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrdersTable({ orders }: { orders: FinancialOrder[] }) {
  return (
    <div className={tableStyles.tableScroller}>
      <table className={tableStyles.dataTable}>
        <thead><tr><th>Data / OS</th><th>Cliente / veículo</th><th>Itens</th><th>Situação</th><th>Responsável / pagamento</th><th className={tableStyles.numeric}>Base</th><th className={tableStyles.numeric}>Mão de obra</th><th className={tableStyles.numeric}>Final</th></tr></thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td><strong>{formatDate(order.createdAt)}</strong><br /><span className="text-muted-foreground">OS {order.number}</span></td>
              <td><strong>{order.customerName}</strong><br /><span className="text-muted-foreground">{order.vehicleLabel}</span></td>
              <td className="max-w-[320px] text-muted-foreground">{order.itemsLabel}</td>
              <td><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses(order.status)}`}>{FINANCIAL_STATUS_LABELS[order.status]}</span></td>
              <td><strong>{order.responsibleName}</strong><br /><span className="text-muted-foreground">{order.paymentMethod}</span></td>
              <td className={tableStyles.numeric}>{formatCurrency(order.baseTotal)}</td>
              <td className={tableStyles.numeric}>{formatCurrency(order.labor)}</td>
              <td className={`${tableStyles.numeric} font-semibold`}>{formatCurrency(order.finalTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PrintReport({ report }: { report: FinancialReport }) {
  const breakdown: Array<[string, number]> = [
    ['Serviços vinculados', report.summary.serviceTotal],
    ['Produtos vinculados', report.summary.productTotal],
    ['Valor base das OS', report.summary.baseTotal],
    ['Mão de obra', report.summary.laborTotal],
    ['Acréscimos', report.summary.additionsTotal],
    ['Descontos', -report.summary.discountTotal],
    ['Valor final', report.summary.finalTotal],
  ]

  return (
    <section className={styles.printOnly} aria-hidden="true">
      <header className={styles.printHeader}>
        <div className={styles.printBrand}>
          <Image src={report.company.logoUrl} alt="" width={54} height={54} unoptimized />
          <div><strong>{report.company.displayName}</strong><span>Relatório gerencial</span></div>
        </div>
        <div className={styles.printTitle}>
          <h1>Relatório financeiro</h1>
          <p>Período: {periodLabel(report.filters)} · Gerado em {formatDateTime(report.generatedAt)}</p>
        </div>
      </header>

      <div className={styles.printMetrics}>
        <div><span>Total de OS</span><strong>{report.summary.totalOrders}</strong></div>
        <div><span>Finalizadas</span><strong>{report.summary.finalizedOrders}</strong></div>
        <div><span>Em aberto</span><strong>{report.summary.openOrders}</strong></div>
        <div><span>Valor final</span><strong>{formatCurrency(report.summary.finalTotal)}</strong></div>
        <div><span>Tíquete médio</span><strong>{formatCurrency(report.summary.averageTicket)}</strong></div>
        <div><span>Mão de obra</span><strong>{formatCurrency(report.summary.laborTotal)}</strong></div>
      </div>

      <div className={styles.printColumns}>
        <section className={styles.printSection}>
          <h2>Distribuição por status</h2>
          <table><thead><tr><th>Status</th><th>OS</th><th>%</th><th>Valor final</th></tr></thead><tbody>
            {report.statusSummary.map((row) => <tr key={row.status}><td>{row.label}</td><td>{row.count}</td><td>{row.percentage.toFixed(1)}%</td><td>{formatCurrency(row.finalTotal)}</td></tr>)}
          </tbody></table>
        </section>
        <section className={styles.printSection}>
          <h2>Resumo financeiro</h2>
          <table><thead><tr><th>Componente</th><th>Valor</th></tr></thead><tbody>
            {breakdown.map(([label, value]) => <tr key={label}><td>{label}</td><td>{formatCurrency(value)}</td></tr>)}
          </tbody></table>
        </section>
      </div>

      <section className={styles.printSection}>
        <h2>Repasse da parceria PL0826</h2>
        <p className={styles.printCaption}>Somente OS finalizadas · 80% do custo histórico + 10% do lucro</p>
        <table><thead><tr><th>Código / produto</th><th>OS</th><th>Qtd.</th><th>Venda</th><th>Custo</th><th>Lucro</th><th>80% custo</th><th>10% lucro</th><th>Repasse</th></tr></thead><tbody>
          {report.partnerTransfer.products.length > 0
            ? report.partnerTransfer.products.map((row) => <tr key={`${row.productId}:${row.productCode}`}><td>{row.productCode}<br />{row.productName}</td><td>{row.orderCount}</td><td>{formatQuantity(row.quantity)}</td><td>{formatCurrency(row.revenue)}</td><td>{formatCurrency(row.cost)}</td><td>{formatCurrency(row.profit)}</td><td>{formatCurrency(row.costShare)}</td><td>{formatCurrency(row.profitShare)}</td><td>{formatCurrency(row.transferTotal)}</td></tr>)
            : <tr><td colSpan={9}>Nenhuma venda finalizada de produto parceiro no período.</td></tr>}
          <tr><th>Total</th><th>{report.partnerTransfer.eligibleOrderCount}</th><th>{formatQuantity(report.partnerTransfer.quantity)}</th><th>{formatCurrency(report.partnerTransfer.revenue)}</th><th>{formatCurrency(report.partnerTransfer.cost)}</th><th>{formatCurrency(report.partnerTransfer.profit)}</th><th>{formatCurrency(report.partnerTransfer.costShare)}</th><th>{formatCurrency(report.partnerTransfer.profitShare)}</th><th>{formatCurrency(report.partnerTransfer.transferTotal)}</th></tr>
        </tbody></table>
      </section>

      <section className={styles.printSection}>
        <h2>Mão de obra por cliente</h2>
        <table><thead><tr><th>Cliente</th><th>OS</th><th>Mão de obra</th><th>Valor final</th><th>Tíquete médio</th></tr></thead><tbody>
          {report.laborByCustomer.map((row) => <tr key={row.customerId || row.customerName}><td>{row.customerName}</td><td>{row.orderCount}</td><td>{formatCurrency(row.laborTotal)}</td><td>{formatCurrency(row.finalTotal)}</td><td>{formatCurrency(row.averageTicket)}</td></tr>)}
        </tbody></table>
      </section>

      <section className={styles.printSection}>
        <h2>Mão de obra por responsável</h2>
        <table><thead><tr><th>Responsável</th><th>OS</th><th>Mão de obra</th><th>Valor final</th><th>Tíquete médio</th></tr></thead><tbody>
          {report.laborByResponsible.map((row) => <tr key={row.responsibleId || row.responsibleName}><td>{row.responsibleName}</td><td>{row.orderCount}</td><td>{formatCurrency(row.laborTotal)}</td><td>{formatCurrency(row.finalTotal)}</td><td>{formatCurrency(row.averageTicket)}</td></tr>)}
        </tbody></table>
      </section>

      <section className={styles.printSection}>
        <h2>Vendas por produto</h2>
        <table><thead><tr><th>Código / produto</th><th>OS</th><th>Quantidade</th><th>Receita</th><th>Custo</th><th>Lucro</th><th>Repasse</th></tr></thead><tbody>
          {report.productSales.map((row) => <tr key={`${row.productId}:${row.productCode || ''}`}><td>{row.productCode || '-'}<br />{row.productName}</td><td>{row.orderCount}</td><td>{formatQuantity(row.quantity)}</td><td>{formatCurrency(row.revenue)}</td><td>{formatCurrency(row.cost)}</td><td>{formatCurrency(row.profit)}</td><td>{row.isPartnerProduct ? formatCurrency(row.partnerTransfer) : '-'}</td></tr>)}
        </tbody></table>
      </section>

      <section className={styles.printSection}>
        <h2>Ordens de serviço</h2>
        <table className={styles.printOrdersTable}><thead><tr><th>Data</th><th>OS</th><th>Cliente / veículo</th><th>Itens</th><th>Status</th><th>Responsável / pagamento</th><th>Base</th><th>Mão de obra</th><th>Final</th></tr></thead><tbody>
          {report.orders.map((order) => <tr key={order.id}><td>{formatDate(order.createdAt)}</td><td>{order.number}</td><td>{order.customerName}<br />{order.vehicleLabel}</td><td>{order.itemsLabel}</td><td>{FINANCIAL_STATUS_LABELS[order.status]}</td><td>{order.responsibleName}<br />{order.paymentMethod}</td><td>{formatCurrency(order.baseTotal)}</td><td>{formatCurrency(order.labor)}</td><td>{formatCurrency(order.finalTotal)}</td></tr>)}
        </tbody></table>
      </section>

      <footer className={styles.printFooter}>
        Documento gerencial de leitura, calculado a partir das ordens de serviço conforme os filtros selecionados. O repasse da parceria considera exclusivamente OS finalizadas.
      </footer>
    </section>
  )
}

export function FinancialReportPage() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('current-month')
  const [filters, setFilters] = useState<FinancialReportFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<FinancialReportFilters>(initialFilters)
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const [laborPage, setLaborPage] = useState(1)
  const [responsibleLaborPage, setResponsibleLaborPage] = useState(1)
  const [productPage, setProductPage] = useState(1)
  const [partnerPage, setPartnerPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getFinancialReport(appliedFilters)
      .then((data) => {
        if (cancelled) return
        setReport(data)
        setOrderPage(1)
        setLaborPage(1)
        setResponsibleLaborPage(1)
        setProductPage(1)
        setPartnerPage(1)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o relatório.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [appliedFilters])

  const paginatedOrders = useMemo(() => report?.orders.slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE) || [], [report, orderPage])
  const paginatedLabor = useMemo(() => report?.laborByCustomer.slice((laborPage - 1) * LABOR_PAGE_SIZE, laborPage * LABOR_PAGE_SIZE) || [], [report, laborPage])
  const paginatedResponsibleLabor = useMemo(() => report?.laborByResponsible.slice((responsibleLaborPage - 1) * LABOR_PAGE_SIZE, responsibleLaborPage * LABOR_PAGE_SIZE) || [], [report, responsibleLaborPage])
  const paginatedProducts = useMemo(() => report?.productSales.slice((productPage - 1) * PRODUCT_PAGE_SIZE, productPage * PRODUCT_PAGE_SIZE) || [], [report, productPage])
  const paginatedPartnerProducts = useMemo(() => report?.partnerTransfer.products.slice((partnerPage - 1) * PARTNER_PAGE_SIZE, partnerPage * PARTNER_PAGE_SIZE) || [], [report, partnerPage])

  function setFilter<Key extends keyof FinancialReportFilters>(key: Key, value: FinancialReportFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function changePeriod(value: string) {
    const preset = value as PeriodPreset
    setPeriodPreset(preset)
    if (preset !== 'custom') {
      setFilters((current) => ({ ...current, ...getPresetRange(preset) }))
    }
  }

  function applyFilters() {
    if (Boolean(filters.startDate) !== Boolean(filters.endDate)) {
      setError('Informe as datas inicial e final do período.')
      return
    }
    if (filters.startDate && filters.startDate > filters.endDate) {
      setError('A data inicial não pode ser posterior à data final.')
      return
    }
    setAppliedFilters({ ...filters })
  }

  function resetFilters() {
    const next = initialFilters()
    setPeriodPreset('current-month')
    setFilters(next)
    setAppliedFilters({ ...next })
  }

  function printReport() {
    if (!report) return
    const previousTitle = document.title
    document.title = `Relatorio-financeiro-${report.filters.startDate || 'completo'}`
    window.print()
    document.title = previousTitle
  }

  const metrics = report ? [
    { title: 'Total de OS', value: String(report.summary.totalOrders), description: `${report.summary.uniqueCustomers} clientes no período`, icon: FileText },
    { title: 'Finalizadas', value: String(report.summary.finalizedOrders), description: `${report.summary.cancelledOrders} canceladas`, icon: CheckCircle2 },
    { title: 'Em aberto', value: String(report.summary.openOrders), description: 'Agendadas, abertas, em andamento ou sem status', icon: Clock3 },
    { title: 'Valor final', value: formatCurrency(report.summary.finalTotal), description: 'Soma do valor final das OS', icon: CircleDollarSign },
    { title: 'Tíquete médio', value: formatCurrency(report.summary.averageTicket), description: 'Valor final dividido pelo total de OS', icon: Banknote },
    { title: 'Mão de obra', value: formatCurrency(report.summary.laborTotal), description: 'Total informado nas OS filtradas', icon: Wrench },
  ] : []

  return (
    <>
      <div className={styles.screenOnly}>
        <AdminPage>
          <AdminPageHeader
            title="Financeiro"
            description="Consulte e exporte os valores registrados nas ordens de serviço, sem alterar dados da operação."
            actions={<Button onClick={printReport} disabled={!report || loading || report.orders.length === 0} className="gap-2"><Printer className="h-4 w-4" />Imprimir / salvar PDF</Button>}
          />

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div><CardTitle>Filtros do relatório</CardTitle><p className="mt-1 text-sm text-muted-foreground">Todos os indicadores, tabelas e a impressão respeitam a mesma seleção.</p></div>
                {report && <p className="text-xs text-muted-foreground">Atualizado em {formatDateTime(report.generatedAt)}</p>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2"><label htmlFor="financial-period" className="text-sm font-medium">Período</label><Select value={periodPreset} onValueChange={changePeriod}><SelectTrigger id="financial-period" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="current-month">Mês atual</SelectItem><SelectItem value="previous-month">Mês anterior</SelectItem><SelectItem value="last-30-days">Últimos 30 dias</SelectItem><SelectItem value="current-year">Ano atual</SelectItem><SelectItem value="all-time">Todo o período</SelectItem><SelectItem value="custom">Período personalizado</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><label htmlFor="financial-start-date" className="text-sm font-medium">Data inicial</label><Input id="financial-start-date" type="date" value={filters.startDate} disabled={periodPreset === 'all-time'} onChange={(event: ChangeEvent<HTMLInputElement>) => { setPeriodPreset('custom'); setFilter('startDate', event.target.value) }} /></div>
                <div className="space-y-2"><label htmlFor="financial-end-date" className="text-sm font-medium">Data final</label><Input id="financial-end-date" type="date" value={filters.endDate} disabled={periodPreset === 'all-time'} onChange={(event: ChangeEvent<HTMLInputElement>) => { setPeriodPreset('custom'); setFilter('endDate', event.target.value) }} /></div>
                <div className="space-y-2"><label htmlFor="financial-status" className="text-sm font-medium">Status</label><Select value={filters.status} onValueChange={(value: string) => setFilter('status', value as FinancialStatusFilter)}><SelectTrigger id="financial-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os status</SelectItem>{FINANCIAL_ORDER_STATUSES.map((status) => <SelectItem key={status} value={status}>{FINANCIAL_STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><label htmlFor="financial-customer" className="text-sm font-medium">Cliente</label><Select value={filters.customerId || ALL_FILTER} onValueChange={(value: string) => setFilter('customerId', value === ALL_FILTER ? '' : value)}><SelectTrigger id="financial-customer" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL_FILTER}>Todos os clientes</SelectItem>{(report?.filterOptions.customers || []).map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><label htmlFor="financial-responsible" className="text-sm font-medium">Responsável</label><Select value={filters.responsibleId || ALL_FILTER} onValueChange={(value: string) => setFilter('responsibleId', value === ALL_FILTER ? '' : value)}><SelectTrigger id="financial-responsible" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL_FILTER}>Todos os responsáveis</SelectItem><SelectItem value={UNASSIGNED_FILTER}>Não informado</SelectItem>{(report?.filterOptions.responsibles || []).map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><label htmlFor="financial-payment" className="text-sm font-medium">Forma de pagamento</label><Select value={filters.paymentMethod || ALL_FILTER} onValueChange={(value: string) => setFilter('paymentMethod', value === ALL_FILTER ? '' : value)}><SelectTrigger id="financial-payment" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL_FILTER}>Todas as formas</SelectItem><SelectItem value={UNASSIGNED_FILTER}>Não informada</SelectItem>{(report?.filterOptions.paymentMethods || []).map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><label htmlFor="financial-search" className="text-sm font-medium">Busca</label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="financial-search" value={filters.search} onChange={(event: ChangeEvent<HTMLInputElement>) => setFilter('search', event.target.value)} className="pl-9" placeholder="OS, cliente, placa, item..." /></div></div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={resetFilters} className="gap-2"><FilterX className="h-4 w-4" />Limpar filtros</Button><Button onClick={applyFilters} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Aplicar filtros</Button></div>
            </CardContent>
          </Card>

          {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
          {loading && <div role="status" className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">Carregando e consolidando os dados financeiros...</div>}

          {!loading && report && (
            <>
              {report.truncated && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">O período possui mais de 5.000 OS. Refine os filtros para obter totais completos e uma impressão menor.</div>}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}</div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Card><CardHeader><CardTitle>Distribuição por status</CardTitle></CardHeader><CardContent className="space-y-4">{report.statusSummary.map((status) => <div key={status.status}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{status.label}</span><span className="text-muted-foreground">{status.count} OS · {status.percentage.toFixed(1)}% · {formatCurrency(status.finalTotal)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(status.percentage, 100)}%` }} /></div></div>)}</CardContent></Card>
                <Card><CardHeader><CardTitle>Resumo financeiro</CardTitle></CardHeader><CardContent><FinancialBreakdown report={report} /></CardContent></Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Repasse da parceria PL0826</CardTitle>
                  <p className="text-sm text-muted-foreground">Somente produtos com código iniciado por PL0826- em OS finalizadas. Repasse = 80% do custo histórico + 10% do lucro da venda.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Vendas parceiras</p><strong className="mt-1 block text-lg">{formatCurrency(report.partnerTransfer.revenue)}</strong><span className="text-xs text-muted-foreground">{formatQuantity(report.partnerTransfer.quantity)} unidades em {report.partnerTransfer.eligibleOrderCount} OS</span></div>
                    <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Custo histórico</p><strong className="mt-1 block text-lg">{formatCurrency(report.partnerTransfer.cost)}</strong><span className="text-xs text-muted-foreground">Base registrada no momento da venda</span></div>
                    <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Lucro</p><strong className="mt-1 block text-lg">{formatCurrency(report.partnerTransfer.profit)}</strong><span className="text-xs text-muted-foreground">Venda menos custo histórico</span></div>
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Total a repassar</p><strong className="mt-1 block text-lg text-primary">{formatCurrency(report.partnerTransfer.transferTotal)}</strong><span className="text-xs text-muted-foreground">{formatCurrency(report.partnerTransfer.costShare)} + {formatCurrency(report.partnerTransfer.profitShare)}</span></div>
                  </div>
                  {report.partnerTransfer.products.length === 0
                    ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhuma venda finalizada de produto PL0826- encontrada para os filtros selecionados.</p>
                    : <PartnerTransferTable rows={paginatedPartnerProducts} />}
                  <ListPagination currentPage={partnerPage} totalItems={report.partnerTransfer.products.length} itemsPerPage={PARTNER_PAGE_SIZE} itemLabel="produtos parceiros" onPageChange={setPartnerPage} />
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle>Mão de obra por cliente</CardTitle><p className="text-sm text-muted-foreground">Consolidação do valor de mão de obra, quantidade de OS e valor final por cliente.</p></CardHeader><CardContent>{report.laborByCustomer.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhum cliente encontrado para os filtros selecionados.</p> : <LaborTable rows={paginatedLabor} />}<ListPagination currentPage={laborPage} totalItems={report.laborByCustomer.length} itemsPerPage={LABOR_PAGE_SIZE} itemLabel="clientes" onPageChange={setLaborPage} /></CardContent></Card>
              <Card><CardHeader><CardTitle>Mão de obra por responsável</CardTitle><p className="text-sm text-muted-foreground">Divisão das OS e dos valores de mão de obra conforme o responsável registrado em cada ordem.</p></CardHeader><CardContent>{report.laborByResponsible.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhum responsável encontrado para os filtros selecionados.</p> : <ResponsibleLaborTable rows={paginatedResponsibleLabor} />}<ListPagination currentPage={responsibleLaborPage} totalItems={report.laborByResponsible.length} itemsPerPage={LABOR_PAGE_SIZE} itemLabel="responsáveis" onPageChange={setResponsibleLaborPage} /></CardContent></Card>
              <Card><CardHeader><CardTitle>Vendas por produto</CardTitle><p className="text-sm text-muted-foreground">Quantidade, receita, custo histórico, lucro e eventual repasse nas ordens filtradas.</p></CardHeader><CardContent>{report.productSales.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhum produto vendido nas ordens selecionadas.</p> : <ProductSalesTable rows={paginatedProducts} />}<ListPagination currentPage={productPage} totalItems={report.productSales.length} itemsPerPage={PRODUCT_PAGE_SIZE} itemLabel="produtos" onPageChange={setProductPage} /></CardContent></Card>
              <Card><CardHeader><CardTitle>Relação detalhada de ordens de serviço</CardTitle><p className="text-sm text-muted-foreground">{report.orders.length} registros em {periodLabel(report.filters)}, da data mais antiga para a mais recente.</p></CardHeader><CardContent>{report.orders.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nenhuma ordem de serviço encontrada para os filtros selecionados.</p> : <OrdersTable orders={paginatedOrders} />}<ListPagination currentPage={orderPage} totalItems={report.orders.length} itemsPerPage={ORDER_PAGE_SIZE} itemLabel="ordens" onPageChange={setOrderPage} /></CardContent></Card>
            </>
          )}
        </AdminPage>
      </div>
      {report && <PrintReport report={report} />}
    </>
  )
}
