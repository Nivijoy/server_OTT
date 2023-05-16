"use strict"
const express = require('express'),
    compress = require('compression'),
    account = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise;
const schema = require('../schema/schema');

account.use(compress());


account.post('/listInvoice', (req, res, err) => {
    const jwt_ott = req.ott_data;
    var data = req.body, sql, sqlquery, sqlc, value = [], where = [];
    sqlquery = ` SELECT inv.iolid,inv.busid,inv.dmid,inv.sdmid,inv.mid,inv.uid,inv.bshare,inv.dshare,inv.mshare,inv.bamt,inv.damt,inv.sdamt,
    inv.mamt,inv.dayormonth,inv.ottdays,inv.taxtype,inv.ottamount,inv.manottamt,inv.ottstatus,inv.cby,inv.cdate,
    inv.res_msg,inv.res_date,inv.gltvpakname,inv.ottpackname,inv.ottplancode,inv.totinvamt,inv.totinvtaxamt,(inv.totinvamt + inv.totinvtaxamt) total,
    u.profileid,u.role_type,u.expirydate,u.ottexpirydate,u.mobile,inv.res_msg,
    IF(inv.dayormonth = 1 ,inv.cdate + INTERVAL inv.ottdays DAY,inv.cdate + INTERVAL inv.ottdays MONTH) ottexp_date,inv.ott_vendor,
    (CASE WHEN u.role_type = 1 THEN (SELECT bname FROM ott.managers d WHERE d.mid =u.dmid)
      WHEN u.role_type = 2 THEN (SELECT bname FROM ott.managers s WHERE s.mid =u.sdmid)
      WHEN u.role_type = 3 THEN (SELECT bname FROM ott.managers m WHERE m.mid =u.mid)  
       END) manager,
       (CASE WHEN inv.platform THEN (SELECT GROUP_CONCAT(op.ott_platform) FROM ott.OTT_platforms op WHERE FIND_IN_SET(op.ott_id,inv.platform))
       END) platforms
    FROM ott.Ottinvoice inv LEFT JOIN ott.ottUsers u ON inv.uid = u.id `

    sqlc = ` SELECT COUNT(*) \`count\` FROM ott.Ottinvoice inv LEFT JOIN ott.ottUsers u ON inv.uid = u.id `;

    if (data.hasOwnProperty('uid') && data.uid) {
        where.push(' inv.uid =' + data.uid)
    }
    if (data.hasOwnProperty('mobile') && data.mobile) {
        where.push(' inv.uid =' + data.mobile)
    }
    if (data.hasOwnProperty('status') && data.status) {
        where.push(' inv.ottstatus =' + data.status)
    }
    if (data.hasOwnProperty('ott_vendor') && data.ott_vendor) {
        where.push(' inv.ott_vendor =' + data.ott_vendor)
    }
    if (data.hasOwnProperty('start_date') && data.start_date != '' && data.hasOwnProperty('end_date') && data.end_date != '') {
		where.push(' DATE_FORMAT(inv.cdate,"%Y-%m-%d") >= "' + data.start_date + '" AND  DATE_FORMAT(inv.cdate,"%Y-%m-%d %hh:%mm:%ss")<= "' + data.end_date + " 23:59:59 " + '" ');
	}
    if (jwt_ott.role == 777) where.push(' inv.dmid =' + jwt_ott.id)
    if (jwt_ott.role == 666) where.push(' inv.sdmid =' + jwt_ott.id)
    if (jwt_ott.role == 555) where.push(' inv.mid =' + jwt_ott.id)

    where = where.length > 0 ? 'WHERE' + where.join(' AND ') : ''
    sqlquery += where; sqlc += where;
    sqlquery += ` ORDER BY inv.iolid DESC `
    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += ` LIMIT ${data.index},${data.limit} `
    }


    console.log('List Invoice Query', sqlquery)
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    value.push(result)
                    sql = conn.query(sqlc, function (err, result) {
                        conn.release();
                        if (!err) {
                            value.push(result[0])
                            res.json(value);
                        }
                    })
                } else {
                    conn.release();
                    res.send('Please Try After Sometimes')
                }
            });
        }
    });
});

account.post('/listDeposit', (req, res, err) => {
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, sqlc, value = [], where = [];
    sqlquery = ` SELECT d.id,d.txnid,d.role,d.manid,d.deposit_type,d.deposit_amount,d.reason,d.cdate,d.status,m.bname,man.bname deposited_by,d.mdate,d.gwstatus,d.paymode
    FROM ott.deposit d LEFT JOIN ott.managers m ON d.manid = m.mid
    LEFT JOIN ott.managers man ON d.cby = man.mid `;
    sqlc = ` SELECT COUNT(*) count,SUM(d.deposit_amount) dep_amt FROM ott.deposit d LEFT JOIN ott.managers m ON d.manid = m.mid
    LEFT JOIN ott.managers man ON d.cby = man.mid `;
    if (ott_data.role < 999) {
        where.push(`d.manid =${ott_data.id} `)
    }
    if (data.hasOwnProperty('online_pay') && data.online_pay == 1) {  // Reseller Online Top up
        where.push(` d.deposit_type = 3 `)
    }else{                                                            // Manual Credit and Debit 
        where.push(`d.deposit_type IN(1,2) `)
    }
    if (data.hasOwnProperty('role') && data.role) {
        where.push(' d.role =' + data.role)
    }
    if (data.hasOwnProperty('manid') && data.manid) {
        where.push(' d.manid =' + data.manid)
    }
    if (data.hasOwnProperty('dep_amount') && data.dep_amount) {  //Deposit Amount
		where.push('d.deposit_amount = ' + data.dep_amount);
	}
    if (data.hasOwnProperty('start_date') && data.start_date != '' && data.hasOwnProperty('end_date') && data.end_date != '') {
		where.push(' DATE_FORMAT(d.cdate,"%Y-%m-%d") >= "' + data.start_date + '" AND  DATE_FORMAT(d.cdate,"%Y-%m-%d %hh:%mm:%ss")<= "' + data.end_date + ' 23:59:59' + '" ');
	}
    
    where = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    sqlquery += where; sqlc += where;
     sqlquery += ` ORDER BY d.id DESC `
    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += ` LIMIT ${data.index},${data.limit} `
    }
    console.log('List Deposit data', data);
    console.log('List Deposit Query', sqlquery);
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    value.push(result)
                    sql = conn.query(sqlc, function (err, result) {
                        conn.release();
                        if (!err) {
                            value.push(result[0])
                            res.json(value);
                        }
                    })
                } else {
                    conn.release();
                    res.send('Please Try After Sometimes')
                }
            });
        }
    });
});


async function addDeposit(req) {
    return new Promise(async (resolve, reject) => {
        const jwt_ott = req.ott_data
        var data = req.body, errorarray = [], sqlquery, random, sql_up, role;
        let conn = await poolPromise.getConnection();
        console.log(" ADD Deposit Data : ", data);
        if (conn) {
            await conn.beginTransaction();
            try {
                random = Number(Math.floor(100000 + Math.random() * 900000));
                role = data.Role == 1 ? 777 : data.Role ==2? 666: data.Role ==3 ? 555 :0
                sqlquery = ' INSERT INTO ott.deposit SET ' +
                    " txnid =(SELECT SUBSTRING((UNIX_TIMESTAMP()* (" + random + ")),1,10)),manid=" + data.res_name +
                    " ,reason='" + data.reason + "',deposit_type=" + data.dep_mode + ",deposit_amount=" + data.dep_amount + ",role=" + role + ",cby=" + jwt_ott.id

                if (data.note) {
                    sqlquery += " ,note='" + data.note + "'"
                }
                console.log('Deposit ADD Query : ', sqlquery);
                let result = await conn.query(sqlquery);
                let unix = Math.round(+new Date() / 1000), val = unix * random, t = val.toString(), txnid = t.substring(0, 10);
                if (result[0]['affectedRows'] > 0 && result[0]['insertId'] > 0) {
                    console.log('After In')
                    let sql_balance = ' SELECT man.mamt FROM ott.managers man WHERE man.mid =' + data.res_name
                    console.log("Reseller balance Select Query : ", sql_balance)
                    sql_balance = await conn.query(sql_balance)
                    if (sql_balance[0].length > 0) {
                        if (data.dep_mode == 1) {
                            sql_up = ' UPDATE ott.managers man SET man.`mamt`= man.`mamt`+  ' + data.dep_amount + ' ' +
                                ' WHERE man.mid = ' + data.res_name
                        }

                        if (data.dep_mode == 2) {     // Debit
                            sql_up = ' UPDATE ott.managers man SET man.`mamt`= man.`mamt`-  ' + data.dep_amount + ' WHERE man.mid = ' + data.res_name
                        }
                        console.log("Balance Update Query : ", sql_up)
                        sql_up = await conn.query(sql_up)
                        if (sql_up[0]['affectedRows'] > 0) {
                            let deplog = " INSERT into ott.deposit_log SET user_id='" + data.res_name +
                                "',dep_id = " + result[0]['insertId'] + ",manager_before_balance=" + sql_balance[0][0].mamt +
                                ",role=" + role + ",reason='" + data.reason + "',deposit_type= " + data.dep_mode + ",created_by = " + jwt_ott.id


                            if (data.dep_amount) {
                                if (data.dep_mode == 1) {
                                    deplog += " ,deposit_amount =" + data.dep_amount;
                                } else {
                                    deplog += " ,deposit_amount = -" + data.dep_amount;
                                }
                            }
                            if (data.note) {
                                sqlquery += " ,remarks='" + data.note + "'"
                            }
                            console.log("Deposit Log Query : ", deplog)
                            deplog = await conn.query(deplog)
                            if (deplog[0]['affectedRows'] > 0) {
                                let logdata = JSON.stringify(data)
                                let sqllog = " INSERT into ott.activity_log SET idata='" + logdata + "',cby= " + jwt_ott.id + ",role=" + jwt_ott.role;
                                if (data.dep_mode == 1) sqllog += " ,fname ='ADD DEPOSIT' "
                                else sqllog += " ,fname = 'DEBIT AMOUNT'"
                                console.log("Activity Log Query", sqllog)
                                sqllog = await conn.query(sqllog);
                                if (sqllog[0]['affectedRows'] > 0) {
                                    console.log("Process Completed")
                                    errorarray.push({ status: 1, msg: 'Successfully Deposited', txnid: txnid, id: result[0]['insertId'], error_msg: 0 });
                                    await conn.commit();
                                } else {
                                    console.log(" Activity Log error ")
                                    errorarray.push({ status: 0, msg: 'Please Try after sometimes', error_msg: 'ADF' });
                                    await conn.rollback();
                                }

                            } else {
                                console.log(" Deposit Log error")
                                errorarray.push({ status: 0, msg: 'Please Try after sometimes', error_msg: 'ADF' });
                                await conn.rollback();
                            }

                        } else {
                            console.log(" Update balance error")
                            errorarray.push({ status: 0, msg: 'Please Try after sometimes', error_msg: 'ADF' });
                            await conn.rollback();
                        }
                    } else {
                        console.log(" balance Getting error")
                        errorarray.push({ status: 0, msg: 'Please Try after sometimes', error_msg: 'ADF' });
                        await conn.rollback();
                    }

                } else {
                    console.log("Add Deposit error")
                    errorarray.push({ status: 0, msg: 'Please Try after sometimes', error_msg: 'ADF' });
                    await conn.rollback();
                }

            } catch (e) {
                console.log('Error ', e)
                errorarray.push({ status: 0, msg: 'Please Try after sometimes', error_msg: 'CONN' });
                await conn.rollback();
            }
            console.log('connection Closed.', errorarray);
            conn.release();
        } else {
            errorarray.push({ status: 0, msg: 'Internal Error please try later ', error_msg: 'CONN' });
            return;
        }
        console.log('success--2');
        return resolve(errorarray);
    });
}

account.post('/addDeposit', async (req, res) => {
    req.setTimeout(864000000);
    let result = await addDeposit(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});



account.post('/showGateway', function (req, res, err) {   // Show Gateway
    const jwt_data = req.jwt_data
    let data = req.body, sql, sqlquery;
    sqlquery = ` SELECT id, bank_name FROM ott.pg WHERE status = 1 `
    
    console.log('Showgateway Query', sqlquery);
    pool.getConnection(function (err, conn) {
        if (err) {
            res.end("Failed");
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                conn.release();
                if (!err) {
                    res.json(result)
                } else {
                    console.log('error', err);
                    res.json(result)
                }
            });
        }
    });
});



module.exports = account;