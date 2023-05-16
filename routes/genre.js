"use strict"
const express = require('express'),
    compress = require('compression'),
    genre = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise,
    schema = require('../schema/schema');
const url = require('url');


genre.use(compress());


genre.post('/listGenre', (req, res, err) => {
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, sqlc, value = [];
    sqlquery = ' SELECT g.genre_id,g.genre_name,g.status,l.language_name,g.lang_id FROM ott.channel_genre g, ott.channel_language l WHERE g.lang_id =l.lang_id ';
    sqlc = ' SELECT COUNT(*) `count` FROM ott.channel_genre g, ott.channel_language l WHERE g.lang_id =l.lang_id ';
    if (data.hasOwnProperty('lang_id') && data.lang_id) {
        sqlquery += ' AND g.lang_id =' + data.lang_id; sqlc += ' AND g.lang_id =' + data.lang_id
    }
    console.log('List Genre Query', sqlquery)
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

genre.post('/getGenre', (req, res, err) => {                // use for get and list
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, where = [];
    sqlquery = ' SELECT g.genre_id,g.genre_name,g.status,g.lang_id FROM ott.`channel_genre` g ';
    if (data.hasOwnProperty('langid') && data.langid) {
        where.push(' g.lang_id =' + data.langid);
    }
    if (where.length > 0) {
        sqlquery += " where " + where.join(' AND ')
    }
    pool.getConnection((err, conn) => {
        if (err) {
            res.send('Please Try After Sometimes')
        } else {
            sql = conn.query(sqlquery, function (err, result) {
                console.log("Get Genre Query :", sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    res.end(JSON.stringify(result));
                }
            });
        }
    });
});

async function addGenre(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data
        var data = req.body, sql, sqlquery, errorarray = [], conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Data ===', data);
            // for (var i = 0; (i < data.bulkgenre.length); i++) {
            await conn.beginTransaction();
            try {
                data.cby = jwtott.id;
                let genre = data;
                sql = " SELECT EXISTS(SELECT * FROM ott.`channel_genre` WHERE genre_name='" + genre.genre_name + "' AND lang_id=" + genre.lang_id + ")AS `count` ";
                let resultc = await conn.query(sql);
                if (resultc[0][0]['count'] != 0) {
                    errorarray.push({ msg: " ' " + genre.genre_name + " 'Name already Exists. ", error_msg: 60 });
                    console.log("Genre Name already Exists For Selected Language. ");
                    await conn.rollback();
                } else {
                    sqlquery = " INSERT INTO ott.`channel_genre` SET ? "
                    let result = await conn.query(sqlquery, genre);
                    if (result[0]['affectedRows'] > 0) {
                        let logData = JSON.stringify(data)
                        let sqllog = " INSERT into ott.activity_log SET fname= 'ADD GENRE' ,`idata`= '" + logData + "',cby= " + jwtott.id + ",role=" + jwtott.role;
                        console.log('Genre Add Log Query : ', sqllog);
                        let resultlog = await conn.query(sqllog);
                        console.log(resultlog[0]['affectedRows']);
                        if (resultlog[0]['affectedRows'] > 0) {
                            errorarray.push({ msg: "Genre Name Added Successfully", error_msg: 0 });
                            console.log("Genre LOG Successfully created");
                            await conn.commit();
                        } else {
                            console.log("Failed to ADD Genre Log.");
                            errorarray.push({ msg: "Failed To Update Genre Name.", error_msg: 154 });
                            await conn.rollback();
                        }
                    } else {
                        errorarray.push({ msg: "Failed to ADD Genre Name.", error_msg: 85 });
                        console.log("Failed to Add Genre Name.");
                        await conn.rollback();
                    }
                }
            } catch (e) {
                console.log('Error ', e);
                errorarray.push({ msg: "Failed to Add Genre Name ", error_msg: 93 });
                await conn.rollback();
            }
            // }
            conn.release();
            console.log("ADD Genre connection Closed----------");
        } else {
            return resolve([{ msg: "Failed to ADD Genre Name ", error_msg: 100 }]);
        }
        return resolve(errorarray);
    });
}
async function updateGenre(req) {
    return new Promise(async (resolve, reject) => {
        const jwtott = req.ott_data
        var data = req.body, gid = req.params.id,status, sql, sqlquery, errorarray = [], conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Data ===', data);
            await conn.beginTransaction();
            try {
                sql = "  SELECT EXISTS(SELECT * FROM ott.`channel_genre` WHERE genre_name='" + data.genre_name + "' AND lang_id=" + data.lang_id + " AND genre_id != " + gid + ") count ";
                let resultc = await conn.query(sql);
                if (resultc[0][0]['count'] != 0) {
                    errorarray.push({ msg: " ' " + data.genre_name + " 'Name already Exists. ", error_msg: 130 });
                    console.log("Genre Name already Exists.");
                    await conn.rollback();
                } else {
                    status = data.status == true ? 1 :0;
                    sqlquery = "UPDATE ott.`channel_genre` SET mdate=now(),mby= " + jwtott.id;

                    if (data.genre_name != '' && data.genre_name != null) { sqlquery += ",genre_name='" + data.genre_name + "'" }
                    if (data.status != '' && data.status != null) { sqlquery += ",`status`=" + status }
                    if (data.lang_id != '' && data.lang_id != null) { sqlquery += ",`lang_id`=" + data.lang_id }
                    sqlquery += " WHERE genre_id=" + gid;

                    let result = await conn.query(sqlquery);
                    if (result[0]['affectedRows'] > 0) {
                        console.log("Genre Name Updated Successfully.");
                        console.log(result[0]['affectedRows']);
                        let gdata = JSON.stringify(data)
                        let sqllog = " INSERT into ott.activity_log SET fname= 'EDIT GENRE' ,`idata`= '"+ gdata +"',cby= " + jwtott.id + ",role=" + jwtott.role;
                        console.log('Genre Add Log Query : ', sqllog);
                        let resultlog = await conn.query(sqllog);
                        console.log(resultlog[0]['affectedRows']);
                        if (resultlog[0]['affectedRows'] > 0) {
                            errorarray.push({ msg: "Genre Name Updated Successfully.", error_msg: 0 });
                            console.log("Genre LOG Successfully Created.");
                            await conn.commit();
                        } else {
                            console.log("Failed to ADD Genre Log.");
                            errorarray.push({ msg: "Failed To Update Genre Name.", error_msg: 154 });
                            await conn.rollback();
                        }
                    } else {
                        errorarray.push({ msg: "Failed to ADD Genre Name. ", error_msg: 158 });
                        console.log("Failed to Update Genre Name ");
                        await conn.rollback();
                    }
                }
            } catch (e) {
                console.log('Error ', e);
                errorarray.push({ msg: "Failed to Update Genre Name. ", error_msg: 165 });
                await conn.rollback();
            }
            conn.release();
            console.log("Update Genre connection Closed----------");
        } else {
            return resolve([{ msg: "Failed to Update Genre Name ", error_msg: 172 }]);
        }
        return resolve(errorarray);
    });
}
genre.put('/updateGenre/:id', async (req, res) => {
    let data = req.body;
    // const validation = schema.genreReqSchema.validate(data.bulklang);
    // if (validation.error) {
    //     console.log(validation.error);
    //     return res.status(422).json({ errors: validation.error.details });
    // }
    let result = await updateGenre(req);
    console.log("process completed", result);
    res.end(JSON.stringify(result));
});
genre.post('/addGenre', async (req, res) => {
    let data = req.body;
    // const validation = schema.genreReqSchema.validate(data.bulklang);
    // if (validation.error) {
    //     console.log(validation.error);
    //     return res.status(422).json({ errors: validation.error.details });
    // }
    let result = await addGenre(req);
    console.log("Genre process completed", result);
    res.end(JSON.stringify(result));
});


module.exports = genre;
