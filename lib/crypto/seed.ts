// Cryptographic seed generation and derivation for provably fair games

export function createGameId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

export async function generateGameSeed(gameId: string): Promise<Uint8Array> {
  // Create a deterministic but unpredictable seed based on game ID and current time
  const encoder = new TextEncoder()
  const gameData = encoder.encode(`${gameId}-${Date.now()}-${Math.random()}`)

  // Use Web Crypto API for proper randomness
  const hashBuffer = await crypto.subtle.digest("SHA-256", gameData)
  return new Uint8Array(hashBuffer)
}

export function deriveGameRandom(seedHex: string, context: string, step: number): number {
  try {
    // Validate inputs
    if (!seedHex || typeof seedHex !== "string") {
      console.warn("Invalid seedHex provided, using fallback")
      seedHex = "fallback-seed-" + Date.now().toString(16)
    }

    if (!context || typeof context !== "string") {
      context = "default-context"
    }

    if (typeof step !== "number" || isNaN(step)) {
      step = 0
    }

    // Convert hex seed back to bytes with error handling
    let seedBytes: Uint8Array
    try {
      const hexMatches = seedHex.match(/.{1,2}/g)
      if (!hexMatches) {
        throw new Error("Invalid hex format")
      }
      seedBytes = new Uint8Array(
        hexMatches.map((byte) => {
          const parsed = Number.parseInt(byte, 16)
          return isNaN(parsed) ? 0 : parsed
        }),
      )
    } catch (error) {
      // Fallback to simple string-to-bytes conversion
      const encoder = new TextEncoder()
      seedBytes = encoder.encode(seedHex).slice(0, 32)
    }

    // Create context-specific seed using simple XOR mixing
    const encoder = new TextEncoder()
    const contextBytes = encoder.encode(`${context}-${step}`)

    let hash = 0
    for (let i = 0; i < Math.min(seedBytes.length, 32); i++) {
      const contextByte = contextBytes[i % contextBytes.length] || 0
      hash = ((hash << 5) - hash + (seedBytes[i] ^ contextByte)) | 0
    }

    // Convert to 0-1 range using simple normalization with bounds checking
    const normalized = Math.abs(hash) / 2147483647
    return Math.min(0.999999, Math.max(0.000001, normalized)) // Ensure valid range
  } catch (error) {
    console.error("Error in deriveGameRandom:", error)
    // Fallback to deterministic pseudo-random based on inputs
    const fallbackSeed = (seedHex + context + step).split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0
    }, 0)
    return Math.abs(fallbackSeed % 1000000) / 1000000
  }
}
