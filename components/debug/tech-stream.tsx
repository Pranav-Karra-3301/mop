"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Activity, Cpu, Database, Zap, Clock, Filter, Search, TrendingUp, Shield, Hash } from "lucide-react"

interface TechStreamProps {
  operations: any[]
  enabled: boolean
}

interface SystemMetrics {
  totalOperations: number
  operationsPerSecond: number
  memoryUsage: number
  cpuUsage: number
  cryptoOperations: number
  networkLatency: number
}

export function TechStream({ operations, enabled }: TechStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalOperations: 0,
    operationsPerSecond: 0,
    memoryUsage: 45,
    cpuUsage: 23,
    cryptoOperations: 0,
    networkLatency: 12,
  })

  useEffect(() => {
    if (operations.length > 0) {
      const now = Date.now()
      const recentOps = operations.filter((op) => now - op.timestamp < 1000)
      const cryptoOps = operations.filter(
        (op) => op.type.includes("crypto") || op.type.includes("seed") || op.type.includes("random"),
      )

      setMetrics((prev) => ({
        ...prev,
        totalOperations: operations.length,
        operationsPerSecond: recentOps.length,
        cryptoOperations: cryptoOps.length,
        memoryUsage: Math.min(95, 45 + operations.length / 100),
        cpuUsage: Math.min(90, 23 + recentOps.length * 2),
      }))
    }
  }, [operations])

  useEffect(() => {
    if (scrollRef.current && enabled && autoScroll) {
      scrollRef.current.scrollTop = 0
    }
  }, [operations, enabled, autoScroll])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
  }

  const getOperationColor = (type: string) => {
    switch (type) {
      case "coin-flip-batch":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
      case "rps-game":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
      case "wheel-spin":
        return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30"
      case "crypto-operation":
        return "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
      case "system-metric":
        return "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
      case "performance":
        return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30"
      case "multi-game-start":
        return "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
      default:
        return "bg-muted/50 border-muted"
    }
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case "coin-flip-batch":
        return "🪙"
      case "rps-game":
        return "✂️"
      case "wheel-spin":
        return "🎯"
      case "crypto-operation":
        return <Shield className="h-4 w-4" />
      case "system-metric":
        return <Activity className="h-4 w-4" />
      case "performance":
        return <TrendingUp className="h-4 w-4" />
      case "multi-game-start":
        return <Zap className="h-4 w-4" />
      default:
        return "⚡"
    }
  }

  const getPriorityLevel = (type: string) => {
    const highPriority = ["crypto-operation", "multi-game-start", "system-error"]
    const mediumPriority = ["performance", "system-metric"]

    if (highPriority.includes(type)) return "HIGH"
    if (mediumPriority.includes(type)) return "MED"
    return "LOW"
  }

  const filteredOperations = operations.filter((op) => {
    const matchesFilter =
      !filter ||
      op.type.toLowerCase().includes(filter.toLowerCase()) ||
      (op.winner && op.winner.toLowerCase().includes(filter.toLowerCase())) ||
      (op.gameIndex && op.gameIndex.toString().includes(filter))

    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(op.type)

    return matchesFilter && matchesType
  })

  const operationTypes = [...new Set(operations.map((op) => op.type))]

  if (!enabled) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div className="text-4xl mb-2">⏸️</div>
        <div>Tech stream paused</div>
        <div className="text-sm mt-2">Missing {operations.length} operations</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-3 text-center">
            <Activity className="h-4 w-4 mx-auto mb-1 text-primary" />
            <div className="font-bold text-lg">{metrics.totalOperations.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Ops</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <div className="font-bold text-lg">{metrics.operationsPerSecond}</div>
            <div className="text-xs text-muted-foreground">Ops/Sec</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-500/20">
          <CardContent className="p-3 text-center">
            <Shield className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <div className="font-bold text-lg">{metrics.cryptoOperations}</div>
            <div className="text-xs text-muted-foreground">Crypto Ops</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/20">
          <CardContent className="p-3 text-center">
            <Cpu className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <div className="font-bold text-lg">{metrics.cpuUsage}%</div>
            <div className="text-xs text-muted-foreground">CPU</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-500/20">
          <CardContent className="p-3 text-center">
            <Database className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <div className="font-bold text-lg">{metrics.memoryUsage}%</div>
            <div className="text-xs text-muted-foreground">Memory</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-teal-500/20">
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-teal-500" />
            <div className="font-bold text-lg">{metrics.networkLatency}ms</div>
            <div className="text-xs text-muted-foreground">Latency</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Operation Stream
              <Badge variant="secondary" className="ml-2">
                {filteredOperations.length}/{operations.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAutoScroll(!autoScroll)} className="text-xs">
                {autoScroll ? "Auto" : "Manual"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search operations..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedTypes([])} className="whitespace-nowrap">
              <Filter className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Operation Type Filters */}
          <div className="flex flex-wrap gap-2">
            {operationTypes.map((type) => (
              <Badge
                key={type}
                variant={selectedTypes.includes(type) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => {
                  setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
                }}
              >
                {type}
              </Badge>
            ))}
          </div>

          <Separator />

          {/* Operations List */}
          {filteredOperations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="text-4xl mb-2">🔍</div>
              <div>No operations match your filter</div>
            </div>
          ) : (
            <ScrollArea className="h-96" ref={scrollRef}>
              <div className="space-y-2">
                {filteredOperations.map((op, index) => (
                  <Card
                    key={`${op.timestamp}-${index}`}
                    className={`border-l-4 ${getOperationColor(op.type)} transition-all duration-200 hover:shadow-md`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getOperationIcon(op.type)}</span>
                          <Badge variant="outline" className={`text-xs font-mono ${getOperationColor(op.type)}`}>
                            {op.type}
                          </Badge>
                          <Badge
                            variant={getPriorityLevel(op.type) === "HIGH" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {getPriorityLevel(op.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatTimestamp(op.timestamp)}
                          </span>
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">
                            {op.sessionId?.slice(-6) || "SYSTEM"}
                          </span>
                        </div>
                      </div>

                      <div className="font-mono text-xs space-y-1 bg-muted/30 p-2 rounded">
                        {op.type === "coin-flip-batch" && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Game Index:</span>
                              <span>#{op.gameIndex?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Result:</span>
                              <span className="font-semibold">{op.result}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Winner:</span>
                              <span className="text-primary font-semibold">{op.winner}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Batch Size:</span>
                              <span>50 operations</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Processing Time:</span>
                              <span>~100ms</span>
                            </div>
                          </>
                        )}

                        {op.type === "rps-game" && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Game Index:</span>
                              <span>#{op.gameIndex?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Player 1 Move:</span>
                              <span className="font-semibold">{op.player1Move}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Player 2 Move:</span>
                              <span className="font-semibold">{op.player2Move}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Winner:</span>
                              <span className="text-primary font-semibold">{op.winner}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">RNG Calls:</span>
                              <span>2 (P1, P2)</span>
                            </div>
                          </>
                        )}

                        {op.type === "wheel-spin" && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Game Index:</span>
                              <span>#{op.gameIndex?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Segment:</span>
                              <span className="font-semibold">{op.segment}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Winner:</span>
                              <span className="text-primary font-semibold">{op.winner}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Segments:</span>
                              <span>8 total</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Probability:</span>
                              <span>12.5% each</span>
                            </div>
                          </>
                        )}

                        {op.type === "multi-game-start" && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Master Seed:</span>
                              <span className="font-mono text-xs">{op.masterSeed?.slice(0, 16)}...</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sessions:</span>
                              <span>{op.sessions?.length} parallel</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Games:</span>
                              <span>
                                {op.sessions?.reduce((sum: number, s: any) => sum + s.count, 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Players:</span>
                              <span>{op.players?.join(" vs ")}</span>
                            </div>
                          </>
                        )}

                        {/* System Performance Indicator */}
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">System Load:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={metrics.cpuUsage} className="w-12 h-1" />
                            <span className="text-xs">{metrics.cpuUsage}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
