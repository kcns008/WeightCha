const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'weightcha',
  user: process.env.DB_USER || 'weightcha_user',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Simple query interface compatible with the service layer
const database = {
  async raw(query, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  },

  // Table query builder
  table(tableName) {
    return new QueryBuilder(tableName, pool);
  },

  // Direct table access (for compatibility with service layer)
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return '[PostgreSQL Database Connection]';
  },

  async end() {
    await pool.end();
  }
};

// Add table methods dynamically
const tables = ['challenges', 'verifications', 'pressure_data', 'api_keys'];
tables.forEach(tableName => {
  database[tableName] = database.table(tableName);
});

class QueryBuilder {
  constructor(tableName, pool) {
    this.tableName = tableName;
    this.pool = pool;
    this.query = {
      select: ['*'],
      where: [],
      limit: null,
      offset: null,
      orderBy: []
    };
  }

  select(...columns) {
    this.query.select = columns.length > 0 ? columns : ['*'];
    return this;
  }

  where(column, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    this.query.where.push({ column, operator, value });
    return this;
  }

  limit(count) {
    this.query.limit = count;
    return this;
  }

  offset(count) {
    this.query.offset = count;
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.query.orderBy.push({ column, direction });
    return this;
  }

  async insert(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async update(data) {
    const updates = Object.keys(data).map((key, index) => `${key} = $${index + 1}`);
    const values = Object.values(data);
    
    let query = `UPDATE ${this.tableName} SET ${updates.join(', ')}`;
    let paramIndex = values.length + 1;
    
    if (this.query.where.length > 0) {
      const whereClause = this.query.where.map(w => {
        values.push(w.value);
        return `${w.column} ${w.operator} $${paramIndex++}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    query += ' RETURNING *';
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  async delete() {
    let query = `DELETE FROM ${this.tableName}`;
    const values = [];
    let paramIndex = 1;
    
    if (this.query.where.length > 0) {
      const whereClause = this.query.where.map(w => {
        values.push(w.value);
        return `${w.column} ${w.operator} $${paramIndex++}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  async exec() {
    return await this.toArray();
  }

  async toArray() {
    let query = `SELECT ${this.query.select.join(', ')} FROM ${this.tableName}`;
    const values = [];
    let paramIndex = 1;
    
    if (this.query.where.length > 0) {
      const whereClause = this.query.where.map(w => {
        values.push(w.value);
        return `${w.column} ${w.operator} $${paramIndex++}`;
      }).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    if (this.query.orderBy.length > 0) {
      const orderClause = this.query.orderBy.map(o => `${o.column} ${o.direction}`).join(', ');
      query += ` ORDER BY ${orderClause}`;
    }
    
    if (this.query.limit) {
      query += ` LIMIT ${this.query.limit}`;
    }
    
    if (this.query.offset) {
      query += ` OFFSET ${this.query.offset}`;
    }
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Alias methods for compatibility
  async then(resolve, reject) {
    try {
      const result = await this.toArray();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }
}

module.exports = database;
