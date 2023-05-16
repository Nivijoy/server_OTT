"use strict"
const express = require('express'),
    compress = require('compression'),
    dashboard = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise;
const schema = require('../schema/schema');

dashboard.use(compress());

dashboard.post('/getBalance', function (req, res, err) {                //Show Only For Deposit Users
    const jwt_ott = req.ott_data;
    var data = req.body, sqlquery = ' SELECT man.`mamt` balance FROM ott.`managers` man  ';
    // console.log('INPUT DATA : ',data);
    if (jwt_ott.role != 999) {
        if (jwt_ott.role == 777) {
            sqlquery += ' WHERE man.`mid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 666) {
            sqlquery += ' WHERE man.`mid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 555) {
            sqlquery += ' WHERE man.`mid`=  ' + jwt_ott.id + ' ';
        }
    }
    console.log('Get Balance Query : ', sqlquery);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            var sql = conn.query(sqlquery, function (err, result) {
                // console.log(sql.sql)
                conn.release();
                console.log('Connection Released. ');
                if (!err) {
                    res.send(JSON.stringify(result[0]));
                } else {
                    console.log('Error so Connection Released. ');
                }
            });
        }
    });
});


dashboard.post('/search', function (req, res, err) {
    const jwt_ott = req.ott_data
    var data = req.body, sqlquery = ' SELECT ';
    console.log('Search DATA : ', data);
    if (data.hasOwnProperty('sflag') && data.sflag == 1) {           // Subscriber id
        sqlquery += ' id,profileid uname '
    }
    if (data.hasOwnProperty('sflag') && data.sflag == 2) {           // Subscriber Mobile 
        sqlquery += ' id,mobile uname '
    }
    if (data.hasOwnProperty('sflag') && data.sflag == 3) {           // Subscriber   Account NO
        sqlquery += ' id,id uname '
    }

    if (data.hasOwnProperty('sflag') && data.sflag != '') {
        sqlquery += ' FROM ott.ottUsers WHERE ustatus = 1 '
    }

    if (jwt_ott.role != 999) {
        if (jwt_ott.role == 777) sqlquery += ' and dmid =' + jwt_ott.id
        if (jwt_ott.role == 666) sqlquery += ' and sdmid =' + jwt_ott.id
        if (jwt_ott.role == 555) sqlquery += ' and `mid` =' + jwt_ott.id
    }



    if (data.hasOwnProperty('like') && data.sflag == 1 && data.like != '') {           // Subscriber id
        sqlquery += ' and profileid LIKE "%' + data.like + '%" '
    }

    if (data.hasOwnProperty('like') && data.sflag == 2 && data.like != '') {           // Subscriber Mobile 
        sqlquery += ' and mobile   LIKE "%' + data.like + '%" '
    }

    if (data.hasOwnProperty('like') && data.sflag == 3 && data.like != '') {           // Subscriber   Account NO
        sqlquery += ' and id   LIKE "%' + data.like + '%" '
    }
    sqlquery += ' LIMIT 10 ';

    console.log('Get Search Query : ', sqlquery);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            var sql = conn.query(sqlquery, function (err, result) {
                // console.log(sql.sql)
                conn.release();
                console.log('Connection Released. ');
                if (!err) {
                    res.send(JSON.stringify(result));
                } else {
                    console.log('Error so Connection Released. ');
                }
            });
        }
    });
});

dashboard.post('/getcount', function (req, res, err) {                //Show Count
    const jwt_ott = req.ott_data
    var data = req.body,
        sqlquery = ` SELECT COUNT(*) total
        ,COUNT(CASE WHEN u.ustatus = 1 AND  u.ottexpirydate > NOW()  THEN 1 END) active_status
        ,COUNT(CASE WHEN u.ustatus = 1 AND  u.ottexpirydate < NOW() THEN 1 END) expiry_status 
        ,COUNT(CASE WHEN u.ustatus = 0 THEN 1 END) inactive_status FROM ott.ottUsers u `

    // console.log('INPUT DATA : ', data);
    if (jwt_ott.role != 999) {
        if (jwt_ott.role == 777) {
            sqlquery += ' WHERE u.`dmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 666) {
            sqlquery += ' WHERE u.`sdmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 555) {
            sqlquery += ' WHERE u.`cid`=  ' + jwt_ott.id + ' ';
        }
    }
    console.log('Get Count Query :', sqlquery);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            var sql = conn.query(sqlquery, function (err, result) {
                // console.log(sql.sql)
                conn.release();
                console.log('Count Connection Released. ');
                if (!err) {
                    res.send(JSON.stringify(result[0]));
                } else {
                    console.log('Count Query Error so Connection Released. ');
                }
            });
        }
    });
});

dashboard.post('/getYexp', function (req, res, err) {
    const jwt_ott = req.ott_data
    var sqlquery = ` SELECT u.id,u.fullname,u.profileid,u.ottexpirydate,u.mobile,u.email,u.role_type,u.dmid,u.sdmid,u.mid,u.ottplancode,
    (CASE WHEN u.role_type = 1 THEN (SELECT bname FROM ott.managers d WHERE d.mid =u.dmid)
     WHEN u.role_type = 2 THEN (SELECT bname FROM ott.managers s WHERE s.mid =u.sdmid)
     WHEN u.role_type = 3 THEN (SELECT bname FROM ott.managers m WHERE m.mid =u.mid)  
      END) manager FROM ott.ottUsers u WHERE  DATE_FORMAT(u.ottexpirydate,"%Y-%m-%d") = CURDATE() - INTERVAL  1 DAY `,
        where = [], sqlqueryc = `SELECT COUNT(*) count FROM ott.ottUsers u WHERE  DATE_FORMAT(u.ottexpirydate,"%Y-%m-%d") = CURDATE() - INTERVAL  1 DAY `,
        data = req.body;

    if (jwt_ott.role != 999) {
        if (jwt_ott.role == 777) {
            sqlquery += ' WHERE u.`dmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 666) {
            sqlquery += ' WHERE u.`sdmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 555) {
            sqlquery += ' WHERE u.`cid`=  ' + jwt_ott.id + ' ';
        }
    }

    sqlquery += ` ORDER BY u.ottexpirydate,u.id ASC `
    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += `  LIMIT ${data.index},${data.limit} `;
    }
    // console.log('Get yexp :', sqlquery);
    // console.log('Get yexp Count :', sqlqueryc);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            var sql, val = [];
            sql = conn.query(sqlquery, function (err, result) {
                // console.log(sql.sql)
                if (!err) {
                    val.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        // console.log(sql.sql)
                        conn.release();
                        console.log('YES EXP Connection Released. ');
                        if (!err) {
                            val.push(result[0]);
                            res.send(JSON.stringify(val));
                        } else {
                            // conn.release();
                            console.log('YES EXP Count Error so Connection Released. ');
                        }
                    });
                } else {
                    conn.release();
                    console.log('YES EXP List Error so Connection Released. ');
                }
            });
        }
    });
});

dashboard.post('/getTodayexp', function (req, res, err) {
    const jwt_ott = req.ott_data
    var sqlquery = ` SELECT u.id,u.fullname,u.profileid,u.ottexpirydate,u.mobile,u.email,u.role_type,u.dmid,u.sdmid,u.mid,u.ottplancode,
    (CASE WHEN u.role_type = 1 THEN (SELECT bname FROM ott.managers d WHERE d.mid =u.dmid)
     WHEN u.role_type = 2 THEN (SELECT bname FROM ott.managers s WHERE s.mid =u.sdmid)
     WHEN u.role_type = 3 THEN (SELECT bname FROM ott.managers m WHERE m.mid =u.mid)  
      END) manager FROM ott.ottUsers u WHERE  DATE_FORMAT(u.ottexpirydate,"%Y-%m-%d") = CURDATE() `,
        where = [], sqlqueryc = `SELECT COUNT(*) count FROM ott.ottUsers u WHERE  DATE_FORMAT(u.ottexpirydate,"%Y-%m-%d") = CURDATE() `,
        data = req.body;

    if (jwt_ott.role != 999) {
        if (jwt_ott.role == 777) {
            sqlquery += ' WHERE u.`dmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 666) {
            sqlquery += ' WHERE u.`sdmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 555) {
            sqlquery += ' WHERE u.`cid`=  ' + jwt_ott.id + ' ';
        }
    }

    sqlquery += ` ORDER BY u.ottexpirydate,u.id ASC `
    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += `  LIMIT ${data.index},${data.limit} `;
    }
    // console.log('Get tod exp :', sqlquery);
    // console.log('Get tod exp Count :', sqlqueryc);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            var sql, val = [];
            sql = conn.query(sqlquery, function (err, result) {
                // console.log(sql.sql)
                if (!err) {
                    val.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        // console.log(sql.sql)
                        conn.release();
                        if (!err) {
                            val.push(result[0]);
                            res.send(JSON.stringify(val));
                        } else {
                            // conn.release();
                            console.log('TODAY EXP Count Error so Connection Released. ');
                        }
                    });
                } else {
                    conn.release();
                    console.log('Today EXP List Error so Connection Released. ');
                }
            });
        }
    });
});

dashboard.post('/getTomorrowExp', function (req, res, err) {
    const jwt_ott = req.ott_data
    var sqlquery = ` SELECT u.id,u.fullname,u.profileid,u.ottexpirydate,u.mobile,u.email,u.role_type,u.dmid,u.sdmid,u.mid,u.ottplancode,
    (CASE WHEN u.role_type = 1 THEN (SELECT bname FROM ott.managers d WHERE d.mid =u.dmid)
     WHEN u.role_type = 2 THEN (SELECT bname FROM ott.managers s WHERE s.mid =u.sdmid)
     WHEN u.role_type = 3 THEN (SELECT bname FROM ott.managers m WHERE m.mid =u.mid)  
      END) manager FROM ott.ottUsers u WHERE  DATE_FORMAT(u.ottexpirydate,"%Y-%m-%d") = CURDATE() + INTERVAL  1 DAY `,
        where = [], sqlqueryc = `SELECT COUNT(*) count FROM ott.ottUsers u WHERE  DATE_FORMAT(u.ottexpirydate,"%Y-%m-%d") = CURDATE() + INTERVAL  1 DAY `,
        data = req.body;

    if (jwt_ott.role != 999) {
        if (jwt_ott.role == 777) {
            sqlquery += ' WHERE u.`dmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 666) {
            sqlquery += ' WHERE u.`sdmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 555) {
            sqlquery += ' WHERE u.`cid`=  ' + jwt_ott.id + ' ';
        }
    }

    sqlquery += ` ORDER BY u.ottexpirydate,u.id ASC `
    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += `  LIMIT ${data.index},${data.limit} `;
    }

    console.log('Get toma exp :', data, sqlquery);
    // console.log('Get toma exp Count :', sqlqueryc);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            var sql, val = [];
            sql = conn.query(sqlquery, function (err, result) {
                // console.log(sql.sql)
                if (!err) {
                    val.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        // console.log(sql.sql)
                        conn.release();
                        if (!err) {
                            val.push(result[0]);
                            res.send(JSON.stringify(val));
                        } else {
                            // conn.release();
                            console.log('Toma EXP Count Error so Connection Released. ');
                        }
                    });
                } else {
                    conn.release();
                    console.log('Toma EXP List Error so Connection Released. ');
                }
            });
        }
    });
});

dashboard.post('/getDFT', function (req, res, err) {
    const jwt_ott = req.ott_data
    var sqlquery = ` SELECT u.id,u.fullname,u.profileid,u.ottexpirydate,u.mobile,u.email,u.role_type,u.dmid,u.sdmid,u.mid,u.ottplancode,
    (CASE WHEN u.role_type = 1 THEN (SELECT bname FROM ott.managers d WHERE d.mid =u.dmid)
     WHEN u.role_type = 2 THEN (SELECT bname FROM ott.managers s WHERE s.mid =u.sdmid)
     WHEN u.role_type = 3 THEN (SELECT bname FROM ott.managers m WHERE m.mid =u.mid)  
      END) manager FROM ott.ottUsers u WHERE  DATE_FORMAT(u.ottexpirydate,"%Y-%m-%d") = CURDATE() + INTERVAL 2 DAY `,
        where = [], sqlqueryc = `SELECT COUNT(*) count FROM ott.ottUsers u WHERE  DATE_FORMAT(u.ottexpirydate,"%Y-%m-%d") = CURDATE() + INTERVAL 2 DAY `,
        data = req.body;

    if (jwt_ott.role != 999) {
        if (jwt_ott.role == 777) {
            sqlquery += ' WHERE u.`dmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 666) {
            sqlquery += ' WHERE u.`sdmid`=  ' + jwt_ott.id + ' ';
        }
        if (jwt_ott.role == 555) {
            sqlquery += ' WHERE u.`cid`=  ' + jwt_ott.id + ' ';
        }
    }

    sqlquery += ` ORDER BY u.ottexpirydate,u.id ASC `
    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += `  LIMIT ${data.index},${data.limit} `;
    }
    // console.log('Get DFT exp :', sqlquery);
    // console.log('Get DFT exp Count :', sqlqueryc);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log(err);
        } else {
            var sql, val = [];
            sql = conn.query(sqlquery, function (err, result) {
                // console.log(sql.sql)
                if (!err) {
                    val.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        // console.log(sql.sql)
                        conn.release();
                        if (!err) {
                            val.push(result[0]);
                            res.send(JSON.stringify(val));
                        } else {
                            // conn.release();
                            console.log('DFT Count Query Error so Connection Released. ');
                        }
                    });
                } else {
                    conn.release();
                    console.log('DFT List Query Error so Connection Released. ');
                }
            });
        }
    });
});

















module.exports = dashboard;