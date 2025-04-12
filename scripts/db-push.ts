import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

// Required for the Neon serverless driver to work in Node.js
neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Pushing schema to database...');
  
  try {
    // Instead of using migrate which requires SQL files, 
    // we'll create tables directly from the schema
    console.log('Creating tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP NULL
      );
    `);
    console.log('Created users table');
    
    // Create providers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        api_key TEXT NOT NULL,
        api_endpoint TEXT NULL,
        description TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created providers table');
    
    // Create games table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creator_id INTEGER NOT NULL REFERENCES users(id),
        board_size INTEGER NOT NULL,
        cell_size TEXT NOT NULL,
        answer_time INTEGER NOT NULL,
        group_count INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP NULL
      );
    `);
    console.log('Created games table');
    
    // Create questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    console.log('Created questions table');
    
    // Create groups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id),
        name TEXT NOT NULL,
        has_bingo BOOLEAN NOT NULL DEFAULT FALSE,
        bingo_pattern TEXT NULL
      );
    `);
    console.log('Created groups table');
    
    // Create players table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id),
        name TEXT NOT NULL,
        user_id INTEGER NULL REFERENCES users(id)
      );
    `);
    console.log('Created players table');
    
    // Create board_cells table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS board_cells (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id),
        position TEXT NOT NULL,
        content TEXT NOT NULL,
        answer TEXT NOT NULL,
        correct BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    console.log('Created board_cells table');
    
    // Create player_answers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_answers (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id),
        question_id TEXT NOT NULL REFERENCES questions(id),
        player_id TEXT NOT NULL REFERENCES players(id),
        group_id TEXT NOT NULL REFERENCES groups(id),
        cell_id TEXT NOT NULL,
        position TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created player_answers table');

    console.log('Schema pushed successfully!');
  } catch (error) {
    console.error('Error pushing schema to database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();