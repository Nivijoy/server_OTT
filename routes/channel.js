"use strict"
const express = require('express'),
    compress = require('compression'),
    channel = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise;

channel.use(compress());

channel.post('/listChannel', (req, res, err) => {
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, sqlc, value = [], where = [];
    sqlquery = ' SELECT c.channel_id,c.channel_name,c.live_url,c.clogo,c.channel_lcn,c.channel_type,c.channel_mode,c.cby, ' +
        ' c.status,c.cdate,c.desc,l.`language_name`,g.genre_name,c.lang_id,c.genre_id FROM ott.`channel` c LEFT JOIN ott.`channel_language` l ON c.`lang_id` = l.`lang_id` ' +
        ' LEFT JOIN ott.`channel_genre` g ON c.`genre_id` = g.`genre_id` ';
    sqlc = ' SELECT COUNT(*) `count` FROM ott.`channel` c LEFT JOIN ott.`channel_language` l ON c.`lang_id` = l.`lang_id` ' +
        ' LEFT JOIN ott.`channel_genre` g ON c.`genre_id` = g.`genre_id` ';
    if (data.hasOwnProperty('lang_id') && data.lang_id) {
        where.push(' c.lang_id =' + data.lang_id)
    }
    if (data.hasOwnProperty('genre_id') && data.genre_id) {
        where.push(' c.genre_id =' + data.genre_id)
    }
    if (data.hasOwnProperty('id') && data.id) {
        where.push(' c.channel_id =' + data.id)
    }
    where = where.length > 0 ? 'WHERE' + where.join(' AND ') : ''
    sqlquery += where; sqlc += where;
    console.log('List Channel Query', sqlquery)
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

async function addChannel(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data;
        var data = req.body, sql, sqlquery, errorarray = [], status1 = false;
        let conn = await poolPromise.getConnection();
        if (conn) {
            try {
                console.log('Add Channel Data===', data);
                await conn.beginTransaction();
                data.cby = jwtott.id;
                sql = ` SELECT EXISTS(SELECT * FROM ott.channel WHERE channel_name ='${data.channel_name}') count `;
                let [[resultc]] = await conn.query(sql);
                if (resultc['count'] != 0) {
                    errorarray.push({ msg: `${data.channel_name} ChannelName already exists`, error_msg: 18 })
                    await conn.rollback();
                } else {
                    let schannel = `  SELECT EXISTS(SELECT * FROM ott.channel WHERE channel_lcn =${data.channel_lcn} OR live_url ='${data.live_url}') count `
                    let [[sresult]] = await conn.query(schannel)
                    if (sresult.count != 0) {
                        errorarray.push({ msg: `channelLCN or Url  Shoule be Unique`, error_msg: 25 })
                        await conn.rollback();
                    } else {
                        sqlquery = ` INSERT INTO ott.channel SET ? `
                        console.log('Channel Insert Query : ', sqlquery);
                        let result = await conn.query(sqlquery, data);
                        if (result[0]['affectedRows'] > 0 && result[0]['insertId'] > 0) {
                            let logData = JSON.stringify(data)
                            let sqllog = " INSERT into ott.activity_log SET fname= 'ADD CHANNEL' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                            let resultlog = await conn.query(sqllog);
                            console.log(resultlog[0]['affectedRows']);
                            if (resultlog[0]['affectedRows'] > 0) {
                                errorarray.push({ msg: `${data.channel_name} Added Successfully`, error_msg: 0, id: result[0]['insertId'] })
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

async function updateChannel(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data;
        var data = req.body, cid = req.params.id, sql, sqlquery, errorarray = [], status1 = false;
        let conn = await poolPromise.getConnection();
        if (conn) {
            try {
                console.log('Edit Channel Data===', data);
                await conn.beginTransaction();
                sql = ` SELECT EXISTS(SELECT * FROM ott.channel WHERE channel_name ='${data.channel_name}' AND channel_id != ${cid}) count `;
                let [[resultc]] = await conn.query(sql);
                if (resultc['count'] != 0) {
                    errorarray.push({ msg: `${data.channel_name} ChannelName already exists`, error_msg: 75 })
                    await conn.rollback();
                } else {
                    let schannel = `  SELECT EXISTS(SELECT * FROM ott.channel WHERE (channel_lcn =${data.channel_lcn} OR live_url ='${data.live_url}') AND channel_id != ${cid}) count `
                    console.log('Channel Exists', schannel)
                    let [[sresult]] = await conn.query(schannel)
                    if (sresult.count != 0) {
                        errorarray.push({ msg: `channelLCN or Url  Shoule be Unique`, error_msg: 79 })
                        await conn.rollback();
                    } else {
                        sqlquery = ` UPDATE ott.channel SET channel_name= '${data.channel_name}', live_url= '${data.live_url}',channel_lcn =${data.channel_lcn},
                        channel_type= ${data.channel_type}, channel_mode= ${data.channel_mode},lang_id=${data.lang_id},genre_id=${data.genre_id},
                        mby=${jwtott.id},mdate=NOW() WHERE channel_id =${cid} `
                        console.log('Channel Update Query : ', sqlquery);
                        let result = await conn.query(sqlquery);
                        if (result[0]['affectedRows'] > 0) {
                            let logData = JSON.stringify(data)
                            let sqllog = " INSERT into ott.activity_log SET fname= 'EDIT CHANNEL' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                            let resultlog = await conn.query(sqllog);
                            console.log(resultlog[0]['affectedRows']);
                            if (resultlog[0]['affectedRows'] > 0) {
                                errorarray.push({ msg: `${data.channel_name} Updated Successfully`, error_msg: 0, id: result[0]['insertId'] })
                                await conn.commit();
                            } else {
                                errorarray.push({ msg: "Please Try After Sometime", error_msg: 93 });
                                await conn.rollback();
                            }

                        } else {
                            errorarray.push({ msg: 'Please Try After Sometime', error_msg: 88 })
                            await conn.rollback();
                        }
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

channel.post('/addChannel', async (req, res) => {
    req.setTimeout(864000000);
    let result = await addChannel(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});
channel.put('/updateChannel/:id', async (req, res) => {
    req.setTimeout(864000000);
    let result = await updateChannel(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});

channel.post('/getUserChannel', (req, res, err) => {
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, where = [];
    console.log('getUserChannel INPUT DATA :', data);
    sqlquery = ' SELECT c.`channel_id`,c.`channel_name`,c.`live_url` url,c.`channel_lcn` lcn,c.clogo FROM ott.`ottUsers` u LEFT JOIN ott.`package` p ON p.`pack_id`=u.`packid` ' +
        ' LEFT JOIN ott.`channel` c ON FIND_IN_SET(c.`channel_id`,p.`channel_id`) WHERE c.`status`=1 AND u.id=' + ott_data.id + ' ';

    if (data.hasOwnProperty('hd') && data.hd != '') { sqlquery += ' AND c.channel_mode =' + data.hd }
    if (data.hasOwnProperty('langid') && data.langid != '') { sqlquery += ' AND c.lang_id =' + data.langid }
    if (data.hasOwnProperty('genreid') && data.genreid != '') { sqlquery += ' AND c.genre_id =' + data.genreid }

    sqlquery += ' ORDER BY c.`channel_lcn` '
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                console.log("Get Channel Query :", sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});




module.exports = channel;
