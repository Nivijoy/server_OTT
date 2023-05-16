const bodyParser = require('body-parser');
const express = require('express');
login = express(),
    bodyparser = require('body-parser'),
    jwt = require('jsonwebtoken'),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise;

var privateKey = require('./config');
const tokenExpireTime = 2 * 60 * 60 * 1000;
const refreshTokenExpireTime = 24 * 60 * 60 * 1000
login.use(bodyParser.json());       // to support JSON-encoded bodies
login.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
let refreshTokens = [];

async function authenticate(data, ip) {
    console.log("Login Data", data)
    return new Promise(async (resolve, reject) => {
        var sqlquery, name, password, erroraray = [], refresh_token;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                sqlquery = ` SELECT m.mid id,m.bid busid,m.fname,m.userid,m.psw,m.role,m.menurole,m.dmid,m.sdmid,m.under_man,0 expirydate,
                0 ottexpirydate,m.status FROM ott.managers m WHERE m.userid ='${data.username}' AND m.psw=md5('${data.password}') 
                UNION
                SELECT u.id,u.busid,u.fullname fname,u.profileid userid,u.pwd psw,u.role,u.menurole,u.dmid,u.sdmid,0 under_man,u.expirydate,
                u.ottexpirydate,u.ustatus status FROM ott.ottUsers u WHERE u.profileid ='${data.username}' AND u.pwd =md5('${data.password}') `
                let usercount = " SELECT EXISTS( " + sqlquery + " )AS COUNT ";
                console.log('User Exists Query ', usercount);
                let [[userava]] = await conn.query(usercount);
                if (userava['COUNT'] == 1) {
                    let result = await conn.query(sqlquery);
                    console.log('Length ', result[0].length);
                    if (result[0].length == 1) {
                        let userDet = result[0][0];
                        console.log('Userdetails', userDet)
                        let session_id = generateRondomSting(), token, updatetoken;
                        try {
                            token = await jwt.sign({
                                id: userDet.id, profile_id: userDet.userid, role: userDet.role, menu_role: userDet.menu_role, session_id: session_id, dmid: userDet.dmid, sdmid: userDet.sdmid,
                                under_man: userDet.under_man, ott_expiry: userDet.ottexpirydate, gltv_expiry: userDet.expirydate, status: userDet.status,busid:userDet.busid
                            },
                                privateKey, { algorithm: 'HS512', expiresIn: tokenExpireTime });
                            refresh_token = await jwt.sign({ id: userDet.mid, profile_id: userDet.userid, session_id: session_id },
                                privateKey, { algorithm: 'HS512', expiresIn: refreshTokenExpireTime });

                            refreshTokens.push(refresh_token)
                            // console.log('Refresh Token List', refreshTokens)
                        } catch (e) {
                            erroraray.push({ msg: "Please Try After Sometimes", status: 0, error_msg: '36' });
                            return;
                        }
                        let user_details = {
                            id: userDet.id, profile_id: userDet.userid, fname: userDet.fname, role: userDet.role, menu_role: userDet.menu_role, busid: userDet.busid
                        }
                        // console.log(token, "token");
                        if (userDet.role == 111) updatetoken = " UPDATE ott.ottUsers set `token`='" + token + "', `refresh_token`='" + refresh_token + "' where id=" + userDet.id
                        else updatetoken = " UPDATE ott.managers set `token`='" + token + "', `refresh_token`='" + refresh_token + "' where mid=" + userDet.id
                        console.log('updatetoken', updatetoken);
                        updatetoken = await conn.query(updatetoken);
                        if (updatetoken[0]['affectedRows'] != 0) {
                            await conn.commit();
                            erroraray.push({ msg: "login successfully", status: 1, error_msg: 0, user_details: user_details, token: token, refresh_token: refresh_token });
                            console.log("login successfully ");
                        } else {
                            erroraray.push({ msg: " Please Try After 15 Min. ", status: 2, error_msg: '61' });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Please Try After 5 Min", status: 0, error_msg: '35' });
                        await conn.rollback();
                    }
                } else {
                    console.log(' COUNT is 0 :  ', userava['COUNT']);
                    erroraray.push({ msg: "User ID or Password Incorrect. ", status: 0, error_msg: '31' });
                    await conn.rollback();
                }
            } catch (e) {
                console.log('Error ', e)
                erroraray.push({ status: 0, msg: 'Internal Error please try later ', error_msg: '83' });
            }
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ status: 0, msg: 'Internal Error please try later ', error_msg: '23' });
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}


login.post('/authenticate', async (req, res) => {
    req.setTimeout(864000000);
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // console.log('result----', req.body);
    let result = await authenticate(req.body, ip);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});


const generateRondomSting = (length = 20, stringNeedToGenerate = 'ab56789cRSjklmnopqdefghiABCDEFGHIJKL0123MNOPQrstuvwxyzTUVWXYZ4') => {
    let randomString = '';
    for (var i = 0; i < length; i++) {
        let index = Math.floor(Math.random() * stringNeedToGenerate.length);
        randomString += stringNeedToGenerate[index];
    }
    return randomString;
}



module.exports = login;
