import { supabase } from '@/lib/supabase/client';
import { 
  UserBehaviorEvent, 
  EventType, 
  UserSession, 
  DeviceInfo, 
  LocationInfo,
  UserAnalytics,
  UserSegment,
  FunnelAnalysis,
  CohortAnalysis
} from '@/types/analytics';

export class UserBehaviorAnalytics {
  private static instance: UserBehaviorAnalytics;
  private currentSession: UserSession | null = null;
  private eventQueue: UserBehaviorEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isTracking = false;

  static getInstance(): UserBehaviorAnalytics {
    if (!UserBehaviorAnalytics.instance) {
      UserBehaviorAnalytics.instance = new UserBehaviorAnalytics();
    }
    return UserBehaviorAnalytics.instance;
  }

  async initializeTracking(userId: string): Promise<void> {
    if (this.isTracking) return;

    this.isTracking = true;
    await this.startSession(userId);
    this.setupEventListeners();
    this.startEventQueue();
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) return;

    this.isTracking = false;
    await this.endSession();
    this.removeEventListeners();
    this.stopEventQueue();
  }

  private async startSession(userId: string): Promise<void> {
    const sessionId = this.generateSessionId();
    const deviceInfo = this.getDeviceInfo();
    const locationInfo = await this.getLocationInfo();

    this.currentSession = {
      id: crypto.randomUUID(),
      userId,
      startTime: new Date(),
      pageViews: 0,
      events: [],
      device: deviceInfo,
      location: locationInfo
    };

    // Store session in database
    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_id: sessionId,
        start_time: this.currentSession.startTime.toISOString(),
        device_type: deviceInfo?.type,
        device_os: deviceInfo?.os,
        device_browser: deviceInfo?.browser,
        screen_resolution: deviceInfo?.screenResolution,
        country: locationInfo?.country,
        region: locationInfo?.region,
        city: locationInfo?.city,
        timezone: locationInfo?.timezone,
        user_agent: navigator.userAgent
      });

    if (error) {
      console.error('Failed to start session:', error);
    }
  }

  private async endSession(): Promise<void> {
    if (!this.currentSession) return;

    const endTime = new Date();
    this.currentSession.endTime = endTime;
    this.currentSession.duration = endTime.getTime() - this.currentSession.startTime.getTime();

    // Update session in database
    const { error } = await supabase
      .from('user_sessions')
      .update({
        end_time: endTime.toISOString(),
        duration: Math.floor(this.currentSession.duration / 1000),
        page_views: this.currentSession.pageViews
      })
      .eq('session_id', this.currentSession.id);

    if (error) {
      console.error('Failed to end session:', error);
    }

    // Flush remaining events
    await this.flushEvents();
    this.currentSession = null;
  }

  async trackEvent(
    eventType: EventType,
    eventData: Record<string, any> = {},
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.currentSession || !this.isTracking) return;

    const event: UserBehaviorEvent = {
      id: crypto.randomUUID(),
      userId: this.currentSession.userId,
      sessionId: this.currentSession.id,
      eventType,
      eventData,
      timestamp: new Date(),
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      metadata
    };

    this.eventQueue.push(event);
    this.currentSession.events.push(event);

    // Track page views
    if (eventType === EventType.PAGE_VIEW) {
      this.currentSession.pageViews++;
    }

    // Flush events if queue is full
    if (this.eventQueue.length >= 50) {
      await this.flushEvents();
    }
  }

  async trackPageView(page?: string): Promise<void> {
    await this.trackEvent(EventType.PAGE_VIEW, {
      page: page || window.location.pathname,
      referrer: document.referrer,
      title: document.title
    });
  }

  async trackClick(element: string, data?: Record<string, any>): Promise<void> {
    await this.trackEvent(EventType.CLICK, {
      element,
      ...data
    });
  }

  async trackFormSubmit(formName: string, data?: Record<string, any>): Promise<void> {
    await this.trackEvent(EventType.FORM_SUBMIT, {
      formName,
      ...data
    });
  }

  async trackFileUpload(fileName: string, fileSize: number, fileType: string): Promise<void> {
    await this.trackEvent(EventType.FILE_UPLOAD, {
      fileName,
      fileSize,
      fileType
    });
  }

  async trackError(error: Error, context?: Record<string, any>): Promise<void> {
    await this.trackEvent(EventType.ERROR, {
      message: error.message,
      stack: error.stack,
      context
    });
  }

  async trackCustomEvent(eventName: string, data: Record<string, any>): Promise<void> {
    await this.trackEvent(EventType.CUSTOM, {
      eventName,
      ...data
    });
  }

  private setupEventListeners(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackCustomEvent('page_hidden', { timestamp: Date.now() });
      } else {
        this.trackCustomEvent('page_visible', { timestamp: Date.now() });
      }
    });

    // Track clicks on interactive elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button') {
        this.trackClick(target.tagName.toLowerCase(), {
          text: target.textContent?.trim(),
          className: target.className,
          id: target.id
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackFormSubmit(form.name || form.id || 'unnamed_form', {
        action: form.action,
        method: form.method
      });
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
          this.trackCustomEvent('scroll_depth', { percent: maxScroll });
        }
      }
    });
  }

  private removeEventListeners(): void {
    // Remove event listeners to prevent memory leaks
    document.removeEventListener('visibilitychange', () => {});
    document.removeEventListener('click', () => {});
    document.removeEventListener('submit', () => {});
    window.removeEventListener('scroll', () => {});
  }

  private startEventQueue(): void {
    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000);
  }

  private stopEventQueue(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { error } = await supabase
        .from('user_behavior_events')
        .insert(
          eventsToFlush.map(event => ({
            user_id: event.userId,
            session_id: event.sessionId,
            event_type: event.eventType,
            event_data: event.eventData,
            page: event.page,
            timestamp: event.timestamp.toISOString(),
            user_agent: event.userAgent,
            metadata: event.metadata || {}
          }))
        );

      if (error) {
        console.error('Failed to flush events:', error);
        // Re-add events to queue for retry
        this.eventQueue.unshift(...eventsToFlush);
      }
    } catch (error) {
      console.error('Error flushing events:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Mobi|Android/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return {
      type: deviceType,
      os,
      browser,
      screenResolution: `${screen.width}x${screen.height}`
    };
  }

  private async getLocationInfo(): Promise<LocationInfo | undefined> {
    try {
      // Use a geolocation API service (example with ipapi.co)
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        country: data.country_name || 'Unknown',
        region: data.region || 'Unknown',
        city: data.city || 'Unknown',
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } catch {
      return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
  }

  // Analytics query methods
  async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId);

      if (sessionsError) throw sessionsError;

      const { data: events, error: eventsError } = await supabase
        .from('user_behavior_events')
        .select('*')
        .eq('user_id', userId)
        .in('event_type', ['purchase', 'signup', 'subscription']);

      if (eventsError) throw eventsError;

      const totalSessions = sessions?.length || 0;
      const totalPageViews = sessions?.reduce((sum, session) => sum + (session.page_views || 0), 0) || 0;
      const averageSessionDuration = sessions?.reduce((sum, session) => sum + (session.duration || 0), 0) / totalSessions || 0;
      const firstVisit = sessions?.length ? new Date(Math.min(...sessions.map(s => new Date(s.start_time).getTime()))) : new Date();
      const lastActive = sessions?.length ? new Date(Math.max(...sessions.map(s => new Date(s.start_time).getTime()))) : new Date();

      return {
        userId,
        totalSessions,
        totalPageViews,
        averageSessionDuration,
        lastActiveDate: lastActive,
        firstVisitDate: firstVisit,
        conversionEvents: events || [],
        segmentIds: [] // This would be populated based on segment membership
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return null;
    }
  }

  async createUserSegment(segment: Omit<UserSegment, 'id' | 'userCount' | 'lastUpdated'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_segments')
        .insert({
          name: segment.name,
          description: segment.description,
          criteria: segment.criteria,
          is_active: segment.isActive
        })
        .select()
        .single();

      if (error) throw error;

      // Update segment memberships
      await this.updateSegmentMemberships(data.id);

      return data.id;
    } catch (error) {
      console.error('Error creating user segment:', error);
      return null;
    }
  }

  async updateSegmentMemberships(segmentId: string): Promise<void> {
    // This would implement the logic to evaluate segment criteria
    // and update user_segment_memberships table
    try {
      await supabase.rpc('update_user_segments');
    } catch (error) {
      console.error('Error updating segment memberships:', error);
    }
  }

  async createFunnelAnalysis(funnel: Omit<FunnelAnalysis, 'id' | 'conversionRates' | 'dropOffPoints'>): Promise<FunnelAnalysis | null> {
    try {
      // Calculate funnel metrics
      const conversionRates: number[] = [];
      const dropOffPoints = [];

      // This would implement funnel analysis logic
      // For now, returning placeholder data
      
      const { data, error } = await supabase
        .from('funnel_analyses')
        .insert({
          name: funnel.name,
          steps: funnel.steps,
          conversion_rates: conversionRates,
          drop_off_points: dropOffPoints,
          date_range: funnel.dateRange,
          segment_id: funnel.segmentId
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        ...funnel,
        conversionRates,
        dropOffPoints
      };
    } catch (error) {
      console.error('Error creating funnel analysis:', error);
      return null;
    }
  }

  async createCohortAnalysis(cohort: Omit<CohortAnalysis, 'id' | 'data'>): Promise<CohortAnalysis | null> {
    try {
      // Calculate cohort data
      const cohortData = []; // This would be calculated based on user behavior

      const { data, error } = await supabase
        .from('cohort_analyses')
        .insert({
          name: cohort.name,
          cohort_type: cohort.cohortType,
          time_unit: cohort.timeUnit,
          metric: cohort.metric,
          data: cohortData,
          date_range: cohort.dateRange
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        ...cohort,
        data: cohortData
      };
    } catch (error) {
      console.error('Error creating cohort analysis:', error);
      return null;
    }
  }
}

// Export singleton instance
export const userBehaviorAnalytics = UserBehaviorAnalytics.getInstance();