const { Pool } = require('pg');

const pool = new Pool({
  host: '192.168.1.254',       // O la dirección de tu servidor de PostgreSQL
  port: 5432,            // El puerto por defecto de PostgreSQL
  database: 'pensiones', // El nombre de tu base de datos
  user: 'pleka',    // Tu nombre de usuario de PostgreSQL
  password: 'Pleka123', // Tu contraseña de PostgreSQL
});

module.exports = pool;