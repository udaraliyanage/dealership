import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

export const client = new Client({
    connectionString: process.env.PG_CONNECTION_STRING
});