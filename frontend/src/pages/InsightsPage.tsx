import { useState, type ReactNode } from 'react'
import {
  Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import PaymentsIcon from '@mui/icons-material/Payments'
import BalanceIcon from '@mui/icons-material/Balance'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { Bar, BarChart, CartesianGrid, ErrorBar, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../auth/useAuth'
import ChartCard, { BarGradient } from '../components/ChartCard'
import { useInk } from '../components/useInk'
import EmployeeFilters from '../components/EmployeeFilters'
import { EMPTY_FILTERS, type Filters } from '../components/filters'
import { formatMoney, formatUsd, formatUsdCompact } from '../format'
import { useMeta } from '../hooks'
import { describeGap, toRangeRows } from '../insights/transform'
import { useGenderGap, useOutliers, usePayroll, usePercentiles, useSummary } from '../insights/useInsights'
import { GRADIENTS } from '../theme'
import { flag, greeting } from '../ui'

const KPI_GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }
const CHART_GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' } }

function Kpi({ label, value, icon, gradient }: { label: string; value?: string; icon: ReactNode; gradient: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
          <Typography variant="h4" sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>{value ?? '…'}</Typography>
        </Box>
        <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', color: '#fff', background: gradient, boxShadow: '0 8px 18px -8px rgba(99,102,241,.7)' }}>{icon}</Box>
      </Stack>
    </Paper>
  )
}

function Toggle({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <ToggleButtonGroup size="small" exclusive value={value} onChange={(_, v) => v && onChange(v)}>
      {options.map((o) => <ToggleButton key={o} value={o} sx={{ textTransform: 'capitalize', px: 1.5, py: 0.25 }}>{o.replace('_', ' ')}</ToggleButton>)}
    </ToggleButtonGroup>
  )
}

export default function InsightsPage() {
  const { user } = useAuth()
  const ink = useInk()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [payrollBy, setPayrollBy] = useState('country')
  const [gapBy, setGapBy] = useState('department')
  const [threshold, setThreshold] = useState(40)
  const meta = useMeta()
  const f = { country: filters.country, department: filters.department, level: filters.level }

  const summary = useSummary(f)
  const payroll = usePayroll(f, payrollBy)
  const percentiles = usePercentiles(f, 'job_title')
  const gap = useGenderGap(f, gapBy)
  const outliers = useOutliers(f, threshold / 100)

  const ranges = toRangeRows(percentiles.data ?? [])
  const gapWorst = gap.data?.[0]
  const axis = { stroke: ink.secondary, fontSize: 12 }
  // Department names are long: angle them so neighbours never overlap. Short codes (country, level) stay flat.
  const tilt = (by: string) => (by === 'department' ? { angle: -35, textAnchor: 'end' as const, height: 64 } : { height: 30 })
  const filtered = Object.values(filters).some(Boolean)
  const first = user?.name.split(' ')[0]

  return (
    <Stack spacing={3}>
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 5, p: { xs: 3, md: 4 }, color: '#fff', background: GRADIENTS.brand }}>
        <Box aria-hidden sx={{ position: 'absolute', right: -60, top: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.28), transparent 68%)' }} />
        <Box aria-hidden sx={{ position: 'absolute', right: 160, bottom: -120, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.16), transparent 68%)' }} />
        <Typography sx={{ opacity: 0.85 }} fontWeight={500}>{greeting(new Date().getHours())}, {first} 👋</Typography>
        <Typography variant="h4" sx={{ mt: 0.5, maxWidth: 640 }}>
          {summary.data
            ? <>{filtered ? 'This selection costs' : 'ACME spends'} {formatUsdCompact(summary.data.total_payroll_usd)} a year on {summary.data.headcount.toLocaleString()} people.</>
            : 'Here is how ACME pays its people.'}
        </Typography>
        <Typography sx={{ mt: 1, opacity: 0.85 }}>Use the filters to slice by country, department or level. Every number below updates.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <EmployeeFilters hideSearch meta={meta.data} value={filters} onChange={setFilters} />
      </Paper>

      <Box sx={KPI_GRID}>
        <Box><Kpi label="Headcount" icon={<GroupsIcon />} gradient={GRADIENTS.indigo} value={summary.data && summary.data.headcount.toLocaleString()} /></Box>
        <Box><Kpi label="Annual payroll (USD)" icon={<PaymentsIcon />} gradient={GRADIENTS.pink} value={summary.data && formatUsdCompact(summary.data.total_payroll_usd)} /></Box>
        <Box><Kpi label="Median salary (USD)" icon={<BalanceIcon />} gradient={GRADIENTS.teal} value={summary.data && formatUsd(summary.data.median_usd)} /></Box>
        <Box><Kpi label="Average salary (USD)" icon={<TrendingUpIcon />} gradient={GRADIENTS.amber} value={summary.data && formatUsd(summary.data.mean_usd)} /></Box>
      </Box>

      <Box sx={CHART_GRID}>
        <Box>
          <ChartCard title="Where does the payroll money go?" subtitle="Total annual salary in USD" accent={GRADIENTS.indigo}
            loading={payroll.isLoading} empty={payroll.data?.length === 0}
            controls={<Toggle value={payrollBy} options={['country', 'department', 'level']} onChange={setPayrollBy} />}>
            <div role="img" aria-label={`Bar chart of total payroll by ${payrollBy}`}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payroll.data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <BarGradient id="g-payroll" from="#8b5cf6" to="#6366f1" />
                  <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="group" tick={axis} tickLine={false} axisLine={{ stroke: ink.grid }} interval={0} {...tilt(payrollBy)} />
                  <YAxis tickFormatter={formatUsdCompact} tick={axis} tickLine={false} axisLine={false} width={64} />
                  <Tooltip cursor={{ fill: ink.cursor }} contentStyle={ink.tooltip}
                    formatter={(v, _n, item) => [`${formatUsd(Number(v))} (${item.payload.headcount.toLocaleString()} people)`, 'Payroll']} />
                  <Bar dataKey="total_usd" fill="url(#g-payroll)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Box>

        <Box>
          <ChartCard title="What is the typical salary by job title?" subtitle="Median, with the middle 50% of people shown as a whisker (USD)" accent={GRADIENTS.teal}
            loading={percentiles.isLoading} empty={ranges.length === 0}
            caption="Top 12 titles by median. Whisker runs from the 25th to the 75th percentile.">
            <div role="img" aria-label="Bar chart of median salary by job title with interquartile whiskers">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ranges} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
                  <BarGradient id="g-range" from="#0ea5e9" to="#14b8a6" horizontal />
                  <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatUsdCompact} tick={axis} tickLine={false} axisLine={{ stroke: ink.grid }} />
                  <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={150} interval={0} />
                  <Tooltip cursor={{ fill: ink.cursor }} contentStyle={ink.tooltip}
                    formatter={(v, _n, item) => [`${formatUsd(Number(v))} (25th–75th: ${formatUsd(item.payload.p25)}–${formatUsd(item.payload.p75)})`, 'Median']} />
                  <Bar dataKey="median" fill="url(#g-range)" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    <ErrorBar dataKey="whisker" width={4} stroke={ink.primary} strokeWidth={1.5} direction="x" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Box>

        <Box>
          <ChartCard title="Is there a gender pay gap?" subtitle="Gap in median pay vs. peers in the same country, department and level" accent={GRADIENTS.pink}
            loading={gap.isLoading} empty={gap.data?.length === 0}
            controls={<Toggle value={gapBy} options={['department', 'level', 'country']} onChange={setGapBy} />}
            caption={gapWorst ? `Positive = men paid more. Largest gap: ${gapWorst.group}, ${describeGap(gapWorst.gap_pct)}. Groups with fewer than 5 of either gender are hidden.` : undefined}>
            <div role="img" aria-label={`Bar chart of gender pay gap percentage by ${gapBy}`}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gap.data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <BarGradient id="g-gap" from="#f97316" to="#ec4899" />
                  <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="group" tick={axis} tickLine={false} axisLine={{ stroke: ink.grid }} interval={0} {...tilt(gapBy)} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={axis} tickLine={false} axisLine={false} width={48} />
                  <ReferenceLine y={0} stroke={ink.secondary} />
                  <Tooltip cursor={{ fill: ink.cursor }} contentStyle={ink.tooltip}
                    formatter={(v, _n, item) => [`${describeGap(Number(v))} (${item.payload.female_count} women, ${item.payload.male_count} men)`, 'Gap']} />
                  <Bar dataKey="gap_pct" fill="url(#g-gap)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Box>

        <Box>
          <ChartCard title="Who is paid unusually?" subtitle="People far from the median of peers with the same title, level and country" accent={GRADIENTS.amber}
            loading={outliers.isLoading} empty={outliers.data?.length === 0}
            controls={<Toggle value={String(threshold)} options={['25', '40', '60']} onChange={(v) => setThreshold(Number(v))} />}
            caption={`Showing up to 25 people more than ${threshold}% above or below their peer median. Peer groups smaller than 5 are skipped.`}>
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow><TableCell>Name</TableCell><TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Role</TableCell><TableCell align="right">Salary</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>vs peers</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {outliers.data?.map((o) => (
                    <TableRow key={o.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Box sx={{ whiteSpace: 'nowrap' }}>{o.first_name} {o.last_name}</Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={400} sx={{ display: { xs: 'block', md: 'none' } }}>
                          {o.job_title} · {o.level} · {flag(o.country)} {o.country}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{o.job_title} · {o.level} · {flag(o.country)} {o.country}</TableCell>
                      <TableCell align="right">{formatMoney(o.salary, o.currency)}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={`${o.deviation_pct > 0 ? '+' : ''}${o.deviation_pct}%`}
                          sx={{ fontWeight: 700, bgcolor: o.deviation_pct > 0 ? 'rgba(16,185,129,.16)' : 'rgba(239,68,68,.16)', color: o.deviation_pct > 0 ? 'success.main' : 'error.main' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ChartCard>
        </Box>
      </Box>
    </Stack>
  )
}
