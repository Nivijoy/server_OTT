"use strict"
const express = require('express'),
    compress = require('compression'),
    pack = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise,
    schema = require('../schema/schema');

pack.use(compress());

pack.post('/getOtt', (req, res, err) => {
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, where = [];
    sqlquery = ' SELECT opf.*,IF(opf.`ott_id`=pf.ott_id,1,0) ottstatus FROM ott.`OTT_platforms` opf LEFT JOIN ' +
        ' (SELECT pf.`ott_id` FROM ott.`OTT_platforms` pf LEFT JOIN ott.`ottUsers` u ON FIND_IN_SET(pf.`ott_id`,u.`ott_platform`) ' +
        ' WHERE u.id=' + ott_data.id + ' ) pf ON opf.`ott_id`=pf.ott_id WHERE opf.pstatus=1 ';

    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                console.log("Get OTT Query :", sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});

pack.post('/listAllowPack', (req, res, err) => {
    const jwt_ott = req.ott_data;
    var data = req.body, sql, sqlquery, sqlc, value = [], where = [];
    // ,CONCAT(COALESCE(ot.ottplan_name,''),' ',op.packname,'(',ot.ottplancode,')') packs,
    sqlquery = ` SELECT p.id,p.manid,p.gltvpackid,p.gltvpackamt,p.gltvdaytype,p.gltvdays,p.ottpid,p.ottpamt,p.taxtype,p.otttype,p.apstatus,ot.ottplan_name,op.packname,m.bname
    ,IF(p.ottpid=0 OR p.ottpid IS NULL ,op.packname,
    CONCAT(IFNULL(ot.ottplan_name,' '),' ','(',IFNULL(ot.ottplancode,' '),')',op.packname,'(',v.vendors_name,')')) packs,
    ot.dayormonth,ot.days,p.ott_vendor,
    IF(p.taxtype=1, (p.ottpamt+p.gltvpackamt),((p.ottpamt-(p.ottpamt*18/(100+18)))+(p.gltvpackamt-(p.gltvpackamt*18/(100+18)))) ) oamt,
    IF(p.taxtype=0, (p.ottpamt*18/(100+18)+p.gltvpackamt*18/(100+18)),((p.ottpamt*18/100)+(p.gltvpackamt*18/100))) otaxamt
     FROM ott.managersallowedpack p LEFT JOIN ott.ottplan ot ON p.ottpid = ot.ottplanid LEFT JOIN ott.package op ON op.pack_id = p.gltvpackid 
    LEFT JOIN ott.managers m ON p.manid = m.mid INNER JOIN ott.ott_vendors v ON v.ovid=p.ott_vendor `;

    sqlc = ` SELECT COUNT(*) \`count\` FROM ott.managersallowedpack p LEFT JOIN ott.ottplan ot ON p.ottpid = ot.ottplanid
     LEFT JOIN ott.package op ON op.pack_id = p.gltvpackid LEFT JOIN ott.managers m ON p.manid = m.mid INNER JOIN ott.ott_vendors v ON v.ovid=p.ott_vendor `;

    if (data.hasOwnProperty('id') && data.id) {
        where.push(' p.id =' + data.id)
    }
    if (data.hasOwnProperty('manid') && data.manid) {
        where.push(' p.manid =' + data.manid)
    }
    if (data.hasOwnProperty('ott_plan') && data.ott_plan) {
        where.push(' p.ottpid =' + data.ott_plan)
    }
    if (data.hasOwnProperty('taxtype') && data.taxtype) {
        where.push(' p.taxtype =' + data.taxtype)
    }
    if (data.hasOwnProperty('status') && data.status) {
        where.push(' p.apstatus =' + data.status)
    } else {
        where.push(' p.apstatus = 1')
    }
    if (data.hasOwnProperty('ott_vendor') && data.ott_vendor) {
        where.push(` p.ott_vendor = ${data.ott_vendor}`)
    }
    if (jwt_ott.role == 777 || jwt_ott.role == 666 || jwt_ott.role == 555) {
        where.push(' p.manid =' + jwt_ott.id)
    }
    if (data.hasOwnProperty('like') && data.like) {
        where.push('(CONCAT(ot.ottplan_name," ",op.packname," ",ot.`ottplancode`) LIKE "%' + data.like + '%" OR CONCAT(op.packname," ",ot.ottplan_name," ",ot.`ottplancode`) LIKE "%' + data.like + '%" OR op.packname LIKE "%' + data.like + '%" )');
    }
     where.push(`ot.status = 1`)
    where = where.length > 0 ? 'WHERE' + where.join(' AND ') : ''
    sqlquery += where; sqlc += where;

    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += ` LIMIT ${data.index},${data.limit} `
    }
    console.log('Allow Pack data', data);
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

pack.post('/getottplanname', (req, res, err) => {
    const jwt_data = req.jwt_data;
    var data = req.body, sqlquery, sql;
    console.log('Data', data)
    sqlquery = ' SELECT GROUP_CONCAT(op.`ott_platform`) ottname,p.ottamount, ' +
        ' IF(p.otttaxtype=1, p.ottamount,(p.ottamount-(p.ottamount*18/(100+18))) ) oamt, ' +
        ' IF(p.otttaxtype=0, p.ottamount*18/(100+18),(p.ottamount*18/100)) otaxamt ' +
        ' FROM ott.`ottplan` p, ott.`OTT_platforms` op WHERE FIND_IN_SET(op.`ott_id`,p.`ottplatform`) AND p.status = 1 ';
    if (data.ottplanid) sqlquery += ` AND p.ottplanid = ${data.ottplanid}`
    // if (data.packid) sqlquery += ` AND p.ottplanid = (SELECT ottplan FROM bms.services_price WHERE id =${data.packid})`
    // if (data.invid) sqlquery += ` AND p.ottplanid =(SELECT ottplanid FROM bms.user_invoice WHERE invid = ${data.invid})`
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                console.log("Get Ott Plan Name Query :", sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result[0]));
                } else {
                    console.log('Error to Get Ott Plan Name..');
                }
            });
        }
    });
});


pack.post('/listPackMap', (req, res, err) => {   //Update PAck List
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, where = [];
    sqlquery = ` SELECT p.id,p.manid,p.gltvpackid,p.gltvpackamt,p.gltvdaytype,p.gltvdays,p.ottpid,p.ottpamt,p.taxtype,p.otttype,p.apstatus,ot.ottplan_name,op.packname,ot.ottplancode,p.ott_vendor
    FROM ott.managersallowedpack p LEFT JOIN ott.ottplan ot ON p.ottpid = ot.ottplanid LEFT JOIN ott.package op ON op.pack_id = p.gltvpackid `;

    if (data.hasOwnProperty('manid') && data.manid) {
        where.push(' p.manid =' + data.manid)
    }
    sqlquery += where ? 'WHERE' + where.join(' AND ') : ''
    console.log('ListPackMap Query', sqlquery)
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                console.log("Get OTT Query :", sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    // console.log('PackMap', result)
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});


// Pack Mapping

async function packMap(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data;
        var data = req.body, errorarray = [];
        let conn = await poolPromise.getConnection();
        if (conn) {
            console.log('PackMapping data', data.bulkPack.length, data.ott_vendor)
            for (let pack of data.bulkPack) {
                let status = false;
                await conn.beginTransaction();
                try {
                    // console.log('PackMap Data------------', pack);
                    let plancheckQuery = ` SELECT * FROM ott.managersallowedpack WHERE ottpid =(SELECT ottplanid FROM ott.ottplan WHERE ottplan_name='${pack.ottpid}' AND manid=${data.manid}) `
                    let [[planResult]] = await conn.query(plancheckQuery)
                    if (planResult) {
                        errorarray.push({ msg: `OTT Plan:${pack.ottpid} Already Mapped`, error_msg: '169' });
                        await conn.rollback(); continue;
                    } else {
                        if (pack.otttype == 2 && (!pack.ottpid || !pack.ottpamt)) {
                            status = true;
                            errorarray.push({ msg: 'Please Fill Ottplan or Amount', error_msg: '173' });
                            await conn.rollback(); continue;
                        }
                        if (!status) {
                            let sqlquery = ` INSERT INTO ott.managersallowedpack SET manid=${data.manid},gltvpackid=${pack.gltvpackid},gltvpackamt=${pack.gltvpackamt},
                    gltvdaytype=${pack.gltvdaytype},gltvdays=${pack.gltvdays},taxtype=${pack.taxtype},otttype=${pack.otttype},cby=${jwtott.id},ott_vendor=${data.ott_vendor} `

                            if (pack.otttype == 2) {
                                sqlquery += ` ,ottpid =(SELECT ottplanid FROM ott.ottplan WHERE ottplan_name='${pack.ottpid}'),ottpamt=${pack.ottpamt} `
                            }
                            console.log('PackMap Query', sqlquery);
                            let result = await conn.query(sqlquery);
                            if (result[0]['affectedRows'] > 0 && result[0]['insertId'] > 0) {
                                let logData = JSON.stringify(pack)
                                let sqllog = " INSERT into ott.activity_log SET fname= 'PACK MAPPING' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                                let resultlog = await conn.query(sqllog);
                                console.log(resultlog[0]['affectedRows']);
                                if (resultlog[0]['affectedRows'] > 0) {
                                    errorarray.push({ msg: "PackName Added Successfully", error_msg: 0 });
                                    await conn.commit();
                                } else {
                                    errorarray.push({ msg: "Please Try After Sometime.", error_msg: 154 });
                                    await conn.rollback();
                                    continue;
                                }
                            } else {
                                errorarray.push({ msg: 'Please Try After Sometime', error_msg: '49' });
                                await conn.rollback();
                                continue;
                            }
                        }
                    }


                } catch (e) {
                    console.log('Connection Error ', e)
                    errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });
                    await conn.rollback();
                    continue;
                }
            }
        } else {
            errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });
        }
        conn.release();
        console.log('Return Value----', errorarray);
        return resolve(errorarray);
    });
}

async function updatepackMap(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data;
        var data = req.body, errorarray = [];
        let conn = await poolPromise.getConnection();
        try {
            if (conn) {
                console.log('UpdatePack', data)
                console.log('PackMapping data', data.map[0]['plan'], data.map[0]['plan'].length)
                let manid = data.map[0]['manid'];
                for (let pack of data.map[0]['plan']) {
                    let status = false;
                    await conn.beginTransaction();
                    try {
                        console.log('PackMap Data------------', pack);
                        if (pack.otttype == 2 && (!pack.ottpid || !pack.ottpamt)) {
                            console.log('PACK')
                            status = true;
                            errorarray.push({ msg: 'Please Fill Ottplan or Amount', error_msg: '143' });
                            await conn.rollback(); continue;
                        }
                        if (!status) {
                            let sqlquery = ` UPDATE ott.managersallowedpack SET manid=${manid},gltvpackamt=${pack.gltvpackamt},
                    gltvdaytype=${pack.gltvdaytype},gltvdays=${pack.gltvdays},taxtype=${pack.taxtype},apstatus=${pack.apstatus},mby=${jwtott.id},mdate=NOW(),ott_vendor=${pack.ott_vendor} `

                            if (pack.otttype == 2) {
                                sqlquery += ` ,ottpamt=${pack.ottpamt} `
                            }
                            sqlquery += ` WHERE id = ${pack.id} `
                            console.log('PackMap Query', sqlquery);
                            let result = await conn.query(sqlquery);
                            if (result[0]['affectedRows'] > 0) {
                                let logData = JSON.stringify(pack)
                                let sqllog = " INSERT into ott.activity_log SET fname= 'UPDATE PACK MAPPING' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                                let resultlog = await conn.query(sqllog);
                                console.log(resultlog[0]['affectedRows']);
                                if (resultlog[0]['affectedRows'] > 0) {
                                    errorarray.push({ msg: "Updated Successfully", error_msg: 0 });
                                    await conn.commit();
                                } else {
                                    errorarray.push({ msg: "Please Try After Sometime.", error_msg: 146 });
                                    await conn.rollback(); continue;
                                }
                            } else {
                                errorarray.push({ msg: 'Please Try After Sometime', error_msg: '140' });
                                await conn.rollback(); continue;
                            }
                        }


                    } catch (e) {
                        console.log('Connection Error ', e)
                        errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });
                        await conn.rollback(); continue;
                    }
                }
            } else {
                errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });
            }
        } catch (e) {
            errorarray.push({ msg: 'Please Select plan ', error_msg: '268' });
        }
        conn.release();
        console.log('Return Value----', errorarray);
        return resolve(errorarray);
    });
}
pack.post('/listOTTPlan', function (req, res) {
    const jwt_data = req.jwt_data;
    var data = req.body, sql, where = [], value = [],
        sqlquery = ' SELECT ott.ottplanid,ott.ottplan_name,ott.ottplancode,ott.otttaxtype,ott.ottamount,ott.ottplatform,ott.ott_vendor, ' +
            ' ott.dayormonth,ott.days,ott.status,LENGTH(ottplatform)-LENGTH(REPLACE(ottplatform, ",", "")) + 1  `tot`, ' +
            ' (CASE WHEN ott.ottplatform THEN (SELECT GROUP_CONCAT(op.ott_platform) FROM ott.OTT_platforms op WHERE FIND_IN_SET(op.ott_id,ott.ottplatform)) ' +
            ' END) platforms FROM ott.`ottplan` ott ',
        sqlqueryc = ' SELECT COUNT(*) `count` FROM ott.`ottplan` ott ';

    if (data.hasOwnProperty('ottplan_code') && data.ottplan_code) {
        where.push(' ott.ottplanid =' + data.ottplan_code)
    }
    if (data.hasOwnProperty('ottplan_name') && data.ottplan_name) {
        where.push(' ott.ottplanid =' + data.ottplan_name)
    }
    if (data.hasOwnProperty('id') && data.id) {
        where.push(' ott.ottplanid =' + data.id)
    }
    if (data.hasOwnProperty('status') && data.status) {
        where.push(' ott.status =' + data.status)
    }
    if (data.hasOwnProperty('days') && data.days) {
        where.push(' ott.days =' + data.days)
    }
    if (data.hasOwnProperty('ott_vendor') && data.ott_vendor) {
        where.push(' ott.ott_vendor =' + data.ott_vendor)
    }
    if (where.length > 0) {
        sqlquery += ' WHERE ' + where.join(' AND ')
        sqlqueryc += ' WHERE ' + where.join(' AND ')
    }
    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += ' LIMIT ' + data.index + ', ' + data.limit;
    }
    console.log('List OTTplan', sqlquery);
    pool.getConnection(function (err, conn) {
        if (err) {
            console.log("Failed")
            res.end("Failed");
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    let value = [];
                    value.push(result);
                    sql = conn.query(sqlqueryc, function (err, result) {
                        conn.release();
                        if (!err) {
                            value.push(result[0]);
                            res.send(JSON.stringify(value));
                        } else {
                            res.send(JSON.stringify(result));
                        }
                    });

                } else {
                    console.log('error', err);
                    conn.release();
                    res.send(JSON.stringify(result));
                }
            });
        }
    });
});



async function addOTTPlan(req) {
    return new Promise(async (resolve, reject) => {
        const jwt_ott = req.ott_data;
        var data = req.body, errorarray = [], isp_id, group_id;
        let conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Add OTTPlan data', data.bulkOTTdata.length);
            for (var i = 0; i < data.bulkOTTdata.length; i++) {
                await conn.beginTransaction();
                try {
                    let plan = data.bulkOTTdata[i];
                    console.log('OTTPLAN', plan);
                    let sqlcount = ' SELECT EXISTS(SELECT * FROM ott.ottplan WHERE ottplancode=? ) `count` ';
                    console.log('Plancode Count Query', sqlcount);
                    let [[rcount]] = await conn.query(sqlcount, plan.ottplancode);
                    if (rcount['count'] != 0) {
                        errorarray.push({ msg: " OTTPlanCode   '" + plan.ottplancode + "' Already Exists", error_msg: '191' });
                        await conn.rollback();
                        continue;
                    } else {
                        plan.status = plan.status == true ? 1 : 0;
                        let sqlplan = ` INSERT INTO ott.ottplan SET ottplan_name='${plan.ottplan_name}',ottplancode='${plan.ottplancode}',
                         otttaxtype=${plan.otttaxtype},ottamount=${plan.ottamount},ottplatform='${plan.ottplatform}',dayormonth=${plan.dayormonth},
                         days=${plan.days},status=${plan.status},cby=${jwt_ott.id},ott_vendor=${plan.ott_vendor} `
                        let result = await conn.query(sqlplan);
                        if (result[0]['affectedRows'] > 0 && result[0]['insertId'] > 0) {
                            let logdata = JSON.stringify(plan)
                            let sqllog = " INSERT INTO ott.activity_log SET fname ='Add OTTPPLAN ',`idata` = '" + logdata + "',cby = " + jwt_ott.id + ",role=" + jwt_ott.role
                            let resultlog = await conn.query(sqllog);
                            if (resultlog[0]['affectedRows'] > 0 & resultlog[0]['insertId'] > 0) {
                                errorarray.push({ msg: '"' + plan.ottplancode + '"Successfully Added', error_msg: 0 })
                                await conn.commit();
                            } else {
                                errorarray.push({ msg: 'Please try after sometimes', error_msg: '202' });
                                await conn.rollback();
                                continue;
                            }
                        } else {
                            errorarray.push({ msg: 'Please Try After Sometimes', error_msg: '198' });
                            await conn.rollback();
                            continue;
                        }
                        // }
                    }

                } catch (e) {
                    console.log('Inside Catch Error', e);
                    errorarray.push({ msg: 'Please try after sometimes', error_msg: 'CONN' });
                    await conn.rollback();
                }
                console.log('Success-1', errorarray);
                console.log('Connection Closed');
                conn.release();
            }

        } else {
            errorarray.push({ msg: 'Please Try After Sometimes', error_msg: 'CONN' });
            return;
        }
        return resolve(errorarray);

    });
}

async function editOTTPlan(req) {
    return new Promise(async (resolve, reject) => {
        const jwt_ott = req.ott_data;
        var data = req.body, errorarray = [], isp_id, group_id;
        let conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Add OTTPlan data', data.bulkOTTdata.length);
            await conn.beginTransaction();
            try {
                let plan = data.bulkOTTdata[0];
                console.log('OTTPLAN', plan);
                let sqlcount = ' SELECT EXISTS(SELECT * FROM ott.ottplan WHERE ottplanid = ? ) `count` ';
                console.log('Plancode Count Query', sqlcount);
                let [[rcount]] = await conn.query(sqlcount, plan.id);
                if (rcount['count'] == 0) {
                    errorarray.push({ msg: " OTTPlanCode   '" + plan.ottplancode + "' Not Exists", error_msg: '303' });
                    await conn.rollback();
                } else {
                    plan.status = plan.status == true ? 1 : 0;
                    let sqlplan = ` UPDATE ott.ottplan SET ottplan_name='${plan.ottplan_name}',ottplancode='${plan.ottplancode}',
                         otttaxtype=${plan.otttaxtype},ottamount=${plan.ottamount},ottplatform='${plan.ottplatform}',dayormonth=${plan.dayormonth},
                         days=${plan.days},status=${plan.status},cby=${jwt_ott.id},ott_vendor=${plan.ott_vendor} WHERE ottplanid =${plan.id} `
                    let result = await conn.query(sqlplan);
                    if (result[0]['affectedRows'] > 0) {
                        let logdata = JSON.stringify(plan)
                        let sqllog = " INSERT INTO ott.activity_log SET fname ='UPDATE OTTPPLAN ',`idata` = '" + logdata + "',cby = " + jwt_ott.id + ",role=" + jwt_ott.role
                        let resultlog = await conn.query(sqllog);
                        if (resultlog[0]['affectedRows'] > 0 & resultlog[0]['insertId'] > 0) {
                            errorarray.push({ msg: '"' + plan.ottplancode + '"Successfully Updated', error_msg: 0 })
                            await conn.commit();
                        } else {
                            errorarray.push({ msg: 'Please try after sometimes', error_msg: '319' });
                            await conn.rollback();
                        }
                    } else {
                        errorarray.push({ msg: 'Please Try After Sometimes', error_msg: '315' });
                        await conn.rollback();
                    }
                }

            } catch (e) {
                console.log('Inside Catch Error', e);
                errorarray.push({ msg: 'Please try after sometimes', error_msg: 'CONN' });
                await conn.rollback();
            }
            console.log('Connection Closed', errorarray);
            conn.release();

        } else {
            errorarray.push({ msg: 'Please Try After Sometimes', error_msg: 'CONN' });
            return;
        }
        return resolve(errorarray);

    });
}

pack.post('/addOTTPlan', async (req, res) => {
    req.setTimeout(864000000);
    let result = await addOTTPlan(req);
    console.log('Process Completed', result);
    res.end(JSON.stringify(result));

});

pack.post('/editOTTPlan', async (req, res) => {
    req.setTimeout(864000000);
    let result = await editOTTPlan(req);
    console.log('Process Completed', result);
    res.end(JSON.stringify(result));

});

pack.post('/packMap', async (req, res) => {
    req.setTimeout(864000000);
    let result = await packMap(req);
    console.log("process completed", result);
    res.end(JSON.stringify(result));
});

pack.post('/updatepackMap', async (req, res) => {
    req.setTimeout(864000000);
    let result = await updatepackMap(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});

pack.post('/showOTTPlatforms', function (req, res, err) {
    const jwt_data = req.jwt_data
    let data = req.body, sql, sqlquery;
    sqlquery = " SELECT ott_id,ott_platform FROM ott.OTT_platforms "
    if (data.hasOwnProperty('like') && data.like != '') {
        sqlquery += ' WHERE ott_platform LIKE "%' + data.like + '%" '
    }
    console.log('ott query', sqlquery);
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

pack.post('/showOTTPlan', function (req, res) {
    const jwt_data = req.jwt_data;
    var data = req.body, sql, sqlc,
        sqlquery = ' SELECT ottplatform FROM ott.`ottplan` WHERE ottplanid =' + data.ottid + ' ';

    pool.getConnection(function (err, conn) {
        if (err) {
            console.log("Failed")
            res.end("Failed");
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                if (!err) {
                    sqlc = ' SELECT ott_platform FROM ott.`OTT_platforms` WHERE ott_id IN (' + result[0]['ottplatform'] + ')  ';
                    sql = conn.query(sqlc, function (err, result) {
                        conn.release();
                        if (!err) {
                            res.send(JSON.stringify(result));
                        } else {
                            res.send(JSON.stringify(result));
                        }
                    });

                } else {
                    console.log('error', err);
                    conn.release();
                    res.send(JSON.stringify(result));
                }
            });
        }
    });
});


pack.post('/showOTTPlanName', function (req, res, err) {   // Show OTTplan Name and code 
    const jwt_data = req.jwt_data
    let data = req.body, sql, sqlquery;
    sqlquery = ` SELECT o.ottplanid,o.ottplan_name,o.ottplancode,o.ott_vendor FROM ott.ottplan o WHERE status IN (1,0)`
    if (data.hasOwnProperty('like') && data.like != '') {  // Plan name
        sqlquery += ` AND o.ottplancode LIKE '%${data.like}%'`
    }
    if (data.hasOwnProperty('c_like') && data.c_like != '') {  // Plan Code
        sqlquery += ` AND o.ottplan_name LIKE '%${data.c_like}%'`
    }

    console.log('ShowOTTPlan name', sqlquery);
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



module.exports = pack;