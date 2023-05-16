"use strict"
var express = require('express'),
    compress = require('compression'),
    pay = express(),
    bodyParser = require("body-parser"),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise,
    schema = require('../schema/schema'),
    request = require('request');
pay.use(compress());
pay.set('view engine', 'ejs');
pay.use(bodyParser.urlencoded({ extended: false }));
const URL = require('url');
const util = require('util');

const banlkc = require('./bankcontrol');

var reqUrl = 'https://crm.gltv.co.in:2003/#/pages/account/trn-status';

async function mePay(req) {
    return new Promise(async (resolve, reject) => {
        const jwt_data = req.ott_data;
        console.log('jwt_data------:', jwt_data);
        var data = req.body, errorarray = [], status = false, pstatus = false, conn_status = false, ldata = '', resdata = '', initialstatus = false, conn = await poolPromise.getConnection();
        if (conn) {
            conn_status = true;
            console.log('meTrnPay Data===', data);
            await conn.beginTransaction();
            try {
                let rid = jwt_data.role, mrid = jwt_data.manager_id, manid = jwt_data.id, Oplanid = data.ottplanid, manrole;
                let gwdetails = '', custren = '', userid = '', commompayreq = '';
                rid = rid == 777 ? manid : rid == 775 ? mrid : rid == 666 ? manid : rid == 665 ? mrid : rid == 555 ? manid : rid == 554 ? mrid : rid == 111 ? manid : 0;
                console.log('Manager Role ID:', rid);
                if (jwt_data.role != 111 && rid != 0) {
                    gwdetails += 'SELECT m.mid,m.userid,m.fname,m.email,m.mobile,m.pgid,m.mamt,pg.* FROM ott.managers m LEFT JOIN ott.pg ON m.pgid=pg.id AND m.bid=pg.busid WHERE m.mid=' + rid;

                }
                if (jwt_data.role == 111 && rid != 0) {
                    gwdetails = ' '
                }
                if (rid == 0) {
                    resolve({ StatusDesc: ' Contact Your Admin.', error_msg: 73 });
                    await conn.rollback();
                }
                console.log('GW Query : ', gwdetails);
                gwdetails = await conn.query(gwdetails);
                console.log('gwdetails Length :', gwdetails[0].length);
                // console.log(gwdetails[0][0].gwuid);
                if (gwdetails[0].length > 0) {
                    gwdetails = gwdetails[0][0];
                    console.log(gwdetails, gwdetails.config)
                    if (gwdetails.pgid > 0) {
                        if (gwdetails.status != 0 && gwdetails.status != null && gwdetails.status != '') {
                            userid = jwt_data.role == 111 ? gwdetails.profileid : gwdetails.userid;
                            console.log('GET gwdetails-------------------------------');
                            var d = new Date();
                            var n = d.getTime();
                            // let objdata=gwdetails.config

                            let bank = eval('(' + gwdetails.config + ')'), orderID = JSON.stringify(Math.random() * 9999999999), oid = orderID.indexOf('.'), amt = 0,
                                phone = '', SUrl = '', FUrl = '', hash = '', insertId = '';
                            console.log('BanK Details', bank, '\n', typeof (bank));
                            orderID = gwdetails.txnid + orderID.substring(0, oid);
                            if (data.pay_type == 1 || data.pay_type == 2) {             //1-reseller topup 2-subscriber topup
                                if (gwdetails.gwid == 1) {
                                    if (data.amt != '' && data.amt != null && data.amt != 0) { amt = (Number(data.amt)).toFixed(2); commompayreq += ',deposit_type=3,deposit_amount=' + amt; } else { resolve({ StatusDesc: 'Enter The Amount Properly.', OrderId: '', TrnRefNo: '', ResponseCode: '', error_msg: 59 }); await conn.rollback(); }
                                }
                                pstatus = true;
                            }
                            let insertpayreq = ' INSERT INTO ott.deposit SET busid=' + jwt_data.busid + ',role=' + jwt_data.role + ',manid=' + rid + ',gwid=' + gwdetails.pgid + ',gwstatus=1,txnid="' + orderID + '"' + commompayreq + ',reason="' + data.trnRemarks + '",cby=' + jwt_data.id + ',crole=' + jwt_data.role
                            console.log('PAYMENT ORDER INSERT QUERY : ', insertpayreq);
                            insertpayreq = await conn.query(insertpayreq);
                            if (insertpayreq[0].affectedRows > 0) {
                                await conn.commit();
                                if (gwdetails.gwid == 1 && pstatus) {               // Easy EMI 
                                    let gethtml = ({ payurl: bank.payurl, gwid: gwdetails.pgid, mid: bank.mid, orderID: orderID, amt: amt,name:gwdetails.fname,email: gwdetails.email, mobile: gwdetails.mobile, SUrl: bank.SUrl, FUrl: bank.FUrl });
                                    console.log('bankinput :', gethtml);
                                    gethtml = await banlkc.bankhtml(gethtml);
                                    if (gethtml.error_status == 0) {
                                        resolve({ msg: gethtml.ldata, error_msg: 0 });
                                    } else {
                                        resolve({ msg: "Contact Your Admin", error_msg: 76 });
                                        await conn.rollback();
                                    }
                                }
                            } else {
                                resolve({ msg: "Please Try later.", error_msg: 81 });
                                await conn.rollback();
                            }
                        } else {
                            resolve({ msg: "GLTV Payment Gateway Not Enabled", error_msg: 120 });
                            await conn.rollback();
                        }
                    } else {
                        resolve({ StatusDesc: 'Payment Gateway Not Enabled.', error_msg: 73 });
                        await conn.rollback();
                    }
                } else {
                    console.log('Online payment is Not Available for Your Account.');
                    resdata = ({ msg: "Online payment is Not Available for Your Account.", error_msg: 129 });
                    console.log('Roll Back gwdetails-------------------------------');
                    await conn.rollback();
                }
            } catch (e) {
                console.log(e);
            }
            if (!conn_status) {
                console.log('Error....');
                console.log('meTrnPay connection Closed....');
                conn.release();
            }
        } else {
            resdata = ({ status: 0, msg: 'Internal Error please try later ', error_msg: 142 });
            return resolve(resdata);
        }
    });
}

async function meTStatus(req, res) {  // Updation of Success or Failure Transactions of Reseller
    return new Promise(async (resolve, reject) => {
        let conn = await poolPromise.getConnection(), errorarray = [], sqlUpdate;
        if (conn) {
            await conn.beginTransaction();
            try {
                const data = await parseUrl(req.url);
                if (data) {
                    console.log('Status Data', data);
                    const [mid, orderId, paystarId, status] = data.split('|');
                    let gwstatus = status === 'Credit' ? 2 : 3;
                    let sqldata = ` SELECT d.id,d.manid,d.txnid,d.busid,m.mid,m.mamt,d.role,d.deposit_type,d.deposit_amount,d.cby FROM ott.deposit d INNER JOIN ott.managers m ON d.manid = m.mid  WHERE txnid ='${orderId}' `
                    let [[rdata]] = await conn.query(sqldata);
                    if (rdata) {
                        console.log('Data--', rdata);
                        sqlUpdate = ` UPDATE ott.deposit d,ott.managers m SET d.gwstatus =${gwstatus},d.mdate=NOW(),before_amount=m.mamt,d.banktxnid='${paystarId}' `
                        if (gwstatus == 2) {   // Success
                            sqlUpdate += ` ,m.mamt=(m.mamt + d.deposit_amount) WHERE d.manid=m.mid AND d.id=${rdata.id} `
                        } else {
                            sqlUpdate += ` WHERE d.manid=m.mid AND d.id=${rdata.id}`
                        }
                        console.log('Success meTStatus Update Query----', sqlUpdate);
                        sqlUpdate = await conn.query(sqlUpdate);
                        if (sqlUpdate[0]['affectedRows'] > 0) {
                            console.log('Status updated--- 215');
                            let dstatus = gwstatus == 2 ? 0 : 1;
                            let deplog = ` INSERT INTO ott.deposit_log (dep_id,user_id,busid,deposit_type,manager_before_balance,deposit_amount,role,created_by,reason,status) 
                                        VALUES(${rdata.id},${rdata.manid},${rdata.busid},${rdata.deposit_type},${rdata.mamt},${rdata.deposit_amount},${rdata.role},${rdata.cby},'Online Payment',${dstatus})`
                            deplog = await conn.query(deplog)
                            if (deplog[0]['insertId'] > 0) {
                                let reslog = ` INSERT INTO ott.pg_res_log (did,resmsg) VALUES(${rdata.id},'${data}') `
                                reslog = await conn.query(reslog);
                                if (reslog[0]['insertId'] > 0) {
                                    await conn.commit();
                                    console.log('meTStatus log updated-----');
                                    let msg = gwstatus == 2 ? 'Transaction Successfully Completed' : 'Transaction Failed'
                                    res.redirect(`${reqUrl}?status=${status}&msg=${msg}&txnid=${orderId}&order_id=${paystarId}`);
                                } else res.redirect(`${reqUrl}?status=${status}&msg='Please Contact admin'&txnid=${orderId}&order_id=${paystarId}`);
                            } else res.redirect(`${reqUrl}?status=${status}&msg='Please Contact admin'&txnid=${orderId}&order_id=${paystarId}`);
                        } else res.redirect(`${reqUrl}?status=${status}&msg='Please Contact admin'&txnid=${orderId}&order_id=${paystarId}`);
                    } else res.redirect(`${reqUrl}?status=${status}&msg='Please Contact admin'&txnid=${orderId}&order_id=${paystarId}`);
                } else {
                    console.log('Check And Update The Status : 149');
                    res.redirect(`${reqUrl}?status=0&msgs=Transaction Failed&txnid=411`);
                }
            } catch (e) {
                console.log('Catch block error', e);
                res.redirect(`${reqUrl}?status=0&msgs=Transaction Failed&txnid=159`);
            }
            conn.release();
            console.log('meTstaus Connection Released-------');
        } else {
            console.log('meTStaus Connection Error...');
            errorarray.push({ msg: 'Internal Error please try later ', error_msg: 'CONN' });
        }
        return resolve(errorarray)
    })
}

const parseUrl = async (url) => {
    return new Promise((resolve, reject) => {
        var url_parts = URL.parse(url, true), query = url_parts.query;
        const data = Buffer.from(query.msg, 'base64').toString('utf-8');
        if (data) return resolve(data)
        else return resolve('Error:No Data exists')
    })

}

const checkStatus = async (statusURL, orderId) => {
    return new Promise(async (resolve, reject) => {
        if (orderId) {
            const rp = util.promisify(request);
            const response = await rp({ 'method': 'GET', 'url': statusURL, 'qs': { 'msg': orderId } });
            console.log('PayStar Response :', response.body);
            if (response.body) resolve(response.body);
        } else reject({ error: 'No orderID' })
    })
}

async function meCheckStatus(req) {   // Checking Transaction Status For Reseller
    return new Promise(async (resolve, reject) => {
        const jwt_ott = req.ott_data;
        var data = req.body, erroraray = [], sqlUpdate;
        let conn = await poolPromise.getConnection();
        if (conn) {
            try {
                console.log('Check Status Data--', data);
                let trnData = ` SELECT d.id,d.txnid,d.gwstatus,d.manid,gw.config,m.mid,m.mamt FROM ott.deposit d,ott.pg gw,ott.managers m WHERE d.gwid=gw.gwid AND d.manid =m.mid AND d.id =${data.id}`;
                console.log('Get Deposit Data --', trnData);
                let [[depData]] = await conn.query(trnData);
                console.log('Deposit data', depData);
                if (depData) {
                    if (depData.gwstatus != 2) {  // Excluded Success Status to Process
                        let bank = eval('(' + depData.config + ')');
                        let result = await checkStatus(bank.statusurl, depData.txnid)
                        result = JSON.parse(result);
                        if (result['AuthStatus'] == 200) {
                            console.log('------------Transaction Success-----------');
                            sqlUpdate = ` UPDATE ott.deposit d,ott.managers m SET gwstatus =2,d.mdate=NOW(),paymode='${result['msg']['Paymentmode']}',before_amount=m.mamt,
                            m.mamt=(m.mamt+d.deposit_amount) WHERE d.manid=m.mid AND d.txnid='${result['msg']['OrderId']}' `
                            console.log('Update Success Query----', sqlUpdate);
                            sqlUpdate = await conn.query(sqlUpdate);
                            if (sqlUpdate[0]['affectedRows'] > 0) {
                                let reslog = ` INSERT INTO ott.pg_res_log (did,resmsg) VALUES(${depData.id},'${JSON.stringify(result)}') 
                            ON DUPLICATE KEY UPDATE did=${depData.id},resmsg='${JSON.stringify(result)}' `
                                reslog = await conn.query(reslog);
                                if (reslog[0]['affectedRows'] > 0) {
                                    await conn.commit();
                                    console.log('Success log updated-----');
                                    erroraray.push({ msg: 'Transaction Success', status: result['AuthStatus'], txnid: result['msg']['OrderId'], amount: result['msg']['Amount'], error_msg: 0 });
                                } else erroraray.push({ msg: 'Please Try after sometimes', error_msg: 233 });
                            } else erroraray.push({ msg: 'Please Try after sometimes', error_msg: 234 });

                        } else {
                            console.log('-------------Transaction Failed----------');
                            if (result['AuthStatus'] == 'NA') {
                                sqlUpdate = ` UPDATE ott.deposit SET gwstatus = 3,mdate=NOW() WHERE id =${data.id} `
                            } else {
                                sqlUpdate = ` UPDATE ott.deposit d,ott.managers m SET gwstatus =3,d.mdate=NOW(),paymode='${result['msg']['Paymentmode']}',before_amount=m.mamt
                                WHERE d.manid=m.mid AND d.txnid='${result['msg']['OrderId']}' `
                            }
                            console.log('Update Failure Query----', sqlUpdate);
                            sqlUpdate = await conn.query(sqlUpdate);
                            if (sqlUpdate[0]['affectedRows'] > 0) {
                                console.log('inside');
                                let reslog = ` INSERT INTO ott.pg_res_log (did,resmsg) VALUES(${depData.id},'${JSON.stringify(result)}') 
                            ON DUPLICATE KEY UPDATE did=${depData.id},resmsg='${JSON.stringify(result)}' `
                                reslog = await conn.query(reslog);
                                if (reslog[0]['affectedRows'] > 0) {
                                    await conn.commit();
                                    console.log('Failure log updated-----');
                                    if (result['AuthStatus'] == 'NA') {
                                        erroraray.push({ msg: 'Transaction Failed', error_msg: 256 })
                                    } else {
                                        erroraray.push({ msg: 'Transaction Failed', status: result['AuthStatus'], txnid: result['msg']['OrderId'], amount: result['msg']['Amount'], error_msg: 0 });
                                    }
                                } else erroraray.push({ msg: 'Please Try after sometimes', error_msg: 248 });
                            } else erroraray.push({ msg: 'Please Try after sometimes', error_msg: 249 });

                        }
                    } else {
                        erroraray.push({ msg: 'Payment Status has already been updated ', error_msg: 253 })
                    }

                } else {
                    erroraray.push({ msg: 'No Transaction Found', error_msg: 225 })
                }

            } catch (e) {
                erroraray.push({ msg: 'Please try after sometimes', error_msg: 'CONN' });
                await conn.rollback();
            }
            conn.release();
            console.log('Connection Released-----');
        } else {
            console.log('Connection Error');
            erroraray.push({ msg: 'Internal Error please try after', error_msg: 186 })
        }
        return resolve(erroraray)
    })
}

pay.post('/myPaymentAPI', async (req, res) => {
    req.setTimeout(864000000);
    const result = await mePay(req);
    console.log('mePay Final Data : \n', result);
    res.end(JSON.stringify(result));
});

pay.post('/meCheckStatus', async (req, res) => {
    req.setTimeout(864000000);
    const result = await meCheckStatus(req);
    console.log('Pay Status Check result----', result);
    res.json(result);
})
function randomFromTo(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
}
async function delay(ms) { return await new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = { pay, meTStatus };