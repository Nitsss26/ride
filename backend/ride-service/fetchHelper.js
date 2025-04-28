let fetchModule;

async function initializeFetch() {
  fetchModule = await import('node-fetch');
}

// Initialize immediately
initializeFetch();

// Export a function that ensures fetch is available
async function getFetch() {
  if (!fetchModule) {
    await initializeFetch();
  }
  return fetchModule.default;
}

module.exports = { getFetch };
