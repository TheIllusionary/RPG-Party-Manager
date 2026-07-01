import mongoose from 'mongoose';

/**
 * Returns the MongoDB connection string from environment variables.
 * `MONGO_URI` is the canonical variable; `MONGODB_URI` is kept as a fallback.
 */
export function getMongoUri() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGO_URI is not defined. Copy api/.env.example to api/.env or set MONGO_URI on Render.',
    );
  }
  return uri;
}

/** Masks credentials in a connection string for safe logging. */
export function maskMongoUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

/**
 * Connects to MongoDB. The database and collections are created lazily on the
 * first write — no manual setup in Compass or mongosh is required.
 */
export async function connectDB() {
  const uri = getMongoUri();
  const source = process.env.MONGO_URI ? 'MONGO_URI' : 'MONGODB_URI';

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
  } catch (err) {
    if (err.message?.includes('bad auth') || err.code === 8000 || err.codeName === 'AuthenticationFailed') {
      console.error('\nMongoDB authentication failed. Check:');
      console.error('  1. Atlas → Database Access → reset the database user password');
      console.error('  2. Copy the new connection string from Atlas → Connect → Drivers');
      console.error('  3. Update MONGO_URI in api/.env (URL-encode special characters in the password)');
      console.error(`  4. Using env var: ${source}\n`);
    }
    throw err;
  }

  const { host, name } = mongoose.connection;
  console.log('MongoDB connected successfully');
  console.log(`  Host: ${host}`);
  console.log(`  Database: ${name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}
