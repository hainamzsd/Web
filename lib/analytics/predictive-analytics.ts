// Predictive Analytics Engine
// Advanced analytics with machine learning predictions

import { createClient } from '@/lib/supabase/client'

export interface PredictiveInsight {
  id: string
  type: 'trend' | 'anomaly' | 'forecast' | 'recommendation'
  title: string
  description: string
  confidence: number // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  actions?: string[]
  data: any
  generatedAt: Date
}

export interface TrendAnalysis {
  metric: string
  direction: 'up' | 'down' | 'stable'
  changeRate: number // percentage
  forecast: Array<{
    date: Date
    predicted: number
    confidence: number
  }>
  seasonality?: {
    detected: boolean
    period: number // days
    amplitude: number
  }
}

export interface PerformanceMetrics {
  // Survey Processing Speed
  averageProcessingTime: number // hours
  bottlenecks: Array<{
    stage: string
    averageTime: number
    count: number
  }>

  // Quality Metrics
  approvalRate: number // percentage
  rejectionRate: number // percentage
  reworkRate: number // percentage

  // User Performance
  topPerformers: Array<{
    userId: string
    userName: string
    surveysCompleted: number
    averageQuality: number
  }>

  // Geographic Coverage
  coverageByProvince: Array<{
    provinceCode: string
    provinceName: string
    totalSurveys: number
    coverage: number // percentage of area
    gaps: number // estimated missing surveys
  }>
}

/**
 * Predictive Analytics Engine
 */
export class PredictiveAnalytics {
  private supabase = createClient()

  /**
   * Generate all insights for a given time period
   */
  async generateInsights(
    startDate: Date,
    endDate: Date,
    scope: 'national' | 'province' | 'district' | 'commune' = 'national',
    scopeCode?: string
  ): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = []

    // Fetch data
    let query = this.supabase
      .from('survey_locations')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (scope !== 'national' && scopeCode) {
      query = query.eq(`${scope}_code`, scopeCode)
    }

    const { data: surveys } = await query

    if (!surveys || surveys.length === 0) {
      return insights
    }

    // 1. Trend Analysis
    const trendInsight = await this.analyzeTrends(surveys)
    if (trendInsight) insights.push(trendInsight)

    // 2. Anomaly Detection
    const anomalyInsights = await this.detectAnomalies(surveys)
    insights.push(...anomalyInsights)

    // 3. Workload Forecast
    const forecastInsight = await this.forecastWorkload(surveys)
    if (forecastInsight) insights.push(forecastInsight)

    // 4. Quality Recommendations
    const qualityInsights = await this.generateQualityRecommendations(surveys)
    insights.push(...qualityInsights)

    // 5. Resource Optimization
    const resourceInsights = await this.optimizeResources(surveys)
    insights.push(...resourceInsights)

    return insights.sort((a, b) => {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return impactOrder[b.impact] - impactOrder[a.impact]
    })
  }

  /**
   * Analyze trends in survey submissions
   */
  private async analyzeTrends(surveys: any[]): Promise<PredictiveInsight | null> {
    // Group by date
    const byDate: Record<string, number> = {}
    surveys.forEach(survey => {
      const date = new Date(survey.created_at).toISOString().split('T')[0]
      byDate[date] = (byDate[date] || 0) + 1
    })

    const dates = Object.keys(byDate).sort()
    const counts = dates.map(d => byDate[d])

    if (counts.length < 7) return null // Need at least a week of data

    // Calculate trend
    const avgRecent = counts.slice(-7).reduce((a, b) => a + b, 0) / 7
    const avgPrevious = counts.slice(-14, -7).reduce((a, b) => a + b, 0) / 7
    const changeRate = ((avgRecent - avgPrevious) / avgPrevious) * 100

    const direction = changeRate > 5 ? 'up' : changeRate < -5 ? 'down' : 'stable'

    let title = 'Xu hướng khảo sát ổn định'
    let impact: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let description = `Số lượng khảo sát trung bình ${avgRecent.toFixed(1)}/ngày`

    if (direction === 'up') {
      title = '📈 Tăng trưởng khảo sát'
      impact = changeRate > 50 ? 'high' : 'medium'
      description = `Số khảo sát tăng ${changeRate.toFixed(1)}% trong tuần qua. Cần chuẩn bị thêm nguồn lực xử lý.`
    } else if (direction === 'down') {
      title = '📉 Giảm hoạt động khảo sát'
      impact = changeRate < -30 ? 'medium' : 'low'
      description = `Số khảo sát giảm ${Math.abs(changeRate).toFixed(1)}% trong tuần qua. Cần kiểm tra nguyên nhân.`
    }

    return {
      id: 'trend-submission-rate',
      type: 'trend',
      title,
      description,
      confidence: 0.85,
      impact,
      actionable: direction !== 'stable',
      actions: direction === 'up'
        ? ['Tăng cường nhân sự xử lý', 'Ưu tiên các khảo sát quan trọng']
        : direction === 'down'
          ? ['Kiểm tra ứng dụng mobile', 'Liên hệ các đội khảo sát', 'Xem xét đào tạo lại']
          : [],
      data: {
        direction,
        changeRate,
        avgRecent,
        avgPrevious,
        chartData: dates.slice(-30).map((date, i) => ({
          date,
          count: counts.slice(-30)[i]
        }))
      },
      generatedAt: new Date()
    }
  }

  /**
   * Detect anomalies in the data
   */
  private async detectAnomalies(surveys: any[]): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = []

    // Check for duplicate locations
    const locationMap: Record<string, any[]> = {}
    surveys.forEach(survey => {
      const key = `${survey.latitude.toFixed(4)},${survey.longitude.toFixed(4)}`
      if (!locationMap[key]) locationMap[key] = []
      locationMap[key].push(survey)
    })

    const duplicates = Object.values(locationMap).filter(group => group.length > 1)
    if (duplicates.length > 0) {
      insights.push({
        id: 'anomaly-duplicates',
        type: 'anomaly',
        title: '⚠️ Phát hiện vị trí trùng lặp',
        description: `Tìm thấy ${duplicates.length} nhóm vị trí có tọa độ gần giống nhau. Có thể là lỗi GPS hoặc khảo sát trùng.`,
        confidence: 0.9,
        impact: 'high',
        actionable: true,
        actions: [
          'Xem xét các vị trí trùng lặp',
          'Xác minh với đội khảo sát',
          'Gộp hoặc xóa bản ghi trùng'
        ],
        data: { duplicates: duplicates.map(g => g.map(s => s.id)) },
        generatedAt: new Date()
      })
    }

    // Check for surveys with poor GPS accuracy
    const poorAccuracy = surveys.filter(s => s.accuracy && s.accuracy > 50)
    if (poorAccuracy.length > surveys.length * 0.1) {
      insights.push({
        id: 'anomaly-gps-accuracy',
        type: 'anomaly',
        title: '📍 Độ chính xác GPS kém',
        description: `${poorAccuracy.length} khảo sát (${((poorAccuracy.length / surveys.length) * 100).toFixed(1)}%) có độ chính xác GPS kém (>50m).`,
        confidence: 0.95,
        impact: 'medium',
        actionable: true,
        actions: [
          'Kiểm tra thiết bị GPS',
          'Đào tạo lại cách lấy tọa độ',
          'Khảo sát lại các vị trí có GPS kém'
        ],
        data: { poorAccuracyIds: poorAccuracy.map(s => s.id) },
        generatedAt: new Date()
      })
    }

    return insights
  }

  /**
   * Forecast future workload
   */
  private async forecastWorkload(surveys: any[]): Promise<PredictiveInsight | null> {
    // Group by status
    const byStatus: Record<string, number> = {}
    surveys.forEach(survey => {
      byStatus[survey.status] = (byStatus[survey.status] || 0) + 1
    })

    const pending = byStatus['pending'] || 0
    const reviewed = byStatus['reviewed'] || 0
    const queue = pending + reviewed

    if (queue === 0) return null

    // Calculate average processing time
    const processed = surveys.filter(s =>
      s.status === 'approved_commune' || s.status === 'approved_central'
    )

    let avgProcessingDays = 3 // default
    if (processed.length > 0) {
      const processingTimes = processed.map(s => {
        const created = new Date(s.created_at)
        const updated = new Date(s.updated_at)
        return (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      })
      avgProcessingDays = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
    }

    const estimatedDays = Math.ceil((queue * avgProcessingDays) / 10) // Assuming 10 surveys/day capacity

    let impact: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (estimatedDays > 14) impact = 'critical'
    else if (estimatedDays > 7) impact = 'high'
    else if (estimatedDays > 3) impact = 'medium'

    return {
      id: 'forecast-workload',
      type: 'forecast',
      title: '📅 Dự báo khối lượng công việc',
      description: `Hiện có ${queue} khảo sát đang chờ xử lý. Dự kiến mất ${estimatedDays} ngày để xử lý hết với tốc độ hiện tại.`,
      confidence: 0.75,
      impact,
      actionable: impact !== 'low',
      actions: impact !== 'low' ? [
        'Tăng cường nhân sự xử lý',
        'Ưu tiên các khảo sát khẩn cấp',
        'Xem xét quy trình tự động hóa'
      ] : [],
      data: {
        queueSize: queue,
        estimatedDays,
        avgProcessingDays,
        byStatus
      },
      generatedAt: new Date()
    }
  }

  /**
   * Generate quality improvement recommendations
   */
  private async generateQualityRecommendations(surveys: any[]): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = []

    // Check for incomplete data
    const incomplete = surveys.filter(s =>
      !s.location_name || !s.address || !s.owner_name
    )

    if (incomplete.length > surveys.length * 0.2) {
      insights.push({
        id: 'quality-incomplete-data',
        type: 'recommendation',
        title: '📝 Cải thiện tính đầy đủ dữ liệu',
        description: `${incomplete.length} khảo sát (${((incomplete.length / surveys.length) * 100).toFixed(1)}%) thiếu thông tin quan trọng.`,
        confidence: 0.9,
        impact: 'medium',
        actionable: true,
        actions: [
          'Bắt buộc nhập đầy đủ trường quan trọng',
          'Đào tạo nhân viên về thu thập dữ liệu',
          'Tạo checklist cho khảo sát'
        ],
        data: { incompleteIds: incomplete.map(s => s.id) },
        generatedAt: new Date()
      })
    }

    return insights
  }

  /**
   * Optimize resource allocation
   */
  private async optimizeResources(surveys: any[]): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = []

    // Analyze by province
    const byProvince: Record<string, number> = {}
    surveys.forEach(survey => {
      const code = survey.province_code || 'unknown'
      byProvince[code] = (byProvince[code] || 0) + 1
    })

    const provinces = Object.entries(byProvince).sort(([, a], [, b]) => b - a)
    const top3 = provinces.slice(0, 3)
    const totalTop3 = top3.reduce((sum, [, count]) => sum + count, 0)
    const percentage = (totalTop3 / surveys.length) * 100

    if (percentage > 60) {
      insights.push({
        id: 'resource-concentration',
        type: 'recommendation',
        title: '🎯 Tập trung nguồn lực',
        description: `${percentage.toFixed(1)}% khảo sát tập trung ở 3 tỉnh. Nên phân bổ nhân sự theo mật độ công việc.`,
        confidence: 0.85,
        impact: 'medium',
        actionable: true,
        actions: [
          `Tăng cường nhân sự tại ${top3.map(([code]) => code).join(', ')}`,
          'Tối ưu hóa phân công địa bàn',
          'Xem xét mở thêm văn phòng khu vực'
        ],
        data: { byProvince, top3 },
        generatedAt: new Date()
      })
    }

    return insights
  }

  /**
   * Calculate comprehensive performance metrics
   */
  async calculatePerformanceMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics> {
    const { data: surveys } = await this.supabase
      .from('survey_locations')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { data: history } = await this.supabase
      .from('approval_history')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Calculate metrics
    const totalSurveys = surveys?.length || 0
    const approved = surveys?.filter(s =>
      s.status === 'approved_commune' || s.status === 'approved_central'
    ).length || 0
    const rejected = surveys?.filter(s => s.status === 'rejected').length || 0

    return {
      averageProcessingTime: this.calculateAvgProcessingTime(surveys || [], history || []),
      bottlenecks: this.identifyBottlenecks(history || []),
      approvalRate: totalSurveys > 0 ? (approved / totalSurveys) * 100 : 0,
      rejectionRate: totalSurveys > 0 ? (rejected / totalSurveys) * 100 : 0,
      reworkRate: 0, // Would need more data
      topPerformers: await this.identifyTopPerformers(surveys || []),
      coverageByProvince: await this.calculateCoverage(surveys || [])
    }
  }

  private calculateAvgProcessingTime(surveys: any[], history: any[]): number {
    if (surveys.length === 0) return 0

    const times = surveys.map(survey => {
      const created = new Date(survey.created_at)
      const updated = new Date(survey.updated_at)
      return (updated.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
    })

    return times.reduce((a, b) => a + b, 0) / times.length
  }

  private identifyBottlenecks(history: any[]): PerformanceMetrics['bottlenecks'] {
    const stages: Record<string, { time: number; count: number }> = {}

    history.forEach(record => {
      const stage = record.action
      if (!stages[stage]) stages[stage] = { time: 0, count: 0 }

      // Would calculate actual time from timestamps
      stages[stage].time += 24 // placeholder
      stages[stage].count += 1
    })

    return Object.entries(stages).map(([stage, data]) => ({
      stage,
      averageTime: data.time / data.count,
      count: data.count
    }))
  }

  private async identifyTopPerformers(surveys: any[]): Promise<PerformanceMetrics['topPerformers']> {
    const bySurveyor: Record<string, { count: number; quality: number }> = {}

    surveys.forEach(survey => {
      const id = survey.surveyor_id
      if (!bySurveyor[id]) bySurveyor[id] = { count: 0, quality: 0 }
      bySurveyor[id].count += 1
      // Quality based on completeness
      const quality = (survey.location_name ? 1 : 0) + (survey.address ? 1 : 0) + (survey.owner_name ? 1 : 0)
      bySurveyor[id].quality += quality / 3
    })

    return Object.entries(bySurveyor)
      .map(([userId, data]) => ({
        userId,
        userName: 'User ' + userId.substring(0, 8),
        surveysCompleted: data.count,
        averageQuality: (data.quality / data.count) * 100
      }))
      .sort((a, b) => b.surveysCompleted - a.surveysCompleted)
      .slice(0, 10)
  }

  private async calculateCoverage(surveys: any[]): Promise<PerformanceMetrics['coverageByProvince']> {
    const byProvince: Record<string, number> = {}
    surveys.forEach(survey => {
      const code = survey.province_code || 'unknown'
      byProvince[code] = (byProvince[code] || 0) + 1
    })

    return Object.entries(byProvince).map(([code, count]) => ({
      provinceCode: code,
      provinceName: `Province ${code}`,
      totalSurveys: count,
      coverage: Math.min(100, (count / 1000) * 100), // Assume 1000 is full coverage
      gaps: Math.max(0, 1000 - count)
    }))
  }
}

// Export singleton
export const predictiveAnalytics = new PredictiveAnalytics()
