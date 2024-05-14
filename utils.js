const { Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const client = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: true
});

const newUser = async (name) => {
  try {
    const res = await client.query(
      'INSERT INTO users (name, joined, lastvisit, counter) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, new Date(), new Date(), 1]
    );
    return res.rows[0]
  } catch (error) {
    console.error('Error creating new user:', error);
    return null;
  }
};

const oldUser = async (id) => {
  try {
    const res = await client.query(
      'UPDATE users SET lastvisit = $1, counter = counter + 1 WHERE id = $2 RETURNING *',
      [new Date(), id]
    );
    console.log(res.rows)
    return res.rows[0]
  } catch (error) {
    console.error('Error updating user visit:', error);
    return null;
  }
};

const findUserByName = async (name) => {
  try {
    const res = await client.query(
      'SELECT * FROM users WHERE name = $1',
      [name]
    );
    return res.rows[0];
  } catch (error) {
    console.error('Error finding user by name:', error);
    return null;
  }
};

const fetchUsers = async () => {
  try {
    const res = await client.query('SELECT * FROM users');
    return res.rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    return null;
  }
};

module.exports = {
  client,
  newUser,
  oldUser,
  findUserByName,
  fetchUsers
};
