import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, Target, Award, Clock, BookOpen, Calendar, BarChart3 } from 'lucide-react';
import API from '../../api/axios';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user._id) {
          navigate('/login');
          return;
        }

        // Fetch dashboard data for analytics
        const dashboardRes = await API.get(`/dashboard/${user._id}`);
        const roadmapsRes = await API.get(`/roadmap/user/${user._id}/all`).catch(() => ({ data: { roadmaps: [] } }));
        
        const dashboard = dashboardRes.data.dashboard;
        const roadmaps = roadmapsRes.data.roadmaps || [];

        // Calculate analytics
        const totalSteps = roadmaps.reduce((acc: number, roadmap: any) => 
          acc + (roadmap.steps?.length || 0), 0);
        
        const completedSteps = dashboard.completedSteps?.length || 0;
        const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        // Calculate learning streak
        const calculateStreak = () => {
          if (!dashboard.completedSteps?.length) return 0;
          
          const sortedSteps = dashboard.completedSteps
            .filter((step: any) => step.completedAt)
            .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
          
          if (!sortedSteps.length) return 0;
          
          let streak = 0;
          let currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          
          for (const step of sortedSteps) {
            const stepDate = new Date(step.completedAt);
            stepDate.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.floor((currentDate.getTime() - stepDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === streak) {
              streak++;
              currentDate.setDate(currentDate.getDate() - 1);
            } else if (daysDiff === streak + 1) {
              streak++;
              currentDate.setDate(currentDate.getDate() - 1);
            } else {
              break;
            }
          }
          
          return streak;
        };

        // Calculate weekly progress
        const getWeeklyProgress = () => {
          const weeklyData = [];
          const today = new Date();
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const daySteps = dashboard.completedSteps?.filter((step: any) => {
              const stepDate = new Date(step.completedAt);
              stepDate.setHours(0, 0, 0, 0);
              return stepDate.getTime() === date.getTime();
            }).length || 0;
            
            weeklyData.push({
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              steps: daySteps,
              date: date.toLocaleDateString()
            });
          }
          
          return weeklyData;
        };

        // Calculate skill distribution
        const getSkillDistribution = () => {
          const skillStats = roadmaps.map((roadmap: any) => {
            const completedInRoadmap = dashboard.completedSteps?.filter((step: any) => 
              step.roadmapId === roadmap._id).length || 0;
            const totalInRoadmap = roadmap.steps?.length || 0;
            const progress = totalInRoadmap > 0 ? Math.round((completedInRoadmap / totalInRoadmap) * 100) : 0;
            
            return {
              skill: roadmap.skill,
              progress,
              completed: completedInRoadmap,
              total: totalInRoadmap
            };
          });
          
          return skillStats;
        };

        setAnalytics({
          totalRoadmaps: roadmaps.length,
          totalSteps,
          completedSteps,
          completionRate,
          currentStreak: calculateStreak(),
          weeklyProgress: getWeeklyProgress(),
          skillDistribution: getSkillDistribution(),
          averageTimePerStep: dashboard.completedSteps?.length > 0 ? 
            Math.round(dashboard.completedSteps.reduce((acc: number, step: any) => {
              if (step.completedAt && step.startedAt) {
                const timeDiff = new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime();
                return acc + (timeDiff / (1000 * 60 * 60 * 24)); // Convert to days
              }
              return acc;
            }, 0) / dashboard.completedSteps.length) : 0
        });

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No analytics data available.</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: "Learning Streak", 
      value: analytics.currentStreak, 
      unit: "days", 
      icon: TrendingUp, 
      color: "text-success",
      description: "Consecutive days of learning"
    },
    { 
      label: "Skills Learning", 
      value: analytics.totalRoadmaps, 
      unit: "active", 
      icon: Target, 
      color: "text-primary",
      description: "Different skills in progress"
    },
    { 
      label: "Steps Completed", 
      value: analytics.completedSteps, 
      unit: "total", 
      icon: Award, 
      color: "text-secondary",
      description: "Learning milestones achieved"
    },
    { 
      label: "Completion Rate", 
      value: analytics.completionRate, 
      unit: "%", 
      icon: BarChart3, 
      color: "text-accent",
      description: "Overall progress percentage"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center space-x-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
            
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-gradient-primary shadow-glow">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Learning Analytics</h1>
                <p className="text-muted-foreground text-lg">Track your progress and learning patterns</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <Card key={i} className="border-0 shadow-card bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg bg-muted/20 ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.unit}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{stat.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Weekly Progress Chart */}
            <Card className="border-0 shadow-card bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>Weekly Activity</span>
                </CardTitle>
                <CardDescription>Steps completed over the past 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.weeklyProgress.map((day, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-12 text-sm font-medium text-muted-foreground">
                        {day.day}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-muted/20 rounded-full h-2">
                            <div 
                              className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((day.steps / Math.max(...analytics.weeklyProgress.map(d => d.steps))) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {day.steps}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Total this week: {analytics.weeklyProgress.reduce((acc, day) => acc + day.steps, 0)} steps completed
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skill Distribution */}
            <Card className="border-0 shadow-card bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-secondary" />
                  <span>Skill Progress</span>
                </CardTitle>
                <CardDescription>Progress across different skills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.skillDistribution.map((skill, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{skill.skill}</span>
                        <span className="text-sm text-muted-foreground">
                          {skill.completed}/{skill.total} ({skill.progress}%)
                        </span>
                      </div>
                      <Progress value={skill.progress} className="h-2" />
                    </div>
                  ))}
                </div>
                {analytics.skillDistribution.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No skills data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Learning Insights */}
          <Card className="border-0 shadow-card bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <span>Learning Insights</span>
              </CardTitle>
              <CardDescription>Personalized insights based on your learning patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="font-medium text-primary mb-2">Current Streak</h4>
                    <p className="text-sm text-muted-foreground">
                      {analytics.currentStreak > 0 
                        ? `You've been learning for ${analytics.currentStreak} consecutive days! Keep up the great work! 🔥`
                        : "Start a learning streak by completing your first step today!"
                      }
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                    <h4 className="font-medium text-secondary mb-2">Learning Efficiency</h4>
                    <p className="text-sm text-muted-foreground">
                      {analytics.averageTimePerStep > 0 
                        ? `You complete steps in an average of ${analytics.averageTimePerStep} days. Great pace!`
                        : "Complete more steps to see your learning efficiency metrics."
                      }
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                    <h4 className="font-medium text-success mb-2">Progress Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      You've completed {analytics.completedSteps} out of {analytics.totalSteps} total steps 
                      ({analytics.completionRate}% completion rate). 
                      {analytics.completionRate > 50 
                        ? " You're doing excellent!" 
                        : analytics.completionRate > 25 
                        ? " Good progress so far!" 
                        : " Keep going, you're just getting started!"
                      }
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <h4 className="font-medium text-accent mb-2">Recommendations</h4>
                    <p className="text-sm text-muted-foreground">
                      {analytics.currentStreak === 0 
                        ? "Try to maintain a daily learning routine to build momentum."
                        : analytics.completionRate < 30
                        ? "Focus on completing more steps to improve your overall progress."
                        : "Consider exploring new skills or advancing to more challenging topics."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
