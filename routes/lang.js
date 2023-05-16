"use strict"
const { TokenExpiredError } = require('jsonwebtoken'),
    express = require('express'),
    compress = require('compression'),
    lang = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise,
    schema = require('../schema/schema');

lang.use(compress());










lang.post('/listLanguage', (req, res, err) => {
    var data = req.body, sql, sqlquery, where = [];
    sqlquery = ' SELECT cl.lang_id,cl.language_name,cl.status FROM ott.`channel_language` cl ';
    if (data.hasOwnProperty('like') && data.like != '') {
        sqlquery += ' where cl.language_name LIKE "%' + data.like + '%"'
    }
    if (data.langid != '') {
        sqlquery += ' where cl.lang_id lang_id=' + data.langid
    }
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                // console.log("Get Channel Query :", sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});
lang.post('/getLanguage', (req, res, err) => {
    var data = req.body, sql, sqlquery, where = [];
    sqlquery = ' SELECT cl.lang_id,cl.language_name,cl.status FROM ott.`channel_language` cl ';
    if (data.langid != '') {
        where.push(`cl.lang_id = ${data.langid}`)
    }
    if (data.hasOwnProperty('like') && data.like != '') where.push(' cl.language_name LIKE "% ' + data.like + ' %"')

    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes');
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});
async function addlang(req) {
    return new Promise(async (resolve, reject) => {
        // const jwtott = req.jwt_data
        var data = req.body, sql, sqlquery, errorarray = [], conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Data ===', data);
            for (var i = 0; (i < data.bulklang.length); i++) {
                await conn.beginTransaction();
                try {
                    let lang = data.bulklang[i];
                    sql = "SELECT EXISTS(SELECT EXISTS(SELECT * FROM ott.`channel_language` WHERE language_name='" + lang.lname + "')AS COUNT)AS count";
                    let resultc = await conn.query(sql);
                    if (resultc[0][0]['count'] != 0) {
                        errorarray.push({ msg: " ' " + lang.lname + " 'Name already Exists. ", error_msg: 74 });
                        console.log("Lang Name already Exists. ");
                        await conn.rollback();
                        continue;
                    } else {
                        sqlquery = "INSERT INTO ott.`channel_language` SET language_name='" + lang.lname + "',cby= " + jwt.mid;
                        let result = await conn.query(sqlquery);
                        if (result[0]['affectedRows'] > 0) {
                            console.log("Lang Name inserted Successfully");
                            console.log(result[0]['affectedRows']);
                            let sqllog = " INSERT into bms.activity_log SET fname= 'ADD LANG' ,`idata`= '" + data + "',cby= " + jwt.mid + ",role=" + jwt.role;
                            console.log('Lang Add Log Query : ', sqllog);
                            let resultlog = await conn.query(sqllog);
                            console.log(resultlog[0]['affectedRows']);
                            if (resultlog[0]['affectedRows'] > 0) {
                                errorarray.push({ msg: "Lang Name added Successfully", error_msg: 0 });
                                console.log("LOG Successfully created");
                                await conn.commit();
                            } else {
                                console.log("Failed to ADD Log.");
                                errorarray.push({ msg: "Failed To Add Lang.", error_msg: 94 });
                                await conn.rollback();
                                continue;
                            }
                        } else {
                            errorarray.push({ msg: "Failed to ADD Lang Name ", error_msg: 99 });
                            console.log("Failed to insert Lang Name ");
                            await conn.rollback();
                            continue;
                        }
                    }
                } catch (e) {
                    console.log('Error ', e);
                    errorarray.push({ msg: "Failed to ADD Lang Name ", error_msg: 107 });
                    await conn.rollback();
                }
            }
            conn.release();
            console.log("ADD LANG connection Closed----------");
        } else {
            return resolve([{ msg: "Failed to ADD Lang Name ", error_msg: 114 }]);
        }
        return resolve(errorarray);
    });
}
async function updatelang(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.jwt_data
        var data = req.body, sql, sqlquery, errorarray = [], conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Data ===', data);
            await conn.beginTransaction();
            try {
                sql = "SELECT EXISTS(SELECT EXISTS(SELECT * FROM ott.`channel_language` WHERE language_name='" + data.lname + "')AS COUNT)AS count";
                let resultc = await conn.query(sql);
                if (resultc[0][0]['count'] != 0) {
                    errorarray.push({ msg: " ' " + data.lname + " 'Name already Exists. ", error_msg: 130 });
                    console.log("Lang Name already Exists. ");
                    await conn.rollback();
                } else {
                    sqlquery = "UPDATE INTO ott.`channel_language` SET mdate=now(),mby= " + jwtott.mid;

                    if (data.lname != '' && data.lname != null) { sqlquery += ",language_name='" + data.lname + "'" }
                    if (data.status != '' && data.status != null) { sqlquery += ",`status`=" + data.status }
                    sqlquery += " WHERE lang_id=" + data.lid;

                    let result = await conn.query(sqlquery);
                    if (result[0]['affectedRows'] > 0) {
                        console.log("Lang Name inserted Successfully");
                        console.log(result[0]['affectedRows']);
                        let sqllog = " INSERT into bms.activity_log SET fname= 'ADD LANG' ,`idata`= '" + data + "',cby= " + jwtott.mid + ",role=" + jwtott.role;
                        console.log('Lang Add Log Query : ', sqllog);
                        let resultlog = await conn.query(sqllog);
                        console.log(resultlog[0]['affectedRows']);
                        if (resultlog[0]['affectedRows'] > 0) {
                            errorarray.push({ msg: "Lang Name Updated Successfully.", error_msg: 0 });
                            console.log("LOG Successfully created");
                            await conn.commit();
                        } else {
                            console.log("Failed to ADD Log.");
                            errorarray.push({ msg: "Failed To Add Lang.", error_msg: 154 });
                            await conn.rollback();
                        }
                    } else {
                        errorarray.push({ msg: "Failed to ADD Lang Name ", error_msg: 158 });
                        console.log("Failed to insert Lang Name ");
                        await conn.rollback();
                    }
                }
            } catch (e) {
                console.log('Error ', e);
                errorarray.push({ msg: "Failed to ADD Lang Name ", error_msg: 165 });
                await conn.rollback();
            }
            conn.release();
            console.log("ADD LANG connection Closed----------");
        } else {
            return resolve([{ msg: "Failed to ADD Lang Name ", error_msg: 172 }]);
        }
        return resolve(errorarray);
    });
}
lang.post('/updatelang', async (req, res) => {
    let data = req.body;
    const validation = schema.langReqSchema.validate(data.bulklang);
    if (validation.error) {
        console.log(validation.error);
        return res.status(422).json({ errors: validation.error.details });
    }
    let result = await updatelang(req);
    console.log("process completed", result);
    res.end(JSON.stringify(result));
});
lang.post('/addlang', async (req, res) => {
    let data = req.body;
    const validation = schema.langReqSchema.validate(data.bulklang);
    if (validation.error) {
        console.log(validation.error);
        return res.status(422).json({ errors: validation.error.details });
    }
    let result = await addlang(req);
    console.log("process completed", result);
    res.end(JSON.stringify(result));
});




module.exports = lang;
