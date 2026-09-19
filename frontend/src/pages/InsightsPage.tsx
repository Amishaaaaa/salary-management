import { useState } from 'react'
import {
  Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import {
  Bar, BarChart, CartesianGrid, ErrorBar, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import ChartCard, { INK, SERIES_COLOR } from '../components/ChartCard'
import EmployeeFilters, { EMPTY_FILTERS, Filters } from '../components/EmployeeFilters'
import { formatMoney, formatUsd, formatUsdCompact } from '../format'
import { useGenderGap, useOutliers, usePayroll, usePercentiles, useSummary } from '../insights/useInsights'
import { describeGap, toRangeRows } from '../insights/transform'
import { useMeta } from '../hooks'

const axis = { stroke: INK.secondary, fontSize: 12 }
const GRID = <CartesianGrid stroke={INK.grid} strokeDasharray="3 3" vertical={false} />

function Kpi({ label, value }: { label: string; value?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h4" fontWeight={600}>{value ?? '…'}</Typography>
    </Paper>
  )
}

function Toggle({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <ToggleButtonGroup size="small" exclusive value={value} onChange={(_, v) => v && onChange(v)}>
      {options.map((o) => <ToggleButton key={o} value={o} sx={{ textTransform: 'capitalize', px: 1.5 }}>{o.replace('_', ' ')}</ToggleButton>)}
    </ToggleButtonGroup>
  )
}

export default function InsightsPage() {
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

  return (
    <Stack spacing={3}>
      <Typography variant="h5">How we pay people</Typography>
      <EmployeeFilters hideSearch meta={meta.data} value={filters} onChange={setFilters} />

      <Grid container spacing={2}>
        <Grid item xs={6} md={3}><Kpi label="Headcount" value={summary.data && summary.data.headcount.toLocaleString()} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Annual payroll (USD)" value={summary.data && formatUsdCompact(summary.data.total_payroll_usd)} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Median salary (USD)" value={summary.data && formatUsd(summary.data.median_usd)} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Average salary (USD)" value={summary.data && formatUsd(summary.data.mean_usd)} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Where does the payroll money go?" subtitle="Total annual salary in USD"
            loading={payroll.isLoading} empty={payroll.data?.length === 0}
            controls={<Toggle value={payrollBy} options={['country', 'department', 'level']} onChange={setPayrollBy} />}>
            <div role="img" aria-label={`Bar chart of total payroll by ${payrollBy}`}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payroll.data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  {GRID}
                  <XAxis dataKey="group" tick={axis} tickLine={false} axisLine={{ stroke: INK.grid }} />
                  <YAxis tickFormatter={formatUsdCompact} tick={axis} tickLine={false} axisLine={false} width={64} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    formatter={(v, _n, item) => [`${formatUsd(Number(v))} (${item.payload.headcount.toLocaleString()} people)`, 'Payroll']} />
                  <Bar dataKey="total_usd" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="What is the typical salary by job title?" subtitle="Median, with the middle 50% of people shown as a whisker (USD)"
            loading={percentiles.isLoading} empty={ranges.length === 0}
            caption="Top 12 titles by median. Whisker runs from the 25th to the 75th percentile.">
            <div role="img" aria-label="Bar chart of median salary by job title with interquartile whiskers">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ranges} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
                  <CartesianGrid stroke={INK.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatUsdCompact} tick={axis} tickLine={false} axisLine={{ stroke: INK.grid }} />
                  <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={150} interval={0} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    formatter={(v, _n, item) => [`${formatUsd(Number(v))} (25th–75th: ${formatUsd(item.payload.p25)}–${formatUsd(item.payload.p75)})`, 'Median']} />
                  <Bar dataKey="median" fill={SERIES_COLOR} radius={[0, 4, 4, 0]} maxBarSize={18}>
                    <ErrorBar dataKey="whisker" width={4} stroke={INK.primary} strokeWidth={1.5} direction="x" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Is there a gender pay gap?" subtitle="Gap in median pay vs. peers in the same country, department and level"
            loading={gap.isLoading} empty={gap.data?.length === 0}
            controls={<Toggle value={gapBy} options={['department', 'level', 'country']} onChange={setGapBy} />}
            caption={gapWorst ? `Positive = men paid more. Largest gap: ${gapWorst.group}, ${describeGap(gapWorst.gap_pct)}. Groups with fewer than 5 of either gender are hidden.` : undefined}>
            <div role="img" aria-label={`Bar chart of gender pay gap percentage by ${gapBy}`}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gap.data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  {GRID}
                  <XAxis dataKey="group" tick={axis} tickLine={false} axisLine={{ stroke: INK.grid }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={axis} tickLine={false} axisLine={false} width={48} />
                  <ReferenceLine y={0} stroke={INK.secondary} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    formatter={(v, _n, item) => [`${describeGap(Number(v))} (${item.payload.female_count} women, ${item.payload.male_count} men)`, 'Gap']} />
                  <Bar dataKey="gap_pct" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Who is paid unusually?" subtitle="People far from the median of peers with the same title, level and country"
            loading={outliers.isLoading} empty={outliers.data?.length === 0}
            controls={<Toggle value={String(threshold)} options={['25', '40', '60']} onChange={(v) => setThreshold(Number(v))} />}
            caption={`Showing up to 25 people more than ${threshold}% above or below their peer median. Peer groups smaller than 5 are skipped.`}>
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow><TableCell>Name</TableCell><TableCell>Role</TableCell><TableCell align="right">Salary</TableCell><TableCell align="right" sx={{ whiteSpace: "nowrap" }}>vs peers</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {outliers.data?.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.first_name} {o.last_name}</TableCell>
                      <TableCell>{o.job_title} · {o.level} · {o.country}</TableCell>
                      <TableCell align="right">{formatMoney(o.salary, o.currency)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{o.deviation_pct > 0 ? '+' : ''}{o.deviation_pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ChartCard>
        </Grid>
      </Grid>
    </Stack>
  )
}
