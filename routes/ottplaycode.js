"use strict"
const express = require('express'),
    compress = require('compression'),
    ottplaycode = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise,
    schema = require('../schema/schema');

ottplaycode.use(compress());

const TBL = 'ott.coupon_code',
MAN_TBL='ott.managers';

// const getFilterData = async((data, jwt) => {
//     let where = [];
//     const formatdata = {
//         couponcode: 'cc.ccid',
//         validity_type: 'cc.validity_type',
//         vunit: 'cc.vunit',
//         ccststus: 'cc.ccststus'
//     }

// })

ottplaycode.get('/listOttPlayCode', (req, res, err) => {
    const jwt_ott = req.ott_data;
    let data = req.body, value = [], where = [];
    let sql = ` SELECT cc.*,manc.userid created,manm.userid modified FROM ${TBL} cc INNER JOIN ${MAN_TBL} manc ON cc.cby=manc.mid LEFT JOIN ${MAN_TBL} manm ON cc.mby=manm.mid`;
    let sqlc = ` SELECT COUNT(*) \`count\` FROM ${TBL} cc INNER JOIN ${MAN_TBL} manc ON cc.cby=manc.mid LEFT JOIN ${MAN_TBL} manm ON cc.mby=manm.mid`;
    console.log('query----',sql);
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sql, function (err, result) {
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

async function addOttPlayCode(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data;
        var data = req.body, sql, sqlquery, errorarray = [];
        let conn = await poolPromise.getConnection();
        if (conn) {
            try {
                console.log('Add Ottplaycode Data===', data);
                await conn.beginTransaction();
                data.cby = jwtott.id;
                sql = ` SELECT EXISTS(SELECT * FROM ${TBL} WHERE couponcode =?) count `;
                let [[resultc]] = await conn.query(sql,[data.couponcode]);
                if (resultc['count'] != 0) {
                    errorarray.push({ msg: `${data.couponcode} Code already exists`, error_msg: '65' })
                    await conn.rollback();
                } else {
                        sqlquery = ` INSERT INTO ${TBL} SET ? `
                        let result = await conn.query(sqlquery, data);
                        if (result[0]['affectedRows'] > 0 && result[0]['insertId'] > 0) {
                            let logData = JSON.stringify(data)
                            let sqllog = " INSERT into ott.activity_log SET fname= 'ADD OTTPLAY CODE' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                            let resultlog = await conn.query(sqllog);
                            console.log(resultlog[0]['affectedRows']);
                            if (resultlog[0]['affectedRows'] > 0) {
                                errorarray.push({ msg: `${data.couponcode} Added Successfully`, error_msg: 0, id: result[0]['insertId'] })
                                await conn.commit();
                            } else {
                                errorarray.push({ msg: "Please Try After Sometime", error_msg: 80 });
                                await conn.rollback();
                            }

                        } else {
                            errorarray.push({ msg: 'Please Try After Sometime', error_msg: 84 })
                            await conn.rollback();
                        }
                   
                }
                console.log("connection Closed");
            } catch (e) {
                console.log('Connection Error ', e)
                errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });
                await conn.rollback()
            }
        } else errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });

        conn.release();
        console.log('Return Value----', errorarray);
        return resolve(errorarray);
    });
}

async function updateOttPlayCode(req) {
    return new Promise(async (resolve, reject) => {
        console.log('Update------------------------------');
        const jwtott = req.ott_data;
        var data = req.body, ccid = req.params.id, sql, sqlquery, errorarray = [];
        let conn = await poolPromise.getConnection();
        if (conn) {
            try {
                await conn.beginTransaction();
                sql = ` SELECT EXISTS(SELECT * FROM ${TBL} WHERE couponcode =? AND ccid != ?) count `;
                let [[resultc]] = await conn.query(sql,[data.couponcode,ccid]);
                if (resultc['count'] != 0) {
                    errorarray.push({ msg: `${data.couponcode} COde already exists`, error_msg: 114 })
                    await conn.rollback();
                } else {
                        sqlquery = ` UPDATE ${TBL} SET couponcode= '${data.couponcode}', validity_type= ${data.validity_type},vunit =${data.vunit},
                        mby=${jwtott.id},mdate=NOW() WHERE ccid =${ccid} `
                        let result = await conn.query(sqlquery);
                        if (result[0]['affectedRows'] > 0) {
                            let logData = JSON.stringify(data)
                            let sqllog = " INSERT into ott.activity_log SET fname= 'EDIT CHANNEL' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                            let resultlog = await conn.query(sqllog);
                            console.log(resultlog[0]['affectedRows']);
                            if (resultlog[0]['affectedRows'] > 0) {
                                errorarray.push({ msg: `${data.couponcode} Updated Successfully`, error_msg: 0 })
                                await conn.commit();
                            } else {
                                errorarray.push({ msg: "Please Try After Sometime", error_msg: 129 });
                                await conn.rollback();
                            }

                        } else {
                            errorarray.push({ msg: 'Please Try After Sometime', error_msg: 134 })
                            await conn.rollback();
                        }
                    
                }
                console.log("connection Closed");
            } catch (e) {
                console.log('Connection Error ', e)
                errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' })
                await conn.rollback();
            }
        } else errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' })

        conn.release();
        console.log('Return Value----', errorarray);
        return resolve(errorarray);
    });
}

ottplaycode.post('/addOttPlayCode', async (req, res) => {
    req.setTimeout(864000000);
    let result = await addOttPlayCode(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});
ottplaycode.put('/updateOttPlayCode/:id', async (req, res) => {
    req.setTimeout(864000000);
    let result = await updateOttPlayCode(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});



module.exports = ottplaycode;


