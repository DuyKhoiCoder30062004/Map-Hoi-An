import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function test() {
  try {
    const db = await open({
      filename: ':memory:',
      driver: sqlite3.Database
    });
    await db.exec('CREATE TABLE test (id INTEGER)');
    console.log('SQLite works!');
  } catch (e) {
    console.error('SQLite failed:', e);
  }
}
test();
