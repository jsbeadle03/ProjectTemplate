import mysql from "mysql2/promise";

let pool;

// WAFLE_DB_* is the documented convention (see database-test and the README);
// DATABASE_* is kept as a fallback for any .env.local written before that
// convention settled.
export function getDbConfig() {
  return {
    host: process.env.WAFLE_DB_HOST ?? process.env.DATABASE_HOST,
    port:
      Number(process.env.WAFLE_DB_PORT ?? process.env.DATABASE_PORT) || 3306,
    user: process.env.WAFLE_DB_USER ?? process.env.DATABASE_USER,
    password: process.env.WAFLE_DB_PASSWORD ?? process.env.DATABASE_PASSWORD,
    schema: process.env.WAFLE_DB_SCHEMA ?? process.env.DATABASE_NAME,
  };
}

export function getPool() {
  if (!pool) {
    const config = getDbConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.schema,
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}
