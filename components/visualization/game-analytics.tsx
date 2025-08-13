"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts"
import { TrendingUp, BarChart3, PieChartIcon, Activity, Target, Zap } from "lucide-react"

interface GameSession {
  id: string
  type: "coin-flip" | "rock-paper-scissors" | "wheel-spin"
  count: number
  completed: number
  results: any[]
  isRunning: boolean
  winner?: string
}

interface GameAnalyticsProps {
  sessions: GameSession[]
  player1: string
  player2: string
}

export function GameAnalytics({ sessions, player1, player2 }: GameAnalyticsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("all")
  const [refreshInterval, setRefreshInterval] = useState(1000)

  // Calculate comprehensive statistics
  const analytics = useMemo(() => {
    const totalGames = sessions.reduce((sum, s) => sum + s.completed, 0)
    const totalPossibleGames = sessions.reduce((sum, s) => sum + s.count, 0)
    const completionRate = totalPossibleGames > 0 ? (totalGames / totalPossibleGames) * 100 : 0

    // Player win statistics across all games
    let player1TotalWins = 0
    let player2TotalWins = 0
    let totalTies = 0

    sessions.forEach((session) => {
      session.results.forEach((result) => {
        if (result.winner === player1) player1TotalWins++
        else if (result.winner === player2) player2TotalWins++
        else if (result.winner === "Tie") totalTies++
      })
    })

    // Game type breakdown
    const gameTypeStats = sessions.map((session) => {
      const sessionPlayer1Wins = session.results.filter((r) => r.winner === player1).length
      const sessionPlayer2Wins = session.results.filter((r) => r.winner === player2).length
      const sessionTies = session.results.filter((r) => r.winner === "Tie").length

      return {
        type: session.type,
        completed: session.completed,
        total: session.count,
        player1Wins: sessionPlayer1Wins,
        player2Wins: sessionPlayer2Wins,
        ties: sessionTies,
        completionRate: (session.completed / session.count) * 100,
        player1WinRate: session.completed > 0 ? (sessionPlayer1Wins / session.completed) * 100 : 0,
        player2WinRate: session.completed > 0 ? (sessionPlayer2Wins / session.completed) * 100 : 0,
      }
    })

    // Time series data for progress tracking
    const progressData = Array.from({ length: 20 }, (_, i) => {
      const timePoint = i * 5 // Every 5% of completion
      return {
        time: `${timePoint}%`,
        coinFlip: Math.min(sessions[0]?.completed || 0, (sessions[0]?.count || 0) * (timePoint / 100)),
        rps: Math.min(sessions[1]?.completed || 0, (sessions[1]?.count || 0) * (timePoint / 100)),
        wheel: Math.min(sessions[2]?.completed || 0, (sessions[2]?.count || 0) * (timePoint / 100)),
      }
    })

    return {
      totalGames,
      totalPossibleGames,
      completionRate,
      player1TotalWins,
      player2TotalWins,
      totalTies,
      gameTypeStats,
      progressData,
      overallWinRate: {
        player1: totalGames > 0 ? (player1TotalWins / totalGames) * 100 : 0,
        player2: totalGames > 0 ? (player2TotalWins / totalGames) * 100 : 0,
        ties: totalGames > 0 ? (totalTies / totalGames) * 100 : 0,
      },
    }
  }, [sessions, player1, player2])

  // Real-time win rate data for line chart
  const winRateHistory = useMemo(() => {
    const history = []
    let cumulativeP1Wins = 0
    let cumulativeP2Wins = 0
    let cumulativeGames = 0

    // Sample every 100 games for performance
    const sampleInterval = Math.max(1, Math.floor(analytics.totalGames / 50))

    sessions.forEach((session) => {
      session.results.forEach((result, index) => {
        if (index % sampleInterval === 0) {
          cumulativeGames++
          if (result.winner === player1) cumulativeP1Wins++
          else if (result.winner === player2) cumulativeP2Wins++

          if (cumulativeGames > 0) {
            history.push({
              game: cumulativeGames * sampleInterval,
              player1Rate: (cumulativeP1Wins / cumulativeGames) * 100,
              player2Rate: (cumulativeP2Wins / cumulativeGames) * 100,
            })
          }
        }
      })
    })

    return history
  }, [sessions, player1, player2, analytics.totalGames])

  // Pie chart data for overall distribution
  const distributionData = [
    { name: player1, value: analytics.player1TotalWins, fill: "#3b82f6" },
    { name: player2, value: analytics.player2TotalWins, fill: "#ef4444" },
    { name: "Ties", value: analytics.totalTies, fill: "#6b7280" },
  ]

  // Performance metrics data
  const performanceData = analytics.gameTypeStats.map((stat) => ({
    name: stat.type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    completed: stat.completed,
    total: stat.total,
    efficiency: stat.completionRate,
    player1WinRate: stat.player1WinRate,
    player2WinRate: stat.player2WinRate,
  }))

  const chartConfig = {
    player1: {
      label: player1,
      color: "#3b82f6",
    },
    player2: {
      label: player2,
      color: "#ef4444",
    },
    ties: {
      label: "Ties",
      color: "#6b7280",
    },
    coinFlip: {
      label: "Coin Flip",
      color: "#f59e0b",
    },
    rps: {
      label: "Rock Paper Scissors",
      color: "#8b5cf6",
    },
    wheel: {
      label: "Wheel Spin",
      color: "#10b981",
    },
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{analytics.totalGames.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Games Played</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/20">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{analytics.player1TotalWins.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{player1} Wins</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-500/20">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">{analytics.player2TotalWins.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{player2} Wins</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-500/20">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-2 text-gray-500" />
            <div className="text-2xl font-bold">{analytics.totalTies.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Ties</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Win Rate by Game Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="player1WinRate" fill="var(--color-player1)" name={player1} />
                      <Bar dataKey="player2WinRate" fill="var(--color-player2)" name={player2} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Overall Win Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Overall Win Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Game Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Game Progress by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.gameTypeStats.map((stat) => (
                <div key={stat.type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium capitalize">{stat.type.replace("-", " ")}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {stat.completed.toLocaleString()}/{stat.total.toLocaleString()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{stat.completionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress value={stat.completionRate} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Real-Time Win Rate Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={winRateHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="game" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="player1Rate"
                      stroke="var(--color-player1)"
                      strokeWidth={2}
                      name={`${player1} Win Rate`}
                    />
                    <Line
                      type="monotone"
                      dataKey="player2Rate"
                      stroke="var(--color-player2)"
                      strokeWidth={2}
                      name={`${player2} Win Rate`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game Completion Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area
                      type="monotone"
                      dataKey="coinFlip"
                      stackId="1"
                      stroke="var(--color-coinFlip)"
                      fill="var(--color-coinFlip)"
                      name="Coin Flip"
                    />
                    <Area
                      type="monotone"
                      dataKey="rps"
                      stackId="1"
                      stroke="var(--color-rps)"
                      fill="var(--color-rps)"
                      name="Rock Paper Scissors"
                    />
                    <Area
                      type="monotone"
                      dataKey="wheel"
                      stackId="1"
                      stroke="var(--color-wheel)"
                      fill="var(--color-wheel)"
                      name="Wheel Spin"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Completion Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={performanceData}>
                      <RadialBar dataKey="efficiency" cornerRadius={10} fill="#8884d8" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Games Completed vs Target</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                      <Bar dataKey="total" fill="#e5e7eb" name="Target" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Game Type</th>
                      <th className="text-right p-2">Completed</th>
                      <th className="text-right p-2">Target</th>
                      <th className="text-right p-2">Efficiency</th>
                      <th className="text-right p-2">{player1} Win Rate</th>
                      <th className="text-right p-2">{player2} Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((row) => (
                      <tr key={row.name} className="border-b">
                        <td className="p-2 font-medium">{row.name}</td>
                        <td className="p-2 text-right">{row.completed.toLocaleString()}</td>
                        <td className="p-2 text-right">{row.total.toLocaleString()}</td>
                        <td className="p-2 text-right">{row.efficiency.toFixed(1)}%</td>
                        <td className="p-2 text-right">{row.player1WinRate.toFixed(1)}%</td>
                        <td className="p-2 text-right">{row.player2WinRate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {analytics.gameTypeStats.map((stat) => (
              <Card key={stat.type}>
                <CardHeader>
                  <CardTitle className="capitalize text-center">{stat.type.replace("-", " ")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{stat.completed.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Games Completed</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">{player1}</span>
                        <span className="text-sm font-semibold">{stat.player1Wins.toLocaleString()}</span>
                      </div>
                      <Progress value={stat.player1WinRate} className="h-2" />

                      <div className="flex justify-between">
                        <span className="text-sm">{player2}</span>
                        <span className="text-sm font-semibold">{stat.player2Wins.toLocaleString()}</span>
                      </div>
                      <Progress value={stat.player2WinRate} className="h-2" />

                      {stat.ties > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm">Ties</span>
                            <span className="text-sm font-semibold">{stat.ties.toLocaleString()}</span>
                          </div>
                          <Progress value={(stat.ties / stat.completed) * 100} className="h-2" />
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
