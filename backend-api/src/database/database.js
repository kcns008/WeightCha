const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'weightcha',
  user: process.env.DB_USER || 'weightcha_user',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Simple query builder inspired by Knex
class QueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.queryType = null;
    this.selectColumns = ['*'];
    this.whereConditions = [];
    this.orderByColumns = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.insertData = null;
    this.updateData = null;
  }

  select(...columns) {
    this.queryType = 'SELECT';
    this.selectColumns = columns.length > 0 ? columns : ['*'];
    return this;
  }

  where(column, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = '=';
    }
    this.whereConditions.push({ column, operator, value });
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.orderByColumns.push({ column, direction });
    return this;
  }

  limit(count) {
    this.limitValue = count;
    return this;
  }

  offset(count) {
    this.offsetValue = count;
    return this;
  }

  insert(data) {
    this.queryType = 'INSERT';
    this.insertData = data;
    return this;
  }

  update(data) {
    this.queryType = 'UPDATE';
    this.updateData = data;
    return this;
  }

  delete() {
    this.queryType = 'DELETE';
    return this;
  }

  async exec() {
    const { query, params } = this.buildQuery();
    try {
      const result = await pool.query(query, params);
      
      switch (this.queryType) {
        case 'SELECT':
          return result.rows;
        case 'INSERT':
          return result.rowCount;
        case 'UPDATE':
        case 'DELETE':
          return result.rowCount;
        default:
          return result;
      }
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  buildQuery() {
    let query = '';
    let params = [];
    let paramIndex = 1;

    switch (this.queryType) {
      case 'SELECT':
        query = `SELECT ${this.selectColumns.join(', ')} FROM ${this.tableName}`;
        break;

      case 'INSERT':
        if (Array.isArray(this.insertData)) {
          // Bulk insert
          const columns = Object.keys(this.insertData[0]);
          const values = this.insertData.map(row => 
            `(${columns.map(() => `$${paramIndex++}`).join(', ')})`
          ).join(', ');
          
          query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ${values}`;
          params = this.insertData.flatMap(row => columns.map(col => row[col]));
        } else {
          // Single insert
          const columns = Object.keys(this.insertData);
          const placeholders = columns.map(() => `$${paramIndex++}`).join(', ');
          
          query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
          params = columns.map(col => this.insertData[col]);
        }
        break;

      case 'UPDATE':
        const updateColumns = Object.keys(this.updateData);
        const updateSet = updateColumns.map(col => `${col} = $${paramIndex++}`).join(', ');
        
        query = `UPDATE ${this.tableName} SET ${updateSet}`;
        params = updateColumns.map(col => this.updateData[col]);
        break;

      case 'DELETE':
        query = `DELETE FROM ${this.tableName}`;
        break;
    }

    // Add WHERE conditions
    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions.map(condition => {
        params.push(condition.value);
        return `${condition.column} ${condition.operator} $${paramIndex++}`;
      }).join(' AND ');
      
      query += ` WHERE ${whereClause}`;
    }

    // Add ORDER BY
    if (this.orderByColumns.length > 0) {
      const orderClause = this.orderByColumns
        .map(order => `${order.column} ${order.direction}`)
        .join(', ');
      query += ` ORDER BY ${orderClause}`;
    }

    // Add LIMIT
    if (this.limitValue !== null) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(this.limitValue);
    }

    // Add OFFSET
    if (this.offsetValue !== null) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(this.offsetValue);
    }

    return { query, params };
  }
}

// Database interface that mimics Knex
const database = (tableName) => {
  return new QueryBuilder(tableName);
};

// Add utility methods
database.raw = async (query, params = []) => {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error('Raw query error:', error);
    throw error;
  }
};

database.end = async () => {
  await pool.end();
};

database.pool = pool;

// Test connection
database.testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

module.exports = database;
