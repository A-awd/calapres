import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID } from 'node:crypto';

export class Ledger {
  constructor(path, { budgetMicros = 0, batchReserveMicros = 0 } = {}) {
    if (![budgetMicros, batchReserveMicros].every(Number.isSafeInteger) || budgetMicros < 0 || batchReserveMicros < 0) throw Error('Invalid budget');
    this.budget = budgetMicros; this.reserve = batchReserveMicros;
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, name TEXT DEFAULT '');
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, token TEXT, name TEXT, created INTEGER, state TEXT, reserved INTEGER);
      CREATE TABLE IF NOT EXISTS designs(id TEXT PRIMARY KEY, token TEXT, name TEXT, job TEXT, ordinal INTEGER, url TEXT, receipt TEXT, version TEXT);
      CREATE INDEX IF NOT EXISTS jobs_session ON jobs(token, created);`);
  }
  session(token) {
    let row = typeof token === 'string' && this.db.prepare('SELECT * FROM sessions WHERE token=?').get(token);
    if (!row) { token = randomBytes(32).toString('hex'); this.db.prepare('INSERT INTO sessions(token) VALUES (?)').run(token); }
    const used = this.db.prepare('SELECT count(*) n FROM jobs WHERE token=? AND created>?').get(token, Date.now()-86400000).n;
    return { token, remaining: Math.max(0,9-used*3), lastName: row?.name || '',
      pending: !!this.db.prepare("SELECT id FROM jobs WHERE token=? AND state='pending'").get(token),
      designs: this.db.prepare('SELECT id,name,ordinal,url,receipt,version FROM designs WHERE token=? ORDER BY rowid').all(token) };
  }
  begin(token, name) {
    if (!this.db.prepare('SELECT token FROM sessions WHERE token=?').get(token)) throw Error('SESSION_REQUIRED');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const pending = this.db.prepare("SELECT * FROM jobs WHERE token=? AND state='pending'").get(token);
      if (pending) { this.db.exec('COMMIT'); return { job: pending, created: false }; }
      if (!this.budget || !this.reserve) throw Error('BUDGET_DISABLED');
      const used = this.db.prepare('SELECT count(*) n FROM jobs WHERE token=? AND created>?').get(token, Date.now()-86400000).n;
      if (used >= 3) throw Error('LIMIT_REACHED');
      const total = this.db.prepare('SELECT COALESCE(sum(reserved),0) n FROM jobs').get().n;
      if (total + this.reserve > this.budget) throw Error('BUDGET_REACHED');
      const job = { id: randomUUID(), token, name, created: Date.now(), state:'pending', reserved:this.reserve };
      this.db.prepare('INSERT INTO jobs VALUES (?,?,?,?,?,?)').run(job.id,token,name,job.created,job.state,job.reserved);
      this.db.prepare('UPDATE sessions SET name=? WHERE token=?').run(name,token);
      this.db.exec('COMMIT');return { job, created: true };
    } catch(error) { this.db.exec('ROLLBACK');throw error; }
  }
  add(job, design) {
    const ordinal = this.db.prepare('SELECT count(*) n FROM designs WHERE token=?').get(job.token).n+1;
    this.db.prepare('INSERT INTO designs VALUES (?,?,?,?,?,?,?,?)').run(design.id,job.token,job.name,job.id,ordinal,design.url,design.receipt,design.version);
  }
  finish(id, state='complete') { this.db.prepare('UPDATE jobs SET state=? WHERE id=?').run(state,id); }
  recover() { this.db.exec("UPDATE jobs SET state='interrupted' WHERE state='pending'"); }
  close() { this.db.close(); }
}
