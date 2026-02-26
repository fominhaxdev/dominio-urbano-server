// db-config.js
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'u131408987_DU',
    password: 'Eu991843135@', // 🔴 COLOQUE A SENHA DO BANCO AQUI
    database: 'u131408987_DominioUrbano',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();
