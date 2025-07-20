export interface UserBehaviorEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  eventData: Record<string, any>;
  timestamp: Date;
  page?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export enum EventType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  FORM_SUBMIT = 'form_submit',
  FILE_UPLOAD = 'file_upload',
  DOWNLOAD = 'download',
  SEARCH = 'search',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
  PURCHASE = 'purchase',
  ERROR = 'error',
  CUSTOM = 'custom'
}

export interface UserSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  events: UserBehaviorEvent[];
  device?: DeviceInfo;
  location?: LocationInfo;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  screenResolution: string;
}

export interface LocationInfo {
  country: string;
  region: string;
  city: string;
  timezone: string;
}

export interface UserAnalytics {
  userId: string;
  totalSessions: number;
  totalPageViews: number;
  averageSessionDuration: number;
  lastActiveDate: Date;
  firstVisitDate: Date;
  conversionEvents: UserBehaviorEvent[];
  segmentIds: string[];
}

export interface CreditPredictionModel {
  id: string;
  name: string;
  version: string;
  algorithm: 'linear_regression' | 'random_forest' | 'neural_network' | 'gradient_boosting';
  features: string[];
  accuracy: number;
  lastTrained: Date;
  status: 'active' | 'training' | 'deprecated';
}

export interface CreditScorePrediction {
  userId: string;
  currentScore: number;
  predictedScore: number;
  timeframe: number; // months
  confidence: number;
  factors: PredictionFactor[];
  recommendations: string[];
  modelId: string;
  createdAt: Date;
}

export interface PredictionFactor {
  factor: string;
  impact: number; // -100 to 100
  importance: number; // 0 to 1
  description: string;
}

export interface BusinessMetrics {
  date: Date;
  activeUsers: number;
  newSignups: number;
  revenue: number;
  conversionRate: number;
  churnRate: number;
  averageSessionDuration: number;
  pageViews: number;
  uploadCount: number;
  analysisCount: number;
}

export interface ABTestExperiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  startDate: Date;
  endDate?: Date;
  variants: ABTestVariant[];
  targetMetric: string;
  segments: string[];
  trafficAllocation: number; // 0 to 1
  statisticalSignificance?: number;
  results?: ABTestResults;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0 to 1
  config: Record<string, any>;
}

export interface ABTestResults {
  experimentId: string;
  variants: VariantResults[];
  winningVariant?: string;
  confidenceLevel: number;
  pValue: number;
  effectSize: number;
  sampleSize: number;
}

export interface VariantResults {
  variantId: string;
  participantCount: number;
  conversionCount: number;
  conversionRate: number;
  confidence: ConfidenceInterval;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number; // e.g., 0.95 for 95%
}

export interface CustomReport {
  id: string;
  name: string;
  description: string;
  userId: string;
  isPublic: boolean;
  config: ReportConfig;
  schedule?: ReportSchedule;
  lastGenerated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportConfig {
  metrics: string[];
  dimensions: string[];
  filters: ReportFilter[];
  dateRange: DateRange;
  visualization: VisualizationType;
  aggregation: AggregationType;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
}

export interface DateRange {
  start: Date;
  end: Date;
  preset?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
}

export enum VisualizationType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  AREA_CHART = 'area_chart',
  SCATTER_PLOT = 'scatter_plot',
  HEATMAP = 'heatmap',
  TABLE = 'table'
}

export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median'
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  timezone: string;
  recipients: string[];
}

export interface AnalyticsInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  data: Record<string, any>;
  recommendations: string[];
  createdAt: Date;
  acknowledged?: boolean;
}

export enum InsightType {
  ANOMALY = 'anomaly',
  TREND = 'trend',
  CORRELATION = 'correlation',
  PREDICTION = 'prediction',
  SEGMENT = 'segment',
  PERFORMANCE = 'performance'
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  description: string;
  userId: string;
  isDefault: boolean;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  refreshInterval?: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: WidgetPosition;
  size: WidgetSize;
}

export enum WidgetType {
  METRIC_CARD = 'metric_card',
  CHART = 'chart',
  TABLE = 'table',
  MAP = 'map',
  TEXT = 'text',
  IMAGE = 'image'
}

export interface WidgetConfig {
  dataSource: string;
  query: Record<string, any>;
  visualization: VisualizationType;
  options: Record<string, any>;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  responsive: boolean;
}

export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: QueryFilter[];
  dateRange: DateRange;
  limit?: number;
  offset?: number;
  orderBy?: OrderBy[];
}

export interface QueryFilter {
  field: string;
  operator: string;
  value: any;
}

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AnalyticsResponse<T = any> {
  data: T[];
  total: number;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  executionTime: number;
  cacheHit: boolean;
  generatedAt: Date;
  query: AnalyticsQuery;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  userCount: number;
  lastUpdated: Date;
  isActive: boolean;
}

export interface SegmentCriteria {
  field: string;
  operator: string;
  value: any;
  logic: 'and' | 'or';
}

export interface FunnelAnalysis {
  id: string;
  name: string;
  steps: FunnelStep[];
  conversionRates: number[];
  dropOffPoints: DropOffPoint[];
  dateRange: DateRange;
  segmentId?: string;
}

export interface FunnelStep {
  id: string;
  name: string;
  eventType: EventType;
  conditions?: Record<string, any>;
  userCount: number;
}

export interface DropOffPoint {
  fromStep: string;
  toStep: string;
  dropOffRate: number;
  userCount: number;
  insights: string[];
}

export interface CohortAnalysis {
  id: string;
  name: string;
  cohortType: 'acquisition' | 'behavioral';
  timeUnit: 'day' | 'week' | 'month';
  metric: string;
  data: CohortData[];
  dateRange: DateRange;
}

export interface CohortData {
  cohort: string;
  period: number;
  userCount: number;
  value: number;
  retentionRate?: number;
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering';
  targetVariable: string;
  features: ModelFeature[];
  performance: ModelPerformance;
  lastTrained: Date;
  status: 'training' | 'ready' | 'deploying' | 'deployed' | 'error';
}

export interface ModelFeature {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'text';
  importance: number;
  description: string;
}

export interface ModelPerformance {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  rmse?: number;
  r2Score?: number;
  confusionMatrix?: number[][];
}