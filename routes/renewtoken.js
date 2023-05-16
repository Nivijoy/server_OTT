var express = require('express');
const rtoken = express(),
    bodyParser = require('body-parser'),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise;

rtoken.use(bodyParser.json());       // to support JSON-encoded bodies
rtoken.use(bodyParser.urlencoded({ extended: true }));  // to support URL-encoded bodies
var jwt = require('jsonwebtoken');
var privateKey = require('./config');
const tokenExpireTime = 2 * 60 * 60 * 1000


async function renewToken(req) {
    return new Promise(async (resolve, reject) => {
        var sqlquery, erroraray = [], data;
        let conn = await poolPromise.getConnection();
        if (conn) {
            await conn.beginTransaction();
            try {
                if (req.headers.authorization) {
                    const refresh_token = req.headers.authorization;
                    console.log(refresh_token)
                    let decoded = await jwt.verify(refresh_token, privateKey, {
                        algorithm: ['HS512']
                    });
                    sqlquery = ` SELECT m.mid id,m.bid,m.fname,m.userid,m.psw,m.role,m.menurole,m.dmid,m.sdmid,m.under_man,0 expirydate,
                    0 ottexpirydate,m.status FROM ott.managers m WHERE m.userid ='${decoded.profile_id}' 
                    UNION
                    SELECT u.id,u.busid bid,u.fullname fname,u.profileid userid,u.pwd psw,u.role,u.menurole,u.dmid,u.sdmid,0 under_man,u.expirydate,
                    u.ottexpirydate,u.ustatus status FROM ott.ottUsers u WHERE u.profileid ='${decoded.profile_id}' `
                    console.log(sqlquery)
                    let result = await conn.query(sqlquery)
                    if (result[0].length == 1) {
                        if (result[0][0].status == 1) {
                            let userDetail = result[0][0];
                            let user_details = {
                                id: userDetail.id, profile_id: userDetail.userid, fname: userDetail.fname, role: userDetail.role, menu_role: userDetail.menu_role, bid: userDetail.bid
                            }
                            let session_id = decoded.session_id, token, updatetoken;

                            try {
                                 token = await jwt.sign({
                                    id: userDetail.id, profile_id: userDetail.userid, role: userDetail.role, menu_role: userDetail.menu_role, session_id: session_id, dmid: userDetail.dmid, sdmid: userDetail.sdmid,
                                    under_man: userDetail.under_man
                                }, privateKey, { algorithm: 'HS512', expiresIn: tokenExpireTime });
 
                            } catch (e) {
                                 erroraray.push({ msg: "pls try after sometime", status: 0 });
                                return;
                            }
                             let sqllog = " INSERT into ott.activity_log SET fname= 'NEW ACCESS TOKEN' ,`idata`= 'REQUESTED BY',cby= " + userDetail.id + ",role=" + userDetail.role 
                                console.log('ADD LOGS :', sqllog);
                            let resultlog = await conn.query(sqllog);
                            if (resultlog[0]['affectedRows'] != 0) {
                                if (userDetail.role == 111) updatetoken = " update ott.ottUsers set `token`='" + token + "' where id=" + userDetail.id
                                else updatetoken = " update ott.managers set `token`='" + token + "' where mid=" + userDetail.id
                                console.log('updatetoken', updatetoken);
                                updatetoken = await conn.query(updatetoken);
                                if (updatetoken[0]['affectedRows'] != 0) {
                                    await conn.commit();
                                    erroraray.push({ msg: " Your Session Has Been Restored", status: 1, token: token }, user_details);
                                    console.log("Session Restored successfully ");
                                } else {
                                    erroraray.push({ msg: " Please Try After 15 Min. ", status: 2 });
                                    await conn.rollback();
                                }

                            }

                        } else {
                            erroraray.push({ msg: "Your Account Has Been Disabled", status: 2 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: "Please Try After 5 Min", status: 0 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: "Please Try After 5 Min", status: 0 });
                    await conn.rollback();
                }

            } catch (e) {
                console.log('Error Inside RenewTOken ', e)
                erroraray.push({ msg: "Please Login Once Again", status: 401, restore: false });
                await conn.rollback();
            }
            console.log('connection Closed.');
            conn.release();
        } else {
            erroraray.push({ status: 0, msg: 'Internal Error please try later ', status: 'CE' });
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}



rtoken.get('/renewAccessToken', async (req, res) => {
    req.setTimeout(864000000);
    let result = await renewToken(req);
    console.log("Process Completed", result);
    res.end(JSON.stringify(result));
});


module.exports = rtoken;