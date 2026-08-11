import mysql from "mysql2/promise";

let pool;

export function getDbConfig() {
  return {
    host: process.env.WAFLE_DB_HOST,
    port: Number(process.env.WAFLE_DB_PORT) || 3306,
    user: process.env.WAFLE_DB_USER,
    password: process.env.WAFLE_DB_PASSWORD,
    schema: process.env.WAFLE_DB_SCHEMA,
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
