"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SegmentedProgress } from "@/components/ui/segmented-progress"
import { deriveGameRandom } from "@/lib/crypto/seed"

interface GameSession {
  id: string
  type: string
  count: number
  completed: number
  results: any[]
  isRunning: boolean
  winner?: string
}

interface EnhancedCoinFlipProps {
  session: GameSession
  player1: string
  player2: string
  masterSeed: string
  onUpdate: (sessionId: string, completed: number, result?: any) => void
  onStreamOperation: (operation: any) => void
}

export function EnhancedCoinFlip({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: EnhancedCoinFlipProps) {
  const [currentFlip, setCurrentFlip] = useState<"heads" | "tails" | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [stats, setStats] = useState({
    headsCount: 0,
    tailsCount: 0,
    player1Wins: 0,
    player2Wins: 0,
  })
  const intervalRef = useRef<NodeJS.Timeout>()
  const processedRef = useRef(0)

  useEffect(() => {
    processedRef.current = session.completed
    setStats({
      headsCount: 0,
      tailsCount: 0,
      player1Wins: 0,
      player2Wins: 0,
    })
    
    // Count existing results
    session.results.forEach(result => {
      if (result.result === "heads") {
        setStats(prev => ({ ...prev, headsCount: prev.headsCount + 1 }))
      } else {
        setStats(prev => ({ ...prev, tailsCount: prev.tailsCount + 1 }))
      }
      if (result.winner === player1) {
        setStats(prev => ({ ...prev, player1Wins: prev.player1Wins + 1 }))
      } else if (result.winner === player2) {
        setStats(prev => ({ ...prev, player2Wins: prev.player2Wins + 1 }))
      }
    })
  }, [session.id])

  useEffect(() => {
    if (session.isRunning && processedRef.current < session.count) {
      startProcessing()
    } else if (processedRef.current >= session.count && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [session.isRunning, session.count])

  const startProcessing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    const batchSize = 10
    const delay = 200 // Slower for better visualization
    
    intervalRef.current = setInterval(() => {
      if (processedRef.current >= session.count) {
        clearInterval(intervalRef.current!)
        intervalRef.current = undefined
        onStreamOperation({
          type: "game-complete",
          sessionId: session.id,
          message: `Coin flip completed: ${session.count} games`,
          timestamp: Date.now(),
        })
        return
      }
      
      processBatch(batchSize)
    }, delay)
  }

  const processBatch = (batchSize: number) => {
    const remaining = session.count - processedRef.current
    const currentBatch = Math.min(batchSize, remaining)
    
    if (currentBatch <= 0) return
    
    setIsFlipping(true)
    setRotation(prev => prev + 720) // Two full rotations
    
    const results = []
    
    // Determine side assignment for this batch
    const assignmentSeed = deriveGameRandom(masterSeed, `assignment-${session.id}`, processedRef.current)
    const headsPlayer = assignmentSeed < 0.5 ? player1 : player2
    const tailsPlayer = headsPlayer === player1 ? player2 : player1
    
    onStreamOperation({
      type: "coin-assignment",
      sessionId: session.id,
      heads: headsPlayer,
      tails: tailsPlayer,
      batchStart: processedRef.current,
      batchSize: currentBatch,
      timestamp: Date.now(),
    })
    
    for (let i = 0; i < currentBatch; i++) {
      const gameIndex = processedRef.current + i
      const flipSeed = deriveGameRandom(masterSeed, `flip-${session.id}`, gameIndex)
      const result = flipSeed < 0.5 ? "heads" : "tails"
      const winner = result === "heads" ? headsPlayer : tailsPlayer
      
      results.push({
        gameIndex,
        result,
        winner,
        seed: flipSeed.toFixed(6),
        timestamp: Date.now(),
      })
      
      // Update stats
      if (result === "heads") {
        setStats(prev => ({ ...prev, headsCount: prev.headsCount + 1 }))
      } else {
        setStats(prev => ({ ...prev, tailsCount: prev.tailsCount + 1 }))
      }
      
      if (winner === player1) {
        setStats(prev => ({ ...prev, player1Wins: prev.player1Wins + 1 }))
      } else if (winner === player2) {
        setStats(prev => ({ ...prev, player2Wins: prev.player2Wins + 1 }))
      }
    }
    
    const lastResult = results[results.length - 1]
    setCurrentFlip(lastResult.result)
    
    processedRef.current += currentBatch
    
    // Log batch results
    onStreamOperation({
      type: "batch-results",
      sessionId: session.id,
      batchSize: currentBatch,
      results: results.map(r => `${r.result}:${r.winner}`).join(", "),
      completed: processedRef.current,
      total: session.count,
      timestamp: Date.now(),
    })
    
    // Update parent
    onUpdate(session.id, processedRef.current, lastResult)
    
    setTimeout(() => {
      setIsFlipping(false)
    }, 150)
  }

  const progress = (processedRef.current / session.count) * 100
  const headsPercent = stats.headsCount > 0 ? (stats.headsCount / Math.max(processedRef.current, 1)) * 100 : 0
  const tailsPercent = stats.tailsCount > 0 ? (stats.tailsCount / Math.max(processedRef.current, 1)) * 100 : 0

  return (
    <div className="space-y-4">
      {/* 3D Coin Animation */}
      <div className="flex justify-center py-4">
        <motion.div
          className="relative w-24 h-24"
          animate={{
            rotateY: rotation,
            scale: isFlipping ? 1.2 : 1,
          }}
          transition={{
            rotateY: { duration: 0.5, ease: "easeInOut" },
            scale: { duration: 0.2 },
          }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Heads Side */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-4xl shadow-xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            👑
          </div>
          {/* Tails Side */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-4xl shadow-xl"
            style={{ 
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)"
            }}
          >
            🦅
          </div>
        </motion.div>
      </div>

      {/* Current Result */}
      <AnimatePresence mode="wait">
        {currentFlip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-center"
          >
            <Badge variant="outline" className="text-lg px-4 py-1">
              {currentFlip === "heads" ? "👑 Heads" : "🦅 Tails"}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span className="font-mono">{processedRef.current}/{session.count}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold">{stats.headsCount}</div>
                <div className="text-xs text-muted-foreground">Heads ({headsPercent.toFixed(1)}%)</div>
              </div>
              <div className="text-3xl">👑</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold">{stats.tailsCount}</div>
                <div className="text-xs text-muted-foreground">Tails ({tailsPercent.toFixed(1)}%)</div>
              </div>
              <div className="text-3xl">🦅</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <span className="font-medium">{player1}</span>
          <div className="flex items-center gap-2">
            <SegmentedProgress value={(stats.player1Wins / Math.max(processedRef.current, 1)) * 100} total={20} className="w-20 h-1.5" />
            <Badge variant="secondary">{stats.player1Wins}</Badge>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <span className="font-medium">{player2}</span>
          <div className="flex items-center gap-2">
            <SegmentedProgress value={(stats.player2Wins / Math.max(processedRef.current, 1)) * 100} total={20} className="w-20 h-1.5" />
            <Badge variant="secondary">{stats.player2Wins}</Badge>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="text-center text-xs text-muted-foreground">
        {processedRef.current < session.count ? (
          <span className="flex items-center justify-center gap-1">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-green-500 rounded-full"
            />
            Processing...
          </span>
        ) : (
          <span className="text-green-600">✓ Complete</span>
        )}
      </div>
    </div>
  )
}