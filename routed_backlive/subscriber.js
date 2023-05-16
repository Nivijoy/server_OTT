const express = require('express'),
    compress = require('compression'),
    subs = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise;
const multer = require('multer');
const schema = require('../schema/schema');
const getImage = require('../handler/getFile');

subs.use(compress());

subs.post('/listSubscriber', (req, res, err) => {
    const jwt_ott = req.ott_data;
    var data = req.body, sql, sqlquery, sqlc, value = [], where = [];
    sqlquery = ` SELECT u.id,u.dmid,u.sdmid,u.mid,u.fullname,u.profileid,u.packid,u.gender,u.dob,u.email,u.mobile,u.ustatus,u.mobileverify,u.emailverify,
  u.role_type,u.expirydate,u.ottexpirydate,u.create_from,u.ottplancode, (CASE WHEN u.role_type = 1 THEN (SELECT bname FROM ott.managers d WHERE d.mid =u.dmid)
  WHEN u.role_type = 2 THEN (SELECT bname FROM ott.managers s WHERE s.mid =u.sdmid)
  WHEN u.role_type = 3 THEN (SELECT bname FROM ott.managers m WHERE m.mid =u.mid)  
   END) manager,u.cdate,u.user_pwd FROM ott.ottUsers u `

    sqlc = ` SELECT COUNT(*) \`count\` FROM ott.ottUsers u  `;

    if (data.hasOwnProperty('id') && data.id) {
        where.push(' u.id =' + data.id)
    }
    if (data.hasOwnProperty('mobile') && data.mobile) {
        where.push(' u.id =' + data.mobile)
    }
    if (data.hasOwnProperty('active') && data.active == 1)  {  // Active
        where.push(' u.ustatus = 1 AND u.ottexpirydate > NOW() ' )
    }
    if (data.hasOwnProperty('active') && data.active == 2)  {  // Expired
        where.push(' u.ustatus = 1 AND u.ottexpirydate < NOW() ' )
    }
    if (data.hasOwnProperty('create_from') && data.create_from)  {  // 1-Gltv 2-BMS
        where.push(' u.create_from = '+ data.create_from )
    }
   
    if (jwt_ott.role == 777) where.push(' u.dmid =' + jwt_ott.id + ' AND u.role_type = 1 ')
    if (jwt_ott.role == 666) where.push(' u.sdmid =' + jwt_ott.id + ' AND u.role_type = 2 ')
    if (jwt_ott.role == 555) where.push(' u.mid =' + jwt_ott.id + ' AND u.role_type = 3 ')

    where = where.length > 0 ? 'WHERE' + where.join(' AND ') : ''
    sqlquery += where; sqlc += where;
    if(data.hasOwnProperty('index') && data.hasOwnProperty('limit')){
       sqlquery += ` LIMIT ${data.index},${data.limit} `
    }
    console.log('list user data', data);
    console.log('List user Query', sqlquery)
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


async function addSubscriber(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data;
        var data = req.body, sql, sqlquery, sqlc = '', errorarray = [], status = false, mstatus = false, estatus = false;
        let conn = await poolPromise.getConnection();
        if (conn) {
            try {
                console.log('Add Subscriber Data ===', data);
                await conn.beginTransaction();
                sql = ` SELECT EXISTS ( SELECT * FROM ott.managers WHERE userid = '${data.profileid}' UNION 
            SELECT * FROM ott.ottUsers WHERE profileid ='${data.profileid}' ) count `;
                let [[resultc]] = await conn.query(sql);
                if (resultc['count'] != 0) {
                    errorarray.push({ msg: `${data.profileid} ProfileId already exists`, error_msg: 23 })
                    await conn.rollback();
                } else {
                    let msql = ` SELECT COUNT(*) tot1 FROM ott.\`ottUsers\` WHERE mobile ='${data.mobile}' `
                    console.log(msql)
                    let [mresult] = await conn.query(msql);
                    console.log(mresult)
                    if (mresult[0].tot1 > 0) {
                        mstatus = true;
                        errorarray.push({ msg: 'Mobile No Already Exists', error_msg: '69' });
                        await conn.rollback();
                    }
                    if (!mstatus) {
                        let esql = ` SELECT COUNT(*) tot1 FROM ott.\`ottUsers\` WHERE email ='${data.email}' `
                        let [eresult] = await conn.query(esql)
                        if (eresult[0].tot1 > 0) {
                            estatus = true;
                            errorarray.push({ msg: 'Email ID Already Exists', error_msg: '69' });
                            await conn.rollback();
                        }
                        if (!mstatus && !estatus) {
                            if ((data.role == 1 && jwtott.role > 777) || jwtott.role == 777) {
                                let distid = jwtott.role == 777 ? jwtott.id : data.dmid
                                sqlc += ` ,dmid =${distid},role_type=1 `
                            }
                            if ((data.role == 2 && jwtott.role > 777) || jwtott.role == 666) {
                                let subid = jwtott.role == 666 ? jwtott.id : data.sdmid
                                sqlc += ` ,dmid =(SELECT dmid FROM ott.managers WHERE mid =${subid}),sdmid =${subid},role_type=2`
                            }
                            if ((data.role == 3 && jwtott.role > 777) || jwtott.role == 555) {
                                let man_id = jwtott.role == 555 ? jwtott.id : data.mid
                                try {
                                    let sqlid = ` SELECT dmid,sdmid FROM ott.managers WHERE mid =${man_id}`
                                    console.log(sqlid)
                                    let [[manid]] = await conn.query(sqlid);
                                    console.log(manid)
                                    sqlc += ` ,dmid =${manid.dmid},sdmid =${manid.sdmid},mid=${man_id},role_type=3`
                                } catch {
                                    status = true;
                                    errorarray.push({ msg: 'Please Try After Sometimes', error_msg: '31' })
                                    await conn.rollback();
                                }
                            }

                            if (!status) {
                                data.ustatus = data.ustatus == true ? 1 : 0;
                                sqlquery = ` INSERT INTO ott.ottUsers SET profileid ='${data.profileid}',fullname='${data.fullname}',pwd=md5('${data.pwd}'),user_pwd='${data.pwd}',
                         gender=${data.gender},dob=DATE_FORMAT(STR_TO_DATE('${data.dob}',"%Y-%m-%dT%H:%i:%s.000Z"),"%Y-%m-%d"),ustatus=${data.ustatus},cby=${jwtott.id},mobile='${data.mobile}' `
                                if (data.email) sqlquery += `,email='${data.email}' `
                                if (sqlc != '') sqlquery += sqlc;
                                console.log('User Insert Query----', sqlquery)
                                let result = await conn.query(sqlquery)
                                if (result[0].affectedRows > 0 && result[0].insertId > 0) {
                                    let logData = JSON.stringify(data)
                                    let sqllog = " INSERT into ott.activity_log SET fname= 'ADD USER' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                                    let resultlog = await conn.query(sqllog);
                                    console.log(resultlog[0]['affectedRows']);
                                    if (resultlog[0]['affectedRows'] > 0) {
                                        errorarray.push({ msg: `${data.profileid} Added Successfully`, error_msg: 0, id: result[0]['insertId'] })
                                        await conn.commit();
                                    } else {
                                        errorarray.push({ msg: "Please Try After Sometime", error_msg: 40 });
                                        await conn.rollback();
                                    }

                                } else {
                                    errorarray.push({ msg: 'Please Try After Sometime', error_msg: 34 })
                                    await conn.rollback();
                                }
                            }
                        }
                    }

                }
                console.log("connection Closed");
            } catch (e) {
                console.log('Connection Error ', e)
                errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });
                await conn.rollback();
            }
        } else {
            errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });

        }
        conn.release();
        console.log('Return Value----', errorarray);
        return resolve(errorarray);
    });
}

async function editSubscriber(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data;
        var data = req.body, sql, sqlquery, sqlc = '', errorarray = [], status = false, mstatus = false, estatus = false;
        let conn = await poolPromise.getConnection();
        if (conn) {
            try {
                console.log('EDIT Subscriber Data ===', data);
                await conn.beginTransaction();
                let sqldata = ` SELECT * FROM ott.ottUsers WHERE id ='${data.id}' `
                sql = ` SELECT EXISTS ( ${sqldata} ) count `;
                let [[resultc]] = await conn.query(sql);
                if (resultc['count'] == 0) {
                    errorarray.push({ msg: `${data.profileid} Profile Not exists`, error_msg: 88 })
                    await conn.rollback();
                } else {
                    let [[sdata]] = await conn.query(sqldata);
                    if (sdata) {
                        let msql = ` SELECT COUNT(*) tot1 FROM ott.\`ottUsers\` WHERE mobile ='${data.mobile}' AND id != ${data.id} `
                        let [mresult] = await conn.query(msql);
                        if (mresult[0].tot1 > 0) {
                            mstatus = true;
                            errorarray.push({ msg: 'Mobile No Already Exists', error_msg: '69' });
                            await conn.rollback();
                        }
                        if (!mstatus) {
                            let esql = ` SELECT COUNT(*) tot1 FROM ott.\`ottUsers\` WHERE email ='${data.email}' AND id != ${data.id} `
                            console.log(esql)
                            let [eresult] = await conn.query(esql)
                            console.log(eresult)
                            if (eresult[0].tot1 > 0) {
                                estatus = true;
                                errorarray.push({ msg: 'Email ID Already Exists', error_msg: '69' });
                                await conn.rollback();
                            }
                            if (!mstatus && !estatus) {
                                if ((data.role == 1 && jwtott.role > 777) || jwtott.role == 777) {
                                    let distid = jwtott.role == 777 ? jwtott.id : data.dmid
                                    sqlc += ` ,dmid =${distid},role_type=1 `
                                }
                                if ((data.role == 2 && jwtott.role > 777) || jwtott.role == 666) {
                                    let subid = jwtott.role == 666 ? jwtott.id : data.sdmid
                                    sqlc += ` ,dmid =(SELECT dmid FROM ott.managers WHERE mid =${subid}),sdmid =${subid},role_type=2`
                                }
                                if ((data.role == 3 && jwtott.role > 777) || jwtott.role == 555) {
                                    let man_id = jwtott.role == 555 ? jwtott.id : data.mid
                                    try {
                                        let sqlid = ` SELECT dmid,sdmid FROM ott.managers WHERE mid =${man_id}`
                                        console.log(sqlid)
                                        let [[manid]] = await conn.query(sqlid);
                                        sqlc += ` ,dmid =${manid.dmid},sdmid =${manid.sdmid},mid=${man_id},role_type=3`
                                    } catch {
                                        status = true;
                                        errorarray.push({ msg: 'Please Try After Sometimes', error_msg: '31' })
                                        await conn.rollback();
                                    }
                                }
                                if (!status) {
                                    data.ustatus = data.ustatus == true ? 1 : 0;
                                    sqlquery = ` UPDATE ott.ottUsers SET profileid ='${data.profileid}',fullname='${data.fullname}',
                     gender=${data.gender},dob=DATE_FORMAT(STR_TO_DATE('${data.dob}',"%Y-%m-%dT%H:%i:%s.000Z"),"%Y-%m-%d"),ustatus=${data.ustatus},mby=${jwtott.id},mdate=NOW(),mobile='${data.mobile}' `
                                    if (sdata.mobile != data.mobile) sqlquery += ` ,mobileverify = 0 `
                                    if (sdata.email != data.email) sqlquery += ` ,emailverify = 0 `
                                    if (data.email) sqlquery += `,email='${data.email}' `
                                    if (sqlc != '') sqlquery += sqlc;
                                    sqlquery += ` WHERE id =${data.id}`
                                    console.log('User Update Query----', sqlquery)
                                    let [result] = await conn.query(sqlquery)
                                    if (result.affectedRows > 0) {
                                        let logData = JSON.stringify(data)
                                        let sqllog = " INSERT into ott.activity_log SET fname= 'UPDATE USER' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                                        let resultlog = await conn.query(sqllog);
                                        console.log(resultlog[0]['affectedRows']);
                                        if (resultlog[0]['affectedRows'] > 0) {
                                            errorarray.push({ msg: `${data.profileid} Updated Successfully`, error_msg: 0 })
                                            await conn.commit();
                                        } else {
                                            errorarray.push({ msg: "Please Try After Sometime", error_msg: 117 });
                                            await conn.rollback();
                                        }

                                    } else {
                                        errorarray.push({ msg: 'Please Try After Sometime', error_msg: 111 })
                                        await conn.rollback();
                                    }
                                }
                            }
                        }

                    } else {
                        errorarray.push({ msg: 'Please Try After Sometime', error_msg: 160 })
                        await conn.rollback();
                    }
                }
                console.log("connection Closed");
            } catch (e) {
                console.log('Connection Error ', e)
                errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });
                await conn.rollback();
            }
        } else {
            errorarray.push({ msg: 'Please Try After Sometime', error_msg: 160 })
            await conn.rollback();
        }
        conn.release();
        console.log('Return Value----', errorarray);
        return resolve(errorarray);
    });
}



subs.post('/addSubscriber', async (req, res) => {
    req.setTimeout(864000000);
    let result = await addSubscriber(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});
subs.post('/editSubscriber', async (req, res) => {
    req.setTimeout(864000000);
    let result = await editSubscriber(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});


subs.post('/showuser', (req, res, err) => {
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, where = [];
    sqlquery = ` SELECT u.id,u.busid,u.dmid,u.sdmid,u.mid,u.profileid,u.mobile FROM ott.ottUsers u `;

    if (ott_data.role == 777) where.push(` u.dmid =${ott_data.id} AND u.role_type = 1 `)
    if (ott_data.role == 666) where.push(` u.sdmid =${ott_data.id} AND u.role_type = 2 `)
    if (ott_data.role == 555) where.push(` u.mid =${ott_data.id} AND u.role_type = 3 `)

    if (data.hasOwnProperty('uid') && data.uid) {
        where.push(` u.id =${data.uid}`)
    }
    if (data.hasOwnProperty('mobile_id') && data.mobile_id) {
        where.push(` u.id =${data.mobile_id}`)
    }
    if (data.hasOwnProperty('like') && data.like) {
        where.push(` u.profileid LIKE %'${data.like}'%`)
    }
    if (data.hasOwnProperty('mobile_like') && data.mobile_like) {
        where.push(` u.mobile LIKE %'${data.mobile_like}'%`)
    }

    sqlquery += where.length ? ` WHERE ${where.join(' AND ')}` : ''

    console.log('Show user Query', sqlquery)
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                conn.release();
                if (!err) {
                    res.json(result);
                } else {
                    res.send('Please Try After Sometimes')
                }
            });
        }
    });
});


subs.post('/changeProfilePwd', function (req, res) {
    var data = req.body, sql, sql_oldpass;
    const ott_data = req.ott_data;
    console.log('change password data', data, ott_data)
    sql_oldpass = ' SELECT id,pwd FROM ott.ottUsers WHERE id= ' + data.id;

    pool.getConnection(function (err, conn) {
        if (err) {
            errorhandler("Please try after sometimes");
            console.log("Failed to update PF PWD");
        } else {
            sql = conn.query(sql_oldpass, function (err, result) {
                if (!err) {
                    console.log(sql.sql);
                    if (result[0]['pwd'] == data.password_en) {
                        errorhandler("Password Already exsists");
                    }
                    else {
                        sql = conn.query(' UPDATE ott.ottUsers SET ' +
                            ' pwd="' + data.password_en + '",user_pwd="' + data.Password + '" WHERE id=' + data.id, function (err, result) {
                                console.log(sql.sql, '\n', 'err', err, '\n', 'res', result)
                                if (!err) {
                                    sql = conn.query("INSERT INTO ott.activity_log SET fname='UPDATE USER PASSWORD ID:" + data.id + "' ,idata= 'DONE BY', cby=" +
                                        ott_data.id + ",role=" + ott_data.role,
                                        function (err, result) {
                                            console.log(sql.sql, '\n', 'err', err, '\n', 'res', result)
                                            if (!err) {
                                                errorhandler("SuccessFully updated", 1);
                                            } else {
                                                errorhandler("Failed To update ");
                                            }
                                            // errorhandler("SuccessFully Updated", 1);
                                        });
                                } else {
                                    errorhandler("Failed To Update");
                                }
                            });
                    }
                } else {
                    errorhandler("Please try after sometimes")
                }
            });
            function errorhandler(msg, status = 0) {
                console.log('connection Closed.');
                conn.release();
                res.send(JSON.stringify({ msg: msg, status: status }));
            }
        }
    });
});


subs.post('/getUser', function (req, res) {
    pool.getConnection(function (err, conn) {
        var sql, data = req.body,
            sqlquery = ` SELECT u.id,u.dmid,u.sdmid,u.mid,u.fullname,u.profileid,u.gender,u.dob,u.email,u.mobile,u.ustatus,u.role_type FROM ott.ottUsers u WHERE u.id = ?  `
        if (err) {
            console.log('err');
        } else {
            sql = conn.query(sqlquery, data.id, function (err, result) {
                console.log(sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    // console.log('Result', result)
                    res.json(result[0]);
                }
            });
        }
    });
});





module.exports = subs;