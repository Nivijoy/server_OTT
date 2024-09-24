"use strict"
const express = require('express'),
    compress = require('compression'),
    dashboard = express.Router(),
    cron = express.Router(),
    CronJob = require('cron').CronJob,
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise,
    request = require('request'),
    util = require('util');

const rp = util.promisify(request);
const config = require('../utility/config');


const sendsms = async (mobile, msg, id) => {
    console.log({ mobile, msg, id });
    return new Promise((resolve, reject) => {
        (async () => {
            let url = `https://sms.zestwings.com/smpp.sms?username=limrast&password=425495&to=91${mobile}&from=LIMERO&text=${msg}&templateid=${id}`
            console.log('SMS URL :', url);
            const response = await rp({ 'method': 'GET', 'url': url, 'headers': {} });
            console.log('response', response.body);
            return resolve(response.body)
        })();
    });
}

const sendCouponCode = async () => {
    console.log('Send Coupon  Code-----------------------');
    const conn = await poolPromise.getConnection();

    try {
        const { tempno, template } = config.sms_template;
        console.log('temp----',tempno,template);
        let getSendSmsQry = ` SELECT * from ott.coupon_code WHERE ccstatus  = 1 AND sendsms=0`
        const getSendsmsResp = await conn.query(getSendSmsQry);
        const [codeDet] = getSendsmsResp
        console.log('GetSendSmsResp------', codeDet);
        if (codeDet.length != 0) {
            for (let coupon of codeDet) {
                let msg = template.replace(/{CODE}/g, coupon.couponcode).replace(/{PLATFORM}/g, coupon.ottplatform == 1 ? 'Disney+Hotstar' : 'Amazon_Prime').replace(/{UNIT}/g, coupon.vunit)
                console.log('SmsRespose-----------', msg);
                const smsResp = await sendsms(coupon.umobile, msg, tempno);
                console.log('SmsRespose-----------', smsResp);
                if (smsResp) {
                    let updateQry = ` UPDATE ott.coupon_code SET sendsms=1, smsres = '${JSON.stringify(smsResp)}' WHERE ccid=${coupon.ccid} `
                    let updateResp = await conn.query(updateQry)
                    if (updateResp[0].affectedRows > 0) {
                        await conn.commit();
                    } else {
                        console.log('Cant Insert SMS Log Error.');
                        await conn.rollback();
                        continue;
                    }
                }
            }
        }
    } catch (e) {
        console.log('SMS CROn Catch Internal Error ', e)
        await conn.rollback();
    }
    conn.release();
}


let FIVE_MIN_SEND_SMS_COUPONCODE = new CronJob('00 */05 * * * *', function () {			// Every 5 Min
    sendCouponCode();
});
FIVE_MIN_SEND_SMS_COUPONCODE.start()


module.exports = cron;