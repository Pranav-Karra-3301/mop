"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
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

interface GridCoinFlipProps {
  session: GameSession
  player1: string
  player2: string
  masterSeed: string
  onUpdate: (sessionId: string, completed: number, result?: any) => void
  onStreamOperation: (operation: any) => void
}

export function GridCoinFlip({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: GridCoinFlipProps) {
  const [grid, setGrid] = useState<Array<{ result: 'heads' | 'tails' | null, index: number }>>([])
  const [stats, setStats] = useState({
    headsCount: 0,
    tailsCount: 0,
    player1Wins: 0,
    player2Wins: 0,
  })
  const intervalRef = useRef<NodeJS.Timeout>()
  const processedRef = useRef(0)

  // Initialize grid
  useEffect(() => {
    const gridSize = session.count
    const initialGrid = Array.from({ length: gridSize }, (_, i) => ({
      result: null as 'heads' | 'tails' | null,
      index: i
    }))
    setGrid(initialGrid)
    processedRef.current = 0
    setStats({
      headsCount: 0,
      tailsCount: 0,
      player1Wins: 0,
      player2Wins: 0,
    })
  }, [session.id, session.count])

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
    
    const batchSize = Math.ceil(session.count / 20) // Process in 20 steps
    const delay = 100
    
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
    
    const results = []
    const newGrid = [...grid]
    
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
    
    let batchHeads = 0
    let batchTails = 0
    let batchPlayer1Wins = 0
    let batchPlayer2Wins = 0
    
    for (let i = 0; i < currentBatch; i++) {
      const gameIndex = processedRef.current + i
      const flipSeed = deriveGameRandom(masterSeed, `flip-${session.id}`, gameIndex)
      const result = flipSeed < 0.5 ? "heads" : "tails"
      const winner = result === "heads" ? headsPlayer : tailsPlayer
      
      // Update grid
      newGrid[gameIndex] = { result, index: gameIndex }
      
      results.push({
        gameIndex,
        result,
        winner,
        seed: flipSeed.toFixed(6),
        timestamp: Date.now(),
      })
      
      // Update stats
      if (result === "heads") batchHeads++
      else batchTails++
      
      if (winner === player1) batchPlayer1Wins++
      else if (winner === player2) batchPlayer2Wins++
    }
    
    setGrid(newGrid)
    setStats(prev => ({
      headsCount: prev.headsCount + batchHeads,
      tailsCount: prev.tailsCount + batchTails,
      player1Wins: prev.player1Wins + batchPlayer1Wins,
      player2Wins: prev.player2Wins + batchPlayer2Wins,
    }))
    
    processedRef.current += currentBatch
    
    // Log batch results
    onStreamOperation({
      type: "batch-results",
      sessionId: session.id,
      batchSize: currentBatch,
      completed: processedRef.current,
      total: session.count,
      timestamp: Date.now(),
    })
    
    // Update parent
    const lastResult = results[results.length - 1]
    onUpdate(session.id, processedRef.current, lastResult)
  }

  // Calculate grid dimensions
  const getGridDimensions = () => {
    const total = session.count
    if (total <= 25) return { cols: 5, rows: Math.ceil(total / 5) }
    if (total <= 50) return { cols: 10, rows: Math.ceil(total / 10) }
    if (total <= 100) return { cols: 20, rows: Math.ceil(total / 20) }
    return { cols: 25, rows: Math.ceil(total / 25) }
  }

  const { cols, rows } = getGridDimensions()
  const cellSize = Math.min(20, 400 / Math.max(cols, rows))

  // Get player colors (neutral)
  const player1Color = "rgb(100 116 139)" // slate-500
  const player2Color = "rgb(71 85 105)" // slate-600

  return (
    <div className="space-y-4">
      {/* Grid Visualization */}
      <div className="flex justify-center p-4">
        <div 
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          }}
        >
          {grid.slice(0, session.count).map((cell, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0 }}
              animate={{ 
                scale: cell.result ? 1 : 0.3,
                backgroundColor: cell.result === 'heads' 
                  ? player1Color 
                  : cell.result === 'tails' 
                  ? player2Color 
                  : 'rgb(30 30 30 / 0.5)'
              }}
              transition={{ 
                duration: 0.3,
                delay: cell.result ? 0 : 0
              }}
              className="rounded-sm"
              style={{
                width: cellSize,
                height: cellSize,
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: player1Color }}
          />
          <span>Heads ({player1})</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: player2Color }}
          />
          <span>Tails ({player2})</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.headsCount}
          </div>
          <div className="text-xs text-muted-foreground">
            Heads ({((stats.headsCount / Math.max(processedRef.current, 1)) * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.tailsCount}
          </div>
          <div className="text-xs text-muted-foreground">
            Tails ({((stats.tailsCount / Math.max(processedRef.current, 1)) * 100).toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Player Wins */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <span className="font-medium">{player1}</span>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {((stats.player1Wins / Math.max(processedRef.current, 1)) * 100).toFixed(1)}%
            </div>
            <span className="font-semibold">{stats.player1Wins}</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <span className="font-medium">{player2}</span>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {((stats.player2Wins / Math.max(processedRef.current, 1)) * 100).toFixed(1)}%
            </div>
            <span className="font-semibold">{stats.player2Wins}</span>
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
            Processing {processedRef.current}/{session.count}
          </span>
        ) : (
          <span className="text-green-600">✓ Complete</span>
        )}
      </div>
    </div>
  )
}