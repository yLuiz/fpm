import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, signIn, adminUser } from '@/test/render'
import { authApi, downtimeApi, equipmentApi, maintenanceApi, metricsApi } from '@/services/api'
import type { MetricsSummary, MonthlyMetric } from '@/types'

vi.mock('@/services/api', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() },
  equipmentApi: { getAll: vi.fn() },
  maintenanceApi: { getStats: vi.fn(), getUpcoming: vi.fn(), getOverdue: vi.fn() },
  downtimeApi: { list: vi.fn() },
  metricsApi: { summary: vi.fn(), monthly: vi.fn() },
  settingsApi: {},
}))

const summary: MetricsSummary = {
  from: '2026-09-24T00:00:00.000Z',
  to: '2026-10-24T00:00:00.000Z',
  equipmentCount: 10,
  compliance: { due: 12, onTime: 10, rate: 0.8333 },
  avgDelayDays: 1.5,
  downtime: {
    count: 3,
    withOverduePreventive: 2,
    withPreventiveOnTime: 1,
    totalMinutes: 300,
    mttrMinutes: 100,
    mtbfHours: 2398.3,
    availability: 0.9979,
  },
}

const monthly: MonthlyMetric[] = [
  { month: '2026-09', label: 'set/26', complianceRate: 0.8, due: 10, onTime: 8, downtimes: 3, withOverduePreventive: 3, withPreventiveOnTime: 0, downtimeMinutes: 300 },
  { month: '2026-10', label: 'out/26', complianceRate: 0.9, due: 10, onTime: 9, downtimes: 1, withOverduePreventive: 0, withPreventiveOnTime: 1, downtimeMinutes: 60 },
]

describe('Dashboard', () => {
  beforeEach(() => {
    signIn()
    vi.mocked(authApi.me).mockResolvedValue(adminUser)
    vi.mocked(maintenanceApi.getStats).mockResolvedValue({ upcoming: 1, overdue: 2, completedThisMonth: 5, openCorrectives: 1 })
    vi.mocked(maintenanceApi.getUpcoming).mockResolvedValue([])
    vi.mocked(maintenanceApi.getOverdue).mockResolvedValue([])
    vi.mocked(equipmentApi.getAll).mockResolvedValue([])
    vi.mocked(downtimeApi.list).mockResolvedValue([])
    vi.mocked(metricsApi.summary).mockResolvedValue(summary)
    vi.mocked(metricsApi.monthly).mockResolvedValue(monthly)
  })

  it('abre na aba Operação com os KPIs do dia e não carrega indicadores', async () => {
    renderApp('/')
    expect(await screen.findByText('Corretivas abertas')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Operação/ })).toHaveAttribute('aria-selected', 'true')
    expect(metricsApi.summary).not.toHaveBeenCalled()
  })

  it('aba Indicadores mostra KPIs e a parcela de paradas com preventiva vencida', async () => {
    renderApp('/?tab=indicadores')

    expect(await screen.findByText('83%')).toBeInTheDocument() // cumprimento
    expect(screen.getByText('10 de 12 preventivas no prazo · meta 90%')).toBeInTheDocument()
    expect(screen.getByText('1,5 d')).toBeInTheDocument()
    expect(screen.getByText('2398 h')).toBeInTheDocument()
    expect(screen.getByText('1h 40min')).toBeInTheDocument() // MTTR
    expect(screen.getByText('99,8%')).toBeInTheDocument()
    expect(screen.getByTestId('overdue-share')).toHaveTextContent('75% das paradas aconteceram com a preventiva vencida')
    expect(metricsApi.monthly).toHaveBeenCalledWith(6)
  })

  it('troca de aba pelo clique e liga/desliga série pela legenda', async () => {
    renderApp('/')
    await userEvent.click(await screen.findByRole('tab', { name: /Indicadores/ }))
    const legend = await screen.findByRole('button', { name: /Com preventiva vencida/ })
    expect(legend).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(legend)
    expect(legend).toHaveAttribute('aria-pressed', 'false')
  })
})
