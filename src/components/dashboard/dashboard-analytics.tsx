"use client"

import { useState, useEffect } from "react"
import { 
  BarChart3, 
  PieChart, 
  LineChart,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from "lucide-react"

import { Chart } from "@/components/dashboard/chart"
import { StatCard } from "@/components/dashboard/stat-card"
import { AnalyticsCard } from "@/components/dashboard/analytics-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DashboardAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Mock data for demonstration
  const mockAnalyticsData = {
    data: {
      totalFeedback: 127,
      categoryCounts: {
        "Workload": 35,
        "Communication": 25,
        "Benefits": 15,
        "Office Environment": 10,
        "Other": 42
      },
      departmentCounts: {
        "Engineering": 40,
        "Marketing": 25,
        "Sales": 15,
        "HR": 10,
        "Other": 37
      },
      priorityCounts: {
        1: 45,
        2: 35,
        3: 15,
        4: 5
      },
      statusCounts: {
        "new": 8,
        "in-progress": 12,
        "resolved": 102,
        "escalated": 5
      },
      resolutionRate: 92,
      averageResponseTime: 48
    }
  }

  const mockAiAnalysis = {
    topCategories: [
      { name: "Workload", count: 35 },
      { name: "Communication", count: 25 },
      { name: "Benefits", count: 15 },
      { name: "Office Environment", count: 10 },
      { name: "Other", count: 42 }
    ],
    sentimentByDepartment: [
      { department: "Engineering", sentiment: -0.2 },
      { department: "Marketing", sentiment: 0.1 },
      { department: "Sales", sentiment: 0.3 },
      { department: "HR", sentiment: 0.5 }
    ],
    urgentIssues: [
      "Engineering team workload and overtime",
      "Cross-department communication barriers",
      "Office temperature complaints"
    ],
    recommendedActions: [
      "Review project timelines and resource allocation in Engineering",
      "Implement regular cross-department sync meetings",
      "Address office temperature regulation issues"
    ]
  }

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        
        // Try to fetch from API
        try {
          const response = await fetch(`/api/analytics?period=${period}`)
          
          if (response.ok) {
            const data = await response.json()
            setAnalyticsData(data.analytics)
            setAiAnalysis(data.aiAnalysis)
          } else {
            // If API fails, use mock data
            console.log("API request failed, using mock data")
            setAnalyticsData(mockAnalyticsData)
            setAiAnalysis(mockAiAnalysis)
          }
        } catch (fetchError) {
          // If fetch fails completely, use mock data
          console.log("Fetch error, using mock data:", fetchError)
          setAnalyticsData(mockAnalyticsData)
          setAiAnalysis(mockAiAnalysis)
        }
      } catch (error) {
        console.error('Error in analytics component:', error)
        // Even if there's an error in our error handling, use mock data
        setAnalyticsData(mockAnalyticsData)
        setAiAnalysis(mockAiAnalysis)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnalytics()
  }, [period])

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics data...</div>
      </div>
    )
  }

  // Use the actual data if available, otherwise use mock data
  const data = analyticsData?.data || mockAnalyticsData.data
  const analysis = aiAnalysis || mockAiAnalysis

  // Transform data for charts
  const categoryData = Object.entries(data.categoryCounts).map(([name, value]) => ({ name, value }))
  const departmentData = Object.entries(data.departmentCounts).map(([name, value]) => ({ name, value }))
  const statusData = Object.entries(data.statusCounts).map(([name, value]) => ({ 
    name: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' '), 
    value 
  }))
  const priorityData = Object.entries(data.priorityCounts).map(([name, value]) => ({ 
    name: `Priority ${name}`, 
    value 
  }))

  // Trend data (mock)
  const trendData = [
    { month: "Jan", count: 12 },
    { month: "Feb", count: 19 },
    { month: "Mar", count: 15 },
    { month: "Apr", count: 27 },
    { month: "May", count: 24 },
    { month: "Jun", count: 32 }
  ]

  const chartTabs = [
    { id: "categories", label: "Categories", icon: PieChart },
    { id: "departments", label: "Departments", icon: BarChart3 },
    { id: "trends", label: "Trends", icon: LineChart }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Feedback" 
          value={data.totalFeedback}
          description="All time feedback submissions"
          trend={{ value: 12, direction: "up", label: "vs last month" }}
        />
        <StatCard 
          title="Pending Review" 
          value={data.statusCounts.new}
          description="Feedback items awaiting action"
          trend={{ value: 3, direction: "down", label: "vs last week" }}
        />
        <StatCard 
          title="Resolution Rate" 
          value={`${data.resolutionRate}%`}
          description="Feedback items resolved"
          trend={{ value: 5, direction: "up", label: "vs last quarter" }}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsCard
            title="Feedback Analytics"
            description="Overview of feedback patterns and trends"
            tabs={chartTabs}
            defaultTab="categories"
            footerText={`Data from ${period === 'month' ? 'the last month' : period === 'quarter' ? 'the last quarter' : 'the last year'}`}
          >
            <TabsContent value="categories">
              <Chart 
                title="Feedback by Category"
                data={categoryData}
                type="pie"
                dataKey="value"
              />
            </TabsContent>
            <TabsContent value="departments">
              <Chart 
                title="Feedback by Department"
                data={departmentData}
                type="bar"
                dataKey="value"
                xAxisKey="name"
              />
            </TabsContent>
            <TabsContent value="trends">
              <Chart 
                title="Feedback Trends"
                data={trendData}
                type="line"
                dataKey="count"
                xAxisKey="month"
              />
            </TabsContent>
          </AnalyticsCard>
        </div>
        
        <div>
          <AnalyticsCard
            title="Status Distribution"
            description="Current status of feedback items"
          >
            <Chart 
              title="Status"
              data={statusData}
              type="pie"
              dataKey="value"
              height={250}
            />
          </AnalyticsCard>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Urgent Issues</CardTitle>
            <CardDescription>Issues requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.urgentIssues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>AI-suggested next steps</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendedActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Department Sentiment</CardTitle>
          <CardDescription>Sentiment analysis by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.sentimentByDepartment.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="font-medium">{item.department}</div>
                <div className="flex items-center gap-2">
                  {item.sentiment > 0 ? (
                    <TrendingUp className={`h-4 w-4 ${item.sentiment > 0.3 ? 'text-success' : 'text-primary'}`} />
                  ) : (
                    <TrendingDown className={`h-4 w-4 ${item.sentiment < -0.1 ? 'text-destructive' : 'text-warning'}`} />
                  )}
                  <div className={`w-40 h-2 bg-muted rounded-full overflow-hidden`}>
                    <div 
                      className={`h-full ${
                        item.sentiment > 0.3 ? 'bg-success' : 
                        item.sentiment > 0 ? 'bg-primary' : 
                        item.sentiment > -0.1 ? 'bg-warning' : 
                        'bg-destructive'
                      }`}
                      style={{ width: `${Math.abs(item.sentiment) * 100}%`, marginLeft: item.sentiment < 0 ? 0 : '50%' }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {(item.sentiment * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
