"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SegmentedProgress } from "@/components/ui/segmented-progress"
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

interface HighCardGameProps {
  session: GameSession
  player1: string
  player2: string
  masterSeed: string
  onUpdate: (sessionId: string, completed: number, result?: any) => void
  onStreamOperation: (operation: any) => void
}

const SUITS = ["♠", "♥", "♦", "♣"] as const
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const
const RANK_VALUES = { "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14 }

type Suit = typeof SUITS[number]
type Rank = typeof RANKS[number]

interface PlayingCard {
  suit: Suit
  rank: Rank
  value: number
}

export function HighCardGame({
  session,
  player1,
  player2,
  masterSeed,
  onUpdate,
  onStreamOperation,
}: HighCardGameProps) {
  const [currentDeal, setCurrentDeal] = useState<{
    player1Card: PlayingCard | null
    player2Card: PlayingCard | null
    winner: string | null
  }>({ player1Card: null, player2Card: null, winner: null })
  
  const [allDeals, setAllDeals] = useState<Array<{
    player1Card: PlayingCard
    player2Card: PlayingCard
    winner: string
    round: number
  }>>([])
  
  const [isDealing, setIsDealing] = useState(false)
  const [stats, setStats] = useState({
    player1Wins: 0,
    player2Wins: 0,
    ties: 0,
    highestCard: null as PlayingCard | null,
    lowestCard: null as PlayingCard | null,
  })
  
  const intervalRef = useRef<NodeJS.Timeout>()
  const processedRef = useRef(0)

  useEffect(() => {
    processedRef.current = session.completed
    setStats({
      player1Wins: 0,
      player2Wins: 0,
      ties: 0,
      highestCard: null,
      lowestCard: null,
    })
    
    // Count existing results
    session.results.forEach(result => {
      if (result.winner === player1) {
        setStats(prev => ({ ...prev, player1Wins: prev.player1Wins + 1 }))
      } else if (result.winner === player2) {
        setStats(prev => ({ ...prev, player2Wins: prev.player2Wins + 1 }))
      } else if (result.winner === "Tie") {
        setStats(prev => ({ ...prev, ties: prev.ties + 1 }))
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
    
    const batchSize = 3
    const delay = 600 // Slower for card animations
    
    intervalRef.current = setInterval(() => {
      if (processedRef.current >= session.count) {
        clearInterval(intervalRef.current!)
        intervalRef.current = undefined
        onStreamOperation({
          type: "game-complete",
          sessionId: session.id,
          message: `High Card completed: ${session.count} games`,
          timestamp: Date.now(),
        })
        return
      }
      
      processBatch(batchSize)
    }, delay)
  }

  const drawCard = (seed: number): PlayingCard => {
    const cardIndex = Math.floor(seed * 52)
    const suitIndex = Math.floor(cardIndex / 13)
    const rankIndex = cardIndex % 13
    
    return {
      suit: SUITS[suitIndex],
      rank: RANKS[rankIndex],
      value: RANK_VALUES[RANKS[rankIndex]],
    }
  }

  const processBatch = (batchSize: number) => {
    const remaining = session.count - processedRef.current
    const currentBatch = Math.min(batchSize, remaining)
    
    if (currentBatch <= 0) return
    
    setIsDealing(true)
    
    const results = []
    
    for (let i = 0; i < currentBatch; i++) {
      const gameIndex = processedRef.current + i
      
      // Draw cards for both players
      const p1Seed = deriveGameRandom(masterSeed, `card-p1-${session.id}`, gameIndex)
      const p2Seed = deriveGameRandom(masterSeed, `card-p2-${session.id}`, gameIndex)
      
      const player1Card = drawCard(p1Seed)
      const player2Card = drawCard(p2Seed)
      
      let winner: string
      if (player1Card.value > player2Card.value) {
        winner = player1
      } else if (player2Card.value > player1Card.value) {
        winner = player2
      } else {
        // Same rank, compare suits (♠ > ♥ > ♦ > ♣)
        const suitOrder = { "♠": 4, "♥": 3, "♦": 2, "♣": 1 }
        if (suitOrder[player1Card.suit] > suitOrder[player2Card.suit]) {
          winner = player1
        } else if (suitOrder[player2Card.suit] > suitOrder[player1Card.suit]) {
          winner = player2
        } else {
          winner = "Tie"
        }
      }
      
      results.push({
        gameIndex,
        player1Card,
        player2Card,
        winner,
        p1Seed: p1Seed.toFixed(6),
        p2Seed: p2Seed.toFixed(6),
        timestamp: Date.now(),
      })
      
      // Update stats
      if (winner === player1) {
        setStats(prev => ({ ...prev, player1Wins: prev.player1Wins + 1 }))
      } else if (winner === player2) {
        setStats(prev => ({ ...prev, player2Wins: prev.player2Wins + 1 }))
      } else {
        setStats(prev => ({ ...prev, ties: prev.ties + 1 }))
      }
      
      // Track highest and lowest cards
      const cards = [player1Card, player2Card]
      cards.forEach(card => {
        if (!stats.highestCard || card.value > stats.highestCard.value) {
          setStats(prev => ({ ...prev, highestCard: card }))
        }
        if (!stats.lowestCard || card.value < stats.lowestCard.value) {
          setStats(prev => ({ ...prev, lowestCard: card }))
        }
      })
    }
    
    const lastResult = results[results.length - 1]
    setCurrentDeal({
      player1Card: lastResult.player1Card,
      player2Card: lastResult.player2Card,
      winner: lastResult.winner,
    })
    
    // Store all deals for display
    setAllDeals(prev => [
      ...prev,
      ...results.map(result => ({
        player1Card: result.player1Card,
        player2Card: result.player2Card,
        winner: result.winner,
        round: result.gameIndex + 1
      }))
    ])
    
    processedRef.current += currentBatch
    
    // Log batch results
    onStreamOperation({
      type: "high-card-batch",
      sessionId: session.id,
      batchSize: currentBatch,
      results: results.map(r => 
        `${r.player1Card.rank}${r.player1Card.suit} vs ${r.player2Card.rank}${r.player2Card.suit} = ${r.winner}`
      ).join(", "),
      completed: processedRef.current,
      total: session.count,
      timestamp: Date.now(),
    })
    
    // Update parent
    onUpdate(session.id, processedRef.current, lastResult)
    
    setTimeout(() => {
      setIsDealing(false)
    }, 400)
  }

  const getCardSvgPath = (card: PlayingCard | null): string => {
    if (!card) return "/cards/1B.svg" // Card back
    
    // Map suits to SVG naming convention
    const suitMap = {
      "♠": "S", // Spades
      "♥": "H", // Hearts  
      "♦": "D", // Diamonds
      "♣": "C"  // Clubs
    }
    
    // Map ranks to SVG naming convention
    const rankMap: { [key: string]: string } = {
      "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
      "10": "T", // Ten is represented as 'T'
      "J": "J", "Q": "Q", "K": "K", "A": "A"
    }
    
    const svgRank = rankMap[card.rank] || card.rank
    const svgSuit = suitMap[card.suit] || "S"
    
    return `/cards/${svgRank}${svgSuit}.svg`
  }

  const CardComponent = ({ card, isRevealed }: { card: PlayingCard | null, isRevealed: boolean }) => {
    return (
      <motion.div
        className="relative"
        initial={{ rotateY: 180 }}
        animate={{ rotateY: isRevealed ? 0 : 180 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Card Back */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <Image
            src="/cards/1B.svg"
            alt="Card back"
            width={80}
            height={112}
            className="w-[80px] h-[112px] md:w-[96px] md:h-[134px] drop-shadow-lg filter brightness-105"
          />
        </div>
        
        {/* Card Front */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          <Image
            src={getCardSvgPath(card)}
            alt={card ? `${card.rank} of ${card.suit}` : "Card"}
            width={80}
            height={112}
            className="w-[80px] h-[112px] md:w-[96px] md:h-[134px] drop-shadow-lg filter brightness-105"
          />
        </div>
      </motion.div>
    )
  }

  const progress = (processedRef.current / session.count) * 100

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{processedRef.current}/{session.count}</span>
          {processedRef.current < session.count && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-green-500 rounded-full"
            />
          )}
        </div>
        <SegmentedProgress value={progress} total={session.count} className="flex-1 ml-4 h-1.5" />
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
        {stats.ties > 0 && (
          <>
            <div className="text-muted-foreground">|</div>
            <div>
              <div className="text-xl font-bold">{stats.ties}</div>
              <div className="text-sm text-muted-foreground">Ties</div>
            </div>
          </>
        )}
      </div>

      {/* All Deals Grid */}
      {allDeals.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">All Rounds</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {allDeals.map((deal, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg border transition-colors ${
                  deal.winner === player1 ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                  deal.winner === player2 ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' :
                  'bg-muted/30 border-border'
                }`}
              >
                <div className="text-xs text-muted-foreground mb-2 text-center">Round {deal.round}</div>
                <div className="flex items-center justify-center gap-2">
                  <Image 
                    src={getCardSvgPath(deal.player1Card)}
                    alt={`${deal.player1Card.rank} of ${deal.player1Card.suit}`}
                    width={32}
                    height={45}
                    className="w-8 h-auto drop-shadow-sm"
                  />
                  <div className="text-xs text-muted-foreground">vs</div>
                  <Image 
                    src={getCardSvgPath(deal.player2Card)}
                    alt={`${deal.player2Card.rank} of ${deal.player2Card.suit}`}
                    width={32}
                    height={45}
                    className="w-8 h-auto drop-shadow-sm"
                  />
                </div>
                <div className="text-xs text-center mt-2 font-medium">
                  {deal.winner === "Tie" ? "Tie" : deal.winner}
                </div>
              </motion.div>
            ))}
            
            {/* Empty slots for remaining rounds */}
            {Array.from({ length: session.count - allDeals.length }, (_, index) => (
              <div
                key={`empty-${index}`}
                className="p-3 rounded-lg border border-dashed border-muted/50 flex items-center justify-center"
              >
                <div className="text-xs text-muted-foreground">Round {allDeals.length + index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}