// db-config.js
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'svr728.hostinger.com', // Host correto da Hostinger
    user: 'u131408987_DU',
    password: 'Eu991843135@',
    database: 'u131408987_DominioUrbano',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    port: 3306 // Porta padrão do MySQL
});

module.exports = pool.promise();
