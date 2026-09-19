import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { GenderGapGroup, InsightFilters, Outlier, PayrollGroup, PercentileGroup, Summary } from '../api/types'

// All keys start with 'insights' so any employee edit can invalidate the whole dashboard at once.
const useInsight = <T,>(name: string, params: object) =>
  useQuery({ queryKey: ['insights', name, params], queryFn: () => api.insight<T>(name, params) })

export const useSummary = (f: InsightFilters) => useInsight<Summary>('summary', f)
export const usePayroll = (f: InsightFilters, group_by: string) => useInsight<PayrollGroup[]>('payroll', { ...f, group_by })
export const usePercentiles = (f: InsightFilters, group_by: string) => useInsight<PercentileGroup[]>('percentiles', { ...f, group_by })
export const useGenderGap = (f: InsightFilters, group_by: string) => useInsight<GenderGapGroup[]>('gender-gap', { ...f, group_by })
export const useOutliers = (f: InsightFilters, threshold: number) => useInsight<Outlier[]>('outliers', { ...f, threshold, limit: 25 })
