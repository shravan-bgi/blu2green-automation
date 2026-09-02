import mysql from 'mysql2/promise';
import { databaseConfig } from '@config/environment';

export type Pool = mysql.Pool;

/** This function creates the MySQL connection pool the suite reads from. */
// `dateStrings` is required: without it the driver reinterprets DATE columns in
// the connection timezone, turning 2019-01-15 into 2019-01-14T18:30:00Z.
export function createPool(): Pool {
  const database = databaseConfig();

  return mysql.createPool({
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.schema,
    waitForConnections: true,
    connectionLimit: 3,
    connectTimeout: 15_000,
    dateStrings: true,
  });
}
