import { supabase } from '../utils/supabaseSetup';

export interface AdminDashboardStats {
  // Booking Statistics
  totalBookings: number;
  activeBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  rejectedBookings: number;
  todaysBookings: number;
  tomorrowsBookings: number;
  weeklyBookings: number;
  monthlyBookings: number;

  // Hall Statistics
  totalHalls: number;
  activeHalls: number;
  maintenanceHalls: number;
  hallUtilization: number;
  mostBookedHall: string;
  leastBookedHall: string;

  // Time & Duration Analytics
  averageBookingDuration: number;
  peakBookingHour: string;
  peakBookingDay: string;
  bookingTrend: 'up' | 'down' | 'stable';

  // Conflict & Equipment Analytics
  totalConflicts: number;
  resolvedConflicts: number;
  pendingConflicts: number;
  equipmentUsage: number;
  maintenanceScheduled: number;

  // User Analytics
  totalUsers: number;
  activeUsers: number;
  topBookingUsers: Array<{ name: string; count: number }>;

  // Revenue & Performance (if applicable)
  bookingSuccessRate: number;
  averageApprovalTime: number;
  systemUptime: number;
}

export interface BookingTrend {
  date: string;
  bookings: number;
  approved: number;
  cancelled: number;
  revenue?: number;
}

export interface HallPerformance {
  hallId: string;
  hallName: string;
  totalBookings: number;
  utilizationRate: number;
  averageDuration: number;
  maintenanceHours: number;
  revenue?: number;
}

export interface ConflictAnalysis {
  id: string;
  type: 'time_overlap' | 'equipment_conflict' | 'capacity_exceeded' | 'maintenance_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'resolved' | 'escalated';
  description: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

class EnhancedAdminReportsService {
  /**
   * Test database connectivity and table access
   */
  async testDatabaseConnection() {
    try {
      console.log("🔍 Testing database connection...");
      
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('smart_bookings')
        .select('count(*)')
        .single();
      
      console.log("🔍 Basic connection test:", { testData, testError });
      
      // Test if we can list tables (this might fail due to permissions, but worth trying)
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('get_table_names');
      
      console.log("🔍 Available tables:", { tablesData, tablesError });
      
      return { success: !testError, error: testError };
    } catch (error) {
      console.error("🚨 Database connection test failed:", error);
      return { success: false, error };
    }
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      console.log('📊 Fetching comprehensive dashboard statistics...');

      // Fetch all required data in parallel
      const [
        bookingsResult,
        hallsResult,
        conflictsResult,
        equipmentResult,
        usersResult,
        maintenanceResult
      ] = await Promise.all([
        this.getBookingStatistics(),
        this.getHallStatistics(),
        this.getConflictStatistics(),
        this.getEquipmentStatistics(),
        this.getUserStatistics(),
        this.getMaintenanceStatistics()
      ]);

      // Calculate trends and analytics
      const bookingTrend = await this.calculateBookingTrend();
      const peakAnalysis = await this.calculatePeakUsage();
      const performanceMetrics = await this.calculatePerformanceMetrics();

      return {
        // Booking Statistics
        totalBookings: bookingsResult.total,
        activeBookings: bookingsResult.active,
        pendingBookings: bookingsResult.pending,
        approvedBookings: bookingsResult.approved,
        completedBookings: bookingsResult.completed,
        cancelledBookings: bookingsResult.cancelled,
        rejectedBookings: bookingsResult.rejected,
        todaysBookings: bookingsResult.today,
        tomorrowsBookings: bookingsResult.tomorrow,
        weeklyBookings: bookingsResult.weekly,
        monthlyBookings: bookingsResult.monthly,

        // Hall Statistics
        totalHalls: hallsResult.total,
        activeHalls: hallsResult.active,
        maintenanceHalls: hallsResult.maintenance,
        hallUtilization: hallsResult.utilization,
        mostBookedHall: hallsResult.mostBooked,
        leastBookedHall: hallsResult.leastBooked,

        // Time & Duration Analytics
        averageBookingDuration: peakAnalysis.averageDuration,
        peakBookingHour: peakAnalysis.peakHour,
        peakBookingDay: peakAnalysis.peakDay,
        bookingTrend: bookingTrend,

        // Conflict & Equipment Analytics
        totalConflicts: conflictsResult.total,
        resolvedConflicts: conflictsResult.resolved,
        pendingConflicts: conflictsResult.pending,
        equipmentUsage: equipmentResult.usage,
        maintenanceScheduled: maintenanceResult.scheduled,

        // User Analytics
        totalUsers: usersResult.total,
        activeUsers: usersResult.active,
        topBookingUsers: usersResult.topUsers,

        // Performance Metrics
        bookingSuccessRate: performanceMetrics.successRate,
        averageApprovalTime: performanceMetrics.averageApprovalTime,
        systemUptime: performanceMetrics.uptime,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get detailed booking statistics
   */
  private async getBookingStatistics() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Convert dates to DDMMYYYY format for comparison
    const todayFormatted = `${today.split('-')[2]}${today.split('-')[1]}${today.split('-')[0]}`;
    const tomorrowFormatted = `${tomorrow.split('-')[2]}${tomorrow.split('-')[1]}${tomorrow.split('-')[0]}`;

    console.log("🔍 Booking stats: Date formats:", {
      today,
      todayFormatted,
      tomorrow,
      tomorrowFormatted,
      weekStart,
      monthStart,
    });

    // First, let's check if the table exists and has any data at all
    console.log("🔍 Checking smart_bookings table...");
    
    // Try a simple count query first
    const { count, error: countError } = await supabase
      .from('smart_bookings')
      .select('*', { count: 'exact', head: true });

    console.log("🔍 Table count result:", { count, countError });

    // Now get actual data
    const { data: bookings, error } = await supabase
      .from('smart_bookings')
      .select('*');

    console.log("🔍 Booking stats: Raw data from database:", {
      count: bookings?.length || 0,
      error,
      sampleBookings: bookings?.slice(0, 3), // Show first 3 bookings
      allBookings: bookings, // Show all bookings for debugging
    });

    // Let's also check if there are any records with different status values
    if (bookings && bookings.length > 0) {
      const statusBreakdown = bookings.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {});
      console.log("🔍 Status breakdown:", statusBreakdown);
      
      // Check booking dates
      const dateBreakdown = bookings.reduce((acc, booking) => {
        acc[booking.booking_date] = (acc[booking.booking_date] || 0) + 1;
        return acc;
      }, {});
      console.log("🔍 Date breakdown:", dateBreakdown);
    }

    if (error) {
      console.error("🚨 Error fetching smart_bookings:", error);
      throw error;
    }

    const stats = {
      total: bookings?.length || 0,
      active: bookings?.filter(b => b.status === 'approved' || b.status === 'confirmed').length || 0,
      pending: bookings?.filter(b => b.status === 'pending').length || 0,
      approved: bookings?.filter(b => b.status === 'approved').length || 0,
      completed: bookings?.filter(b => b.status === 'completed').length || 0,
      cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
      rejected: bookings?.filter(b => b.status === 'rejected').length || 0,
      today: bookings?.filter(b => b.booking_date === todayFormatted).length || 0,
      tomorrow: bookings?.filter(b => b.booking_date === tomorrowFormatted).length || 0,
      weekly: bookings?.filter(b => {
        const bookingDate = new Date(b.created_at);
        return bookingDate >= new Date(weekStart);
      }).length || 0,
      monthly: bookings?.filter(b => {
        const bookingDate = new Date(b.created_at);
        return bookingDate >= new Date(monthStart);
      }).length || 0,
    };

    console.log("🔍 Booking stats: Calculated statistics:", stats);

    return stats;
  }

  /**
   * Get hall statistics
   */
  private async getHallStatistics() {
    const [hallsResult, bookingsResult] = await Promise.all([
      supabase.from('halls').select('*'),
      supabase.from('smart_bookings').select('hall_id, status')
    ]);

    if (hallsResult.error) throw hallsResult.error;
    if (bookingsResult.error) throw bookingsResult.error;

    const halls = hallsResult.data || [];
    const bookings = bookingsResult.data || [];

    // Calculate hall booking counts
    const hallBookingCounts = bookings.reduce((acc, booking) => {
      acc[booking.hall_id] = (acc[booking.hall_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hallsWithCounts = halls.map(hall => ({
      ...hall,
      bookingCount: hallBookingCounts[hall.id] || 0
    }));

    const mostBookedHall = hallsWithCounts.sort((a, b) => b.bookingCount - a.bookingCount)[0];
    const leastBookedHall = hallsWithCounts.sort((a, b) => a.bookingCount - b.bookingCount)[0];

    // Calculate utilization rate
    const totalPossibleSlots = halls.length * 12 * 30; // Assuming 12 hours/day, 30 days
    const totalBookedSlots = bookings.filter(b => b.status === 'approved').length;
    const utilization = totalPossibleSlots > 0 ? Math.round((totalBookedSlots / totalPossibleSlots) * 100) : 0;

    return {
      total: halls.length,
      active: halls.filter(h => h.is_active && !h.is_maintenance).length,
      maintenance: halls.filter(h => h.is_maintenance).length,
      utilization,
      mostBooked: mostBookedHall?.name || 'N/A',
      leastBooked: leastBookedHall?.name || 'N/A',
    };
  }

  /**
   * Get conflict statistics
   */
  private async getConflictStatistics() {
    const { data: conflicts, error } = await supabase
      .from('booking_conflicts')
      .select('*');

    if (error) throw error;

    return {
      total: conflicts?.length || 0,
      resolved: conflicts?.filter(c => c.status === 'resolved').length || 0,
      pending: conflicts?.filter(c => c.status === 'pending').length || 0,
    };
  }

  /**
   * Get equipment statistics
   */
  private async getEquipmentStatistics() {
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('*');

    if (error) throw error;

    const totalEquipment = equipment?.length || 0;
    const activeEquipment = equipment?.filter(e => e.status === 'available').length || 0;
    const usage = totalEquipment > 0 ? Math.round((activeEquipment / totalEquipment) * 100) : 0;

    return {
      usage,
    };
  }

  /**
   * Get user statistics
   */
  private async getUserStatistics() {
    const [usersResult, bookingsResult] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('smart_bookings').select('user_id')
    ]);

    if (usersResult.error) throw usersResult.error;
    if (bookingsResult.error) throw bookingsResult.error;

    const users = usersResult.data || [];
    const bookings = bookingsResult.data || [];

    // Calculate user booking counts
    const userBookingCounts = bookings.reduce((acc, booking) => {
      acc[booking.user_id] = (acc[booking.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userBookingCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => {
        const user = users.find(u => u.id === userId);
        return {
          name: user?.name || 'Unknown User',
          count,
        };
      });

    // Active users (users who made bookings in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentBookings } = await supabase
      .from('smart_bookings')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activeUserIds = new Set(recentBookings?.map(b => b.user_id) || []);

    return {
      total: users.length,
      active: activeUserIds.size,
      topUsers,
    };
  }

  /**
   * Get maintenance statistics
   */
  private async getMaintenanceStatistics() {
    const { data: maintenance, error } = await supabase
      .from('hall_maintenance')
      .select('*');

    if (error) throw error;

    return {
      scheduled: maintenance?.filter(m => m.status === 'scheduled').length || 0,
    };
  }

  /**
   * Calculate booking trends
   */
  private async calculateBookingTrend(): Promise<'up' | 'down' | 'stable'> {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [recentBookings, olderBookings] = await Promise.all([
      supabase
        .from('smart_bookings')
        .select('*')
        .gte('created_at', lastWeek.toISOString()),
      supabase
        .from('smart_bookings')
        .select('*')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', lastWeek.toISOString())
    ]);

    const recentCount = recentBookings.data?.length || 0;
    const olderCount = olderBookings.data?.length || 0;

    if (recentCount > olderCount * 1.1) return 'up';
    if (recentCount < olderCount * 0.9) return 'down';
    return 'stable';
  }

  /**
   * Calculate peak usage analytics
   */
  private async calculatePeakUsage() {
    const { data: bookings, error } = await supabase
      .from('smart_bookings')
      .select('start_time, end_time, duration_minutes, booking_date');

    if (error) throw error;

    // Calculate average duration
    const durations = bookings?.map(b => b.duration_minutes || 0) || [];
    const averageDuration = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Calculate peak hour
    const hourCounts = (bookings || []).reduce((acc, booking) => {
      if (booking.start_time) {
        const hour = booking.start_time.split(':')[0];
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const peakHour = Object.keys(hourCounts).length > 0
      ? Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b)
      : '09';

    // Calculate peak day (day of week)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = (bookings || []).reduce((acc, booking) => {
      if (booking.booking_date && booking.booking_date.length === 8) {
        // Convert DDMMYYYY to Date
        const day = booking.booking_date.substring(0, 2);
        const month = booking.booking_date.substring(2, 4);
        const year = booking.booking_date.substring(4, 8);
        const date = new Date(`${year}-${month}-${day}`);
        const dayOfWeek = dayNames[date.getDay()];
        acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const peakDay = Object.keys(dayCounts).length > 0
      ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b)
      : 'Monday';

    return {
      averageDuration,
      peakHour: `${peakHour}:00`,
      peakDay,
    };
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics() {
    const { data: bookings, error } = await supabase
      .from('smart_bookings')
      .select('status, created_at, approved_at');

    if (error) throw error;

    const totalBookings = bookings?.length || 0;
    const successfulBookings = bookings?.filter(b => 
      b.status === 'approved' || b.status === 'completed'
    ).length || 0;

    const successRate = totalBookings > 0 
      ? Math.round((successfulBookings / totalBookings) * 100)
      : 0;

    // Calculate average approval time
    const approvedBookings = bookings?.filter(b => b.approved_at && b.created_at) || [];
    const approvalTimes = approvedBookings.map(b => {
      const created = new Date(b.created_at);
      const approved = new Date(b.approved_at);
      return (approved.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
    });

    const averageApprovalTime = approvalTimes.length > 0
      ? Math.round(approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length)
      : 0;

    return {
      successRate,
      averageApprovalTime,
      uptime: 99.9, // This would typically come from monitoring services
    };
  }

  /**
   * Get booking trends over time
   */
  async getBookingTrends(days: number = 30): Promise<BookingTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: bookings, error } = await supabase
      .from('smart_bookings')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group bookings by date
    const dailyStats = (bookings || []).reduce((acc, booking) => {
      const date = booking.created_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = { bookings: 0, approved: 0, cancelled: 0 };
      }
      acc[date].bookings++;
      if (booking.status === 'approved') acc[date].approved++;
      if (booking.status === 'cancelled') acc[date].cancelled++;
      return acc;
    }, {} as Record<string, { bookings: number; approved: number; cancelled: number }>);

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      bookings: (stats as { bookings: number; approved: number; cancelled: number }).bookings,
      approved: (stats as { bookings: number; approved: number; cancelled: number }).approved,
      cancelled: (stats as { bookings: number; approved: number; cancelled: number }).cancelled,
    }));
  }

  /**
   * Get hall performance analytics
   */
  async getHallPerformance(): Promise<HallPerformance[]> {
    const [hallsResult, bookingsResult] = await Promise.all([
      supabase.from('halls').select('*'),
      supabase.from('smart_bookings').select('*')
    ]);

    if (hallsResult.error) throw hallsResult.error;
    if (bookingsResult.error) throw bookingsResult.error;

    const halls = hallsResult.data || [];
    const bookings = bookingsResult.data || [];

    return halls.map(hall => {
      const hallBookings = bookings.filter(b => b.hall_id === hall.id);
      const totalBookings = hallBookings.length;
      const approvedBookings = hallBookings.filter(b => b.status === 'approved').length;
      
      // Calculate utilization rate (approved bookings / total possible slots)
      const totalPossibleSlots = 12 * 30; // 12 hours/day, 30 days
      const utilizationRate = Math.round((approvedBookings / totalPossibleSlots) * 100);

      // Calculate average duration
      const durations = hallBookings.map(b => b.duration_minutes || 0);
      const averageDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      return {
        hallId: hall.id,
        hallName: hall.name,
        totalBookings,
        utilizationRate,
        averageDuration,
        maintenanceHours: 0, // Would come from maintenance table
      };
    });
  }

  /**
   * Get conflict analysis
   */
  async getConflictAnalysis(): Promise<ConflictAnalysis[]> {
    const { data: conflicts, error } = await supabase
      .from('booking_conflicts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (conflicts || []).map(conflict => ({
      id: conflict.id,
      type: conflict.conflict_type,
      severity: conflict.severity,
      status: conflict.status,
      description: conflict.description,
      createdAt: conflict.created_at,
      resolvedAt: conflict.resolved_at,
      resolutionNotes: conflict.resolution_notes,
    }));
  }
}

export const enhancedAdminReportsService = new EnhancedAdminReportsService();
