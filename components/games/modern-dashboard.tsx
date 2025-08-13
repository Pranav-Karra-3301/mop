"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Eye, EyeOff, RefreshCw
} from "lucide-react"
import Image from "next/image"
import { GridCoinFlip } from "./engines/grid-coin-flip"
import { EnhancedRPS } from "./engines/enhanced-rps"
import { HighCardGame } from "./engines/high-card-game"
import { SegmentedProgress } from "@/components/ui/segmented-progress"

interface GameSession {
  id: string
  type: "coin-flip" | "rock-paper-scissors" | "high-card"
  count: number
  completed: number
  results: any[]
  isRunning: boolean
  winner?: string
}

interface ModernDashboardProps {
  sessions: GameSession[]
  player1: string
  player2: string
  masterSeed: string
  onSessionUpdate: (sessionId: string, completed: number, result?: any) => void
}

export function ModernDashboard({
  sessions,
  player1,
  player2,
  masterSeed,
  onSessionUpdate,
}: ModernDashboardProps) {
  const [isResetting, setIsResetting] = useState(false)
  const [verboseMode, setVerboseMode] = useState(true) // Show verbose by default
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
    setStreamOperations((prev) => [operation, ...prev.slice(0, 99)])
  }

  const analytics = useMemo(() => {
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

    const totalGames = sessions.reduce((sum, s) => sum + s.completed, 0)
    const totalPossible = sessions.reduce((sum, s) => sum + s.count, 0)

    return {
      player1TotalWins,
      player2TotalWins,
      totalTies,
      totalGames,
      totalPossible,
      completionRate: totalPossible > 0 ? (totalGames / totalPossible) * 100 : 0,
      player1WinRate: totalGames > 0 ? (player1TotalWins / totalGames) * 100 : 0,
      player2WinRate: totalGames > 0 ? (player2TotalWins / totalGames) * 100 : 0,
    }
  }, [sessions, player1, player2])

  const getGameGradient = (type: string) => {
    switch (type) {
      case "coin-flip":
        return "from-amber-500 to-orange-500"
      case "rock-paper-scissors":
        return "from-blue-500 to-purple-500"
      case "high-card":
        return "from-purple-500 to-pink-500"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  return (
    <div className="space-y-8">
      {/* Performance Stats Row */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div 
          className="bg-card rounded-2xl p-4 border border-border"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3">
            <Image src="/dice.svg" alt="Dice" width={28} height={28} className="w-7 h-7 drop-shadow-md filter brightness-110" />
            <div>
              <div className="text-2xl font-bold">{analytics.totalGames}</div>
              <div className="text-xs text-muted-foreground">Total Games</div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-card rounded-2xl p-4 border border-border"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3">
            <Image src="/speed.svg" alt="Speed" width={28} height={28} className="w-7 h-7 drop-shadow-md filter brightness-110" />
            <div>
              <div className="text-2xl font-bold">{Math.round(stats.gamesPerSecond)}/s</div>
              <div className="text-xs text-muted-foreground">Game Speed</div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-card rounded-2xl p-4 border border-border"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3">
            <Image src="/1.svg" alt="Player 1" width={28} height={28} className="w-7 h-7 drop-shadow-md filter brightness-110" />
            <div>
              <div className="text-2xl font-bold">{analytics.player1TotalWins}</div>
              <div className="text-xs text-muted-foreground">{player1} Wins</div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-card rounded-2xl p-4 border border-border"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3">
            <Image src="/2.svg" alt="Player 2" width={28} height={28} className="w-7 h-7 drop-shadow-md filter brightness-110" />
            <div>
              <div className="text-2xl font-bold">{analytics.player2TotalWins}</div>
              <div className="text-xs text-muted-foreground">{player2} Wins</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Engines Column */}
        <div className="lg:col-span-2 space-y-6">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="relative bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold capitalize">
                    {session.type.replace("-", " ")}
                  </h3>
                  <div className="flex items-center gap-2">
                    {session.isRunning && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 bg-green-500 rounded-full"
                      />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {session.completed}/{session.count}
                    </span>
                  </div>
                </div>

                {/* Segmented Progress Bar */}
                <div className="mb-4">
                  <SegmentedProgress 
                    value={(session.completed / session.count) * 100}
                    total={session.count}
                    className="h-2"
                  />
                </div>

                {/* Game Engine Component */}
                {session.type === "coin-flip" && (
                  <GridCoinFlip
                    session={session}
                    player1={player1}
                    player2={player2}
                    masterSeed={masterSeed}
                    onUpdate={onSessionUpdate}
                    onStreamOperation={addStreamOperation}
                  />
                )}
                {session.type === "rock-paper-scissors" && (
                  <EnhancedRPS
                    session={session}
                    player1={player1}
                    player2={player2}
                    masterSeed={masterSeed}
                    onUpdate={onSessionUpdate}
                    onStreamOperation={addStreamOperation}
                  />
                )}
                {session.type === "high-card" && (
                  <HighCardGame
                    session={session}
                    player1={player1}
                    player2={player2}
                    masterSeed={masterSeed}
                    onUpdate={onSessionUpdate}
                    onStreamOperation={addStreamOperation}
                  />
                )}

                {/* Winner Display */}
                {session.winner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Image src="/star.svg" alt="Winner" width={16} height={16} />
                      <span className="text-sm font-semibold">{session.winner} Wins!</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Analytics Sidebar */}
        <div className="space-y-6">
          {/* Overall Progress with Winner */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card rounded-2xl p-6 border border-border"
          >
            <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
            
            {/* Winner Announcement */}
            {analytics.completionRate === 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <Image src="/!.svg" alt="Winner" width={20} height={20} />
                  <span className="font-semibold">
                    {analytics.player1TotalWins > analytics.player2TotalWins ? player1 : 
                     analytics.player2TotalWins > analytics.player1TotalWins ? player2 : "Tie"} Wins!
                  </span>
                </div>
              </motion.div>
            )}
            
            {/* Progress Bar Grid */}
            <div className="space-y-4">
              <div className="flex gap-1">
                {Array.from({ length: 20 }, (_, i) => {
                  const segmentProgress = (analytics.completionRate / 100) * 20
                  const isFilled = i < segmentProgress
                  const isPartial = i === Math.floor(segmentProgress) && segmentProgress % 1 !== 0
                  
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: 1,
                        backgroundColor: isFilled ? 'rgb(59 130 246)' : 
                                       isPartial ? 'rgb(59 130 246 / 0.5)' : 
                                       'rgb(30 30 30 / 0.3)'
                      }}
                      transition={{ delay: i * 0.02 }}
                      className="flex-1 h-2 rounded-full"
                    />
                  )
                })}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(analytics.completionRate)}%</div>
                <div className="text-sm text-muted-foreground">
                  {analytics.totalGames} of {analytics.totalPossible} games
                </div>
              </div>
            </div>
            
            {/* Replay Button */}
            {analytics.completionRate === 100 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4"
              >
                <button
                  onClick={() => {
                    setIsResetting(true)
                    setTimeout(() => {
                      window.location.reload()
                    }, 500)
                  }}
                  disabled={isResetting}
                  className="w-full p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>Play Again</span>
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Win Rate Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 border border-border"
          >
            <h3 className="text-lg font-semibold mb-4">Win Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{player1}</span>
                  <span className="font-semibold">{analytics.player1TotalWins}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${analytics.player1WinRate}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{player2}</span>
                  <span className="font-semibold">{analytics.player2TotalWins}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${analytics.player2WinRate}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
              </div>
              {analytics.totalTies > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Ties</span>
                    <span className="font-semibold">{analytics.totalTies}</span>
                  </div>
                  <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-gray-500 to-gray-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(analytics.totalTies / analytics.totalGames) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Verbose Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl p-6 border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Verbose Mode</h3>
              <button
                onClick={() => setVerboseMode(!verboseMode)}
                className="p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                {verboseMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {verboseMode && (
              <div className="max-h-64 overflow-y-auto space-y-1 p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                <AnimatePresence>
                  {streamOperations.slice(0, 20).map((op, index) => {
                    const getLogColor = () => {
                      if (op.type?.includes('complete')) return 'text-green-600 dark:text-green-400'
                      if (op.type?.includes('batch')) return 'text-blue-600 dark:text-blue-400'
                      if (op.type?.includes('assignment')) return 'text-purple-600 dark:text-purple-400'
                      if (op.type?.includes('error')) return 'text-red-600 dark:text-red-400'
                      return 'text-muted-foreground'
                    }
                    
                    const formatMessage = () => {
                      if (op.message) return op.message
                      if (op.results) return `Results: ${op.results}`
                      if (op.completed && op.total) return `Progress: ${op.completed}/${op.total}`
                      if (op.winner) return `Winner: ${op.winner}`
                      if (op.batchSize) return `Batch size: ${op.batchSize}`
                      return JSON.stringify(op).substring(0, 80)
                    }
                    
                    return (
                      <motion.div
                        key={`${op.timestamp}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`text-xs font-mono ${getLogColor()}`}
                      >
                        <span className="opacity-50">[{new Date(op.timestamp || Date.now()).toLocaleTimeString()}]</span>
                        {' '}
                        <span className="font-semibold">{op.type || 'LOG'}</span>
                        {': '}
                        <span className="opacity-80">{formatMessage()}</span>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {streamOperations.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Waiting for game events...
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}