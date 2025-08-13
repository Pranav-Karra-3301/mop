"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { deriveGameRandom } from "@/lib/crypto/seed"
import Image from "next/image"

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
  const [allFlips, setAllFlips] = useState<Array<{
    result: 'heads' | 'tails'
    winner: string
    round: number
  }>>([])
  const [stats, setStats] = useState({
    headsCount: 0,
    tailsCount: 0,
    player1Wins: 0,
    player2Wins: 0,
  })
  const intervalRef = useRef<NodeJS.Timeout>()
  const processedRef = useRef(0)

  // Initialize state
  useEffect(() => {
    processedRef.current = 0
    setAllFlips([])
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
    

    setStats(prev => ({
      headsCount: prev.headsCount + batchHeads,
      tailsCount: prev.tailsCount + batchTails,
      player1Wins: prev.player1Wins + batchPlayer1Wins,
      player2Wins: prev.player2Wins + batchPlayer2Wins,
    }))
    
    // Store all flips for history display
    setAllFlips(prev => [
      ...prev,
      ...results.map(result => ({
        result: result.result,
        winner: result.winner,
        round: result.gameIndex + 1
      }))
    ])
    
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
    
    // Update parent with all results from this batch
    onUpdate(session.id, processedRef.current, results)
  }



  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">{processedRef.current}/{session.count}</span>
        {processedRef.current < session.count && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 bg-green-500 rounded-full"
          />
        )}
      </div>

      {/* Score Summary */}
      <div className="flex items-center justify-center gap-8 text-center">
        <div>
          <div className="text-2xl font-bold">{stats.player1Wins}</div>
          <div className="text-sm text-muted-foreground">{player1}</div>
        </div>
        <div className="text-muted-foreground">VS</div>
        <div>
          <div className="text-2xl font-bold">{stats.player2Wins}</div>
          <div className="text-sm text-muted-foreground">{player2}</div>
        </div>
      </div>

      {/* Flip Distribution Bar Graph */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Flip Distribution</h4>
        <div className="space-y-3">
          {[
            { flip: 'heads', icon: '/heads.svg', count: stats.headsCount, color: 'bg-green-500' },
            { flip: 'tails', icon: '/tails.svg', count: stats.tailsCount, color: 'bg-red-500' }
          ].map(({ flip, icon, count, color }) => {
            const total = stats.headsCount + stats.tailsCount
            const percentage = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={flip} className="flex items-center gap-3">
                <Image 
                  src={icon} 
                  alt={flip} 
                  width={24} 
                  height={24} 
                  className="w-6 h-6 drop-shadow-sm filter brightness-105" 
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="capitalize font-medium">{flip}</span>
                    <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* All Flips History */}
      {allFlips.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">All Rounds</h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-16 gap-2">
            {allFlips.map((flip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                className={`p-2 rounded-lg border transition-colors ${
                  flip.winner === player1 ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                  flip.winner === player2 ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
                  'bg-muted/30 border-border'
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1 text-center">R{flip.round}</div>
                <div className="flex items-center justify-center">
                  <Image 
                    src={flip.result === 'heads' ? '/heads.svg' : '/tails.svg'}
                    alt={flip.result}
                    width={24}
                    height={24}
                    className="w-6 h-6 drop-shadow-sm"
                  />
                </div>
                <div className="text-xs text-center mt-1 font-medium">
                  {flip.winner.slice(0, 1)}
                </div>
              </motion.div>
            ))}
            
            {/* Empty slots for remaining rounds */}
            {Array.from({ length: session.count - allFlips.length }, (_, index) => (
              <div
                key={`empty-${index}`}
                className="p-2 rounded-lg border border-dashed border-muted/50 flex items-center justify-center"
              >
                <div className="text-xs text-muted-foreground">R{allFlips.length + index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}