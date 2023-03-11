const Database = require('better-sqlite3');

function verifyParamTypes(sql, arr) {
  arr.forEach(val => {
    if (typeof val !== 'string' && typeof val !== 'number' && val !== null) {
      console.log(sql, arr);
      throw new Error('Invalid field type ' + val + ' for sql ' + sql);
    }
  });
}

export async function init() {}

export function prepare(db, sql) {
  return db.prepare(sql);
}

export function runQuery(db, sql, params = [], fetchAll) {
  if (params) {
    verifyParamTypes(sql, params);
  }

  let stmt;
  try {
    stmt = typeof sql === 'string' ? db.prepare(sql) : sql;
  } catch (e) {
    console.log('error', sql);
    throw e;
  }

  if (fetchAll) {
    try {
      let result = stmt.all(...params);
      return result;
    } catch (e) {
      console.log('error', sql);
      throw e;
    }
  } else {
    try {
      let info = stmt.run(...params);
      return { changes: info.changes, insertId: info.lastInsertRowid };
    } catch (e) {
      // console.log('error', sql);
      throw e;
    }
  }
}

export function execQuery(db, sql) {
  db.exec(sql);
}

export function transaction(db, fn) {
  db.transaction(fn)();
}

// **Important**: this is an unsafe function since sqlite executes
// executes statements sequentially. It would be easy for other code
// to run statements in between our transaction and get caught up in
// it. This is rarely used, and only needed for specific cases (like
// batch importing a bunch of data). Don't use this.
let transactionDepth = 0;
export async function asyncTransaction(db, fn) {
  // Support nested transactions by "coalescing" them into the parent
  // one if one is already started
  if (transactionDepth === 0) {
    db.exec('BEGIN TRANSACTION');
  }
  transactionDepth++;

  try {
    await fn();
  } finally {
    transactionDepth--;
    // We always commit because rollback is more dangerous - any
    // queries that ran *in-between* this async function would be
    // lost. Right now we are only using transactions for speed
    // purposes unfortunately
    if (transactionDepth === 0) {
      db.exec('COMMIT');
    }
  }
}

export function openDatabase(pathOrBuffer) {
  var db =  new Database(pathOrBuffer);
  db.function('regexp', { deterministic: true }, (regex, text) => {
    return new RegExp(regex, 'ui').test(text) ? 1 : 0;
  });

  return db;
}

export function closeDatabase(db) {
  return db.close();
}

export function exportDatabase(db) {
  return db.serialize();
}
