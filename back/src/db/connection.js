import "dotenv/config"
import pg from "pg"
import { getDatabase } from "@netlify/database"

const { Pool } = pg

const useNetlifyDb = Boolean(process.env.NETLIFY_DB_URL || process.env.NETLIFY)
const useUrl = Boolean(process.env.DATABASE_URL)

function createLocalPool() {
  return new Pool(
    useUrl
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
        }
      : {
          host: process.env.DB_HOST || "localhost",
          port: Number(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || "quest_merchant",
          user: process.env.DB_USER || "postgres",
          password: process.env.DB_PASSWORD || "postgres",
          ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
        }
  )
}

export const pool = useNetlifyDb ? getDatabase().pool : createLocalPool()
