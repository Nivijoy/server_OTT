"use strict"
const express = require('express'),
    compress = require('compression'),
    user = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise;


user.use(compress());


user.post('/getUsers', (req, res, err) => {
    const ott_data = req.ott_data;
    // var url = require('url');
    var data = req.body, where = [], sqlquery, sql
    //  url_parts = url.parse(req.url, true), query = url_parts.query;
    // console.log('query', query.id)
    sqlquery = ' SELECT u.id,u.fullname,u.profileid,u.mobile,u.email,u.ottplan,u.`ott_platform`,u.days,u.`cdate`,u.role,u.menurole,u.invdate,u.expirydate, '+
     '  IF(u.`expirydate`>NOW(),1,0) `status` FROM ott.`ottUsers` u  WHERE u.id = ? ';
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, req.ott_data.id, function (err, result) {
                // console.log("Get OttUsers Query :", sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result[0]));
                }else{
                    console.log(sql.sql,'\nError to Get user..');
                }
            });
        }
    });
});



module.exports = user;