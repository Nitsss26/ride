// Helper to get fetch implementation (node-fetch or global fetch)
async function getFetch() {
  // Use global fetch if available (Node.js 18+)
  if (typeof global.fetch === "function") {
    return global.fetch
  }

  // Fallback to node-fetch
  try {
    const nodeFetch = await import("node-fetch")
    return nodeFetch.default
  } catch (error) {
    console.error("Failed to import node-fetch:", error)
    throw new Error("No fetch implementation available")
  }
}

module.exports = { getFetch }
