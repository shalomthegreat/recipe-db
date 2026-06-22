const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI_RECIPES;
const client = new MongoClient(uri);

// Database and collection names
const DB_NAME = 'myrecipes';
const COLLECTIONS = {
  RECIPES: 'recipes',
  USERS: 'users'
};

/**
 * Inspect a MongoDB connection error and return a human-readable
 * explanation plus actionable remediation steps.
 * @param {Error} error - The error thrown while connecting
 * @returns {{ summary: string, hints: string[] }}
 */
function diagnoseConnectionError(error) {
  const message = `${error && error.message ? error.message : error}`;
  const causeMessage = error && error.cause ? `${error.cause.message || error.cause}` : '';
  const haystack = `${message} ${causeMessage}`.toLowerCase();

  // TLS handshake rejected by the server (Atlas commonly does this when the
  // client IP is not on the project's IP Access List).
  if (
    haystack.includes('tlsv1 alert') ||
    haystack.includes('err_ssl') ||
    haystack.includes('ssl alert') ||
    haystack.includes('ssl routines')
  ) {
    return {
      summary: 'TLS handshake was rejected by the MongoDB server (not a bad password or URI).',
      hints: [
        'Add your current public IP to Atlas > Security > Network Access > IP Access List.',
        'For a quick test you can temporarily allow 0.0.0.0/0, then remove it afterwards.',
        'If on a VPN/corporate network, disable it or switch networks (TLS inspection can cause this).',
        'Confirm outbound TCP port 27017 is not blocked by your firewall.'
      ]
    };
  }

  // Authentication failures.
  if (
    haystack.includes('authentication failed') ||
    haystack.includes('bad auth') ||
    haystack.includes('not authorized') ||
    error.code === 18 ||
    error.code === 8000
  ) {
    return {
      summary: 'Authentication failed — the username or password in MONGO_URI_RECIPES is incorrect.',
      hints: [
        'Verify the database user credentials in Atlas > Security > Database Access.',
        'URL-encode special characters in the password (e.g. @ : / become %40 %3A %2F).',
        'Ensure the user has access to the target database.'
      ]
    };
  }

  // DNS / cluster hostname resolution problems.
  if (
    haystack.includes('enotfound') ||
    haystack.includes('querysrv') ||
    haystack.includes('getaddrinfo')
  ) {
    return {
      summary: 'The cluster hostname could not be resolved via DNS.',
      hints: [
        'Double-check the cluster host in MONGO_URI_RECIPES for typos.',
        'Confirm you have working internet/DNS access.'
      ]
    };
  }

  // Connection refused / unreachable.
  if (haystack.includes('econnrefused') || haystack.includes('etimedout') || haystack.includes('econnreset')) {
    return {
      summary: 'The MongoDB server is unreachable (connection refused/timed out).',
      hints: [
        'Verify the server is running and the host/port are correct.',
        'Check that your network/firewall allows outbound connections to the cluster.'
      ]
    };
  }

  // Generic server selection timeout.
  if (haystack.includes('serverselection')) {
    return {
      summary: 'Could not select a MongoDB server within the timeout window.',
      hints: [
        'Verify network connectivity and the Atlas IP Access List.',
        'Confirm the cluster is not paused.'
      ]
    };
  }

  return {
    summary: 'An unexpected error occurred while connecting to MongoDB.',
    hints: ['Review the full error details below for more information.']
  };
}

/**
 * Log a diagnosed connection error with actionable guidance.
 * @param {Error} error - The error thrown while connecting
 */
function reportConnectionError(error) {
  const { summary, hints } = diagnoseConnectionError(error);
  console.error('\nMongoDB connection failed.');
  console.error(`Cause: ${summary}`);
  if (hints.length > 0) {
    console.error('Suggested fixes:');
    hints.forEach((hint, index) => console.error(`  ${index + 1}. ${hint}`));
  }
  console.error('\nFull error details:');
  console.error(error);
}

/**
 * Connect to the database
 * @returns {Promise<Object>} MongoDB client connection
 */
async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client;
  } catch (error) {
    reportConnectionError(error);
    throw error;
  }
}

/**
 * Get database instance
 * @returns {Object} MongoDB database instance
 */
function getDB() {
  return client.db(DB_NAME);
}

/**
 * Close database connection
 */
async function closeDB() {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
  COLLECTIONS,
  diagnoseConnectionError,
  reportConnectionError
};
