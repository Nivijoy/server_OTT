
var mysql = require('mysql');
// Initialize pool
let conf = require('../utility/config');
let db=conf.mysqlserver1;
// let db=conf.mysqlserver2;            // BackUp Server
var pool = mysql.createPool({
    connectionLimit: 100*9,
    host: db.host,
    user: db.user,
    password: db.password,
    database: db.database,
    debug: false
});

// console.log(pool);
var mysqlPromise = require('promise-mysql2')
let connection = mysqlPromise.createPool({
    "host": db.host,
    "user": db.user,
    "password": db.password,
    "database": db.database,
    "connectionLimit": 100*9,
});

module.exports = pool;
module.exports.poolPromise = connection;