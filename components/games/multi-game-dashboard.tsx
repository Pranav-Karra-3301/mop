"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoinFlipEngine } from "./engines/coin-flip-engine"
import { RockPaperScissorsEngine } from "./engines/rock-paper-scissors-engine"
import { WheelSpinEngine } from "./engines/wheel-spin-engine"
import { BlackjackEngine } from "./engines/blackjack-engine"
import { PokerHandEngine } from "./engines/poker-hand-engine"
import { DeckShuffleEngine } from "./engines/deck-shuffle-engine"
import { TechStream } from "../debug/tech-stream"
import { GameAnalytics } from "../visualization/game-analytics"
import { CryptoTransparencyPanel } from "../crypto/crypto-transparency-panel"
import { Activity, Cpu, BarChart3, Shield } from "lucide-react"

interface GameSession {
  id: string
  type: "coin-flip" | "rock-paper-scissors" | "wheel-spin" | "blackjack" | "poker-hand" | "deck-shuffle"
  count: number
  completed: number
  results: any[]
  isRunning: boolean
  winner?: string
}

interface MultiGameDashboardProps {
  sessions: GameSession[]
  player1: string
  player2: string
  masterSeed: string
  onSessionUpdate: (sessionId: string, completed: number, result?: any) => void
  onDebugOperation: (type: string, data: any) => void
}

export function MultiGameDashboard({
  sessions,
  player1,
  player2,
  masterSeed,
  onSessionUpdate,
  onDebugOperation,
}: MultiGameDashboardProps) {
  const [streamEnabled, setStreamEnabled] = useState(true)
  const [streamOperations, setStreamOperations] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalGames: 0,
    gamesPerSecond: 0,
    startTime: Date.now(),
  })

  useEffect(() => {
    const totalGames = sessions.reduce((sum, s) => sum + s.completed, 0)
    const elapsed = (Date.now() - stats.startTime) / 1000
    const gamesPerSecond = elapsed > 0 ? totalGames / elapsed : 0

    setStats((prev) => ({
      ...prev,
      totalGames,
      gamesPerSecond,
    }))
  }, [sessions, stats.startTime])

  const addStreamOperation = (operation: any) => {
    if (streamEnabled) {
      setStreamOperations((prev) => [operation, ...prev.slice(0, 99)]) // Keep last 100
    }
  }

  const getGameIcon = (type: string) => {
    switch (type) {
      case "coin-flip":
        return "🪙"
      case "rock-paper-scissors":
        return "✂️"
      case "wheel-spin":
        return "🎯"
      case "blackjack":
        return "🃏"
      case "poker-hand":
        return "🎰"
      case "deck-shuffle":
        return "🔀"
      default:
        return "🎮"
    }
  }

  const getGameColor = (type: string) => {
    switch (type) {
      case "coin-flip":
        return "from-yellow-500 to-orange-500"
      case "rock-paper-scissors":
        return "from-blue-500 to-purple-500"
      case "wheel-spin":
        return "from-green-500 to-teal-500"
      case "blackjack":
        return "from-red-500 to-pink-500"
      case "poker-hand":
        return "from-purple-500 to-indigo-500"
      case "deck-shuffle":
        return "from-cyan-500 to-blue-500"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Performance Stats */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Live Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalGames.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{Math.round(stats.gamesPerSecond)}</div>
              <div className="text-sm text-muted-foreground">Games/Second</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{sessions.filter((s) => s.isRunning).length}</div>
              <div className="text-sm text-muted-foreground">Active Engines</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {Math.round((Date.now() - stats.startTime) / 1000)}s
              </div>
              <div className="text-sm text-muted-foreground">Runtime</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="engines" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="engines" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Game Engines
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="crypto" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Crypto Transparency
          </TabsTrigger>
          <TabsTrigger value="stream" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Tech Stream
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engines" className="space-y-6">
          {/* Game Engines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-r ${getGameColor(session.type)} flex items-center justify-center text-white text-sm`}
                    >
                      {getGameIcon(session.type)}
                    </div>
                    <span className="capitalize">{session.type.replace("-", " ")}</span>
                    <Badge variant={session.isRunning ? "default" : "secondary"} className="ml-auto">
                      {session.isRunning ? "Running" : "Complete"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {session.completed.toLocaleString()}/{session.count.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={(session.completed / session.count) * 100} className="h-3" />
                  </div>

                  {session.winner && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="font-semibold text-primary">{session.winner} Wins!</div>
                      <div className="text-sm text-muted-foreground">
                        {session.results.filter((r) => r.winner === session.winner).length} victories
                      </div>
                    </div>
                  )}

                  {/* Game Engine Component */}
                  {session.type === "coin-flip" && (
                    <CoinFlipEngine
                      session={session}
                      player1={player1}
                      player2={player2}
                      masterSeed={masterSeed}
                      onUpdate={onSessionUpdate}
                      onStreamOperation={addStreamOperation}
                    />
                  )}
                  {session.type === "rock-paper-scissors" && (
                    <RockPaperScissorsEngine
                      session={session}
                      player1={player1}
                      player2={player2}
                      masterSeed={masterSeed}
                      onUpdate={onSessionUpdate}
                      onStreamOperation={addStreamOperation}
                    />
                  )}
                  {session.type === "wheel-spin" && (
                    <WheelSpinEngine
                      session={session}
                      player1={player1}
                      player2={player2}
                      masterSeed={masterSeed}
                      onUpdate={onSessionUpdate}
                      onStreamOperation={addStreamOperation}
                    />
                  )}
                  {session.type === "blackjack" && (
                    <BlackjackEngine
                      session={session}
                      player1={player1}
                      player2={player2}
                      masterSeed={masterSeed}
                      onUpdate={onSessionUpdate}
                      onStreamOperation={addStreamOperation}
                    />
                  )}
                  {session.type === "poker-hand" && (
                    <PokerHandEngine
                      session={session}
                      player1={player1}
                      player2={player2}
                      masterSeed={masterSeed}
                      onUpdate={onSessionUpdate}
                      onStreamOperation={addStreamOperation}
                    />
                  )}
                  {session.type === "deck-shuffle" && (
                    <DeckShuffleEngine
                      session={session}
                      player1={player1}
                      player2={player2}
                      masterSeed={masterSeed}
                      onUpdate={onSessionUpdate}
                      onStreamOperation={addStreamOperation}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <GameAnalytics sessions={sessions} player1={player1} player2={player2} />
        </TabsContent>

        <TabsContent value="crypto" className="space-y-6">
          <CryptoTransparencyPanel
            sessions={sessions}
            masterSeed={masterSeed}
            player1={player1}
            player2={player2}
            operations={streamOperations}
          />
        </TabsContent>

        <TabsContent value="stream" className="space-y-6">
          {/* Tech Stream */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Real-Time Tech Stream
                </div>
                <Button variant="outline" size="sm" onClick={() => setStreamEnabled(!streamEnabled)}>
                  {streamEnabled ? "Pause" : "Resume"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TechStream operations={streamOperations} enabled={streamEnabled} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
