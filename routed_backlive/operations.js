"use strict";
var express = require('express'),
    oper = express(),
    compress = require('compression'),
    poolPromise = require('../connection/connection').poolPromise,
    pool = require('../connection/connection');
const { fs } = require('fs');
let conf = require('../utility/config'),
    request = require('request'),
    util = require('util')
const rp = util.promisify(request);
oper.use(compress());

async function pbcheckavapack() {
    const getpartnerpack = await rp({ 'method': 'GET', 'url': conf.playbox.getplan + conf.playbox.pkey + '/packs', 'headers': { 'Content-Type': 'application/json', 'x-api-key': conf.playbox.AuthKey } });
    return getpartnerpack;
}
async function PlayBoxottSubscription(d) {
    const getPlayBoxSubscription = await rp({ 'method': 'POST', 'url': conf.playbox.planactivation, 'json': { "phone": d.mobile, "partnerKey": conf.playbox.pkey, "packCode": d.ottplancode }, 'headers': { 'Content-Type': 'application/json', 'x-api-key': conf.playbox.AuthKey } });
    console.log('playbox subscription response',getPlayBoxSubscription.body);
    const presult = getPlayBoxSubscription.body;
    console.log('presult--------------------------',presult);
    return presult;
}
async function CheckSubscription(d) {
    const getpartnerpack = await rp({ 'method': 'GET', 'url': conf.playbox.getsubscription + conf.playbox.pkey + '&phone=' + d.mobile, 'headers': { 'Content-Type': 'application/json', 'x-api-key': conf.playbox.AuthKey } });
    let presult = JSON.parse(getpartnerpack.body);
    console.log(presult);
    return presult;
}

const ottSubscription = async (d) => {
    console.log('ottSubscription :', d);
    if (d) {
        return new Promise((resolve, reject) => {
            (async () => {
                let refid = '', oid = ('0000000000' + d.iolid).slice(-10), email = d.emailverify == 1 ? d.email : '', date = Math.floor(new Date().getTime()), DIM = (19800) * 1000, planmrp = d.planmrp >= 0 ? d.planmrp : '';             // 5:30 H:M 
                refid = 'BLSSOTT' + oid;
                var myDate = new Date((Math.floor(new Date(date + DIM).getTime())));
                date = (('0' + myDate.getDate()).slice(-2) + '-' + ('0' + (myDate.getMonth() + 1)).slice(-2) + '-' + myDate.getFullYear());
                console.log('date:', date);
                let bodydate = JSON.stringify({
                    "VendorCode": conf.ottapi.vendorCode,
                    "CustMobileNo": "91" + d.mobile,
                    "Plan": d.ottplancode,
                    "Email": email,
                    "RefNo": refid,
                    "planMrp": d.planmrp,
                    "ISPPlanName": d.ottpackname,
                    "StartDate": date,
                    "IsAddon": "N",
                    "OperatorCode": "",
                    "UserName": d.profileid
                });
                console.log('bodydate:', bodydate);
                const rp = util.promisify(request);

                const response = await rp({ 'method': 'POST', 'url': conf.ottapi.getsubscription, 'headers': { 'Authorization': conf.ottapi.AuthKey, 'Content-Type': 'application/json' }, body: bodydate });
                if (response.body) {
                    console.log('OTT Response Body', response.body);
                    resolve({ refid: refid, responce: response.body, invid: d.iolid });
                }
                if (response.error) {
                    console.log('response', response.body);
                    resolve({ refid: refid, responce: response.error, invid: d.iolid });
                }
            })();
        });
    }
}

async function processOtt(data) {				// OTT Process LIST
    // console.log('OTT SubScription DATA :', data);
    return new Promise(async (resolve, reject) => {
        if (data.length != 0) {
            let conn = await poolPromise.getConnection(), insertdata = false, conn_status = 0;
            if (conn) {
                conn_status = 1;
                let datalen = data.length > 1800 ? 1800 : data.length;
                console.log('OTT datalen :', datalen);
                for (let h = 0; h < datalen; h++) {
                    let ottdata = data[h];
                    console.log(h, 'ottdata :', ottdata);
                    await conn.beginTransaction();
                    try {
                        let ottres = '', ottstatus = '', updateottinvoice = '', ottResponse = '', ott_vendor = '';
                        console.log('ottres:', ottres);
                        console.log('vendorrr',ottdata.ott_vendor);

                        if (ottdata.ott_vendor == 1) {
                            ottres = await ottSubscription(ottdata);
                            console.log('M2MIT OTT RES :', ottres);
                            // {"CustMobileNo":"918501091111","RefNo":"8501091111BLSSPL","GID":"001b9e486e","Plan":"1S","StatusCode":"9999","Errmsg":"Customer Registered and Subscribed Succesfully."}
                            // console.log('RefNo:', ottres.RefNo, '\nStatusCode:', ottres.StatusCode);
                            ottResponse = JSON.parse(ottres.responce);
                            ottstatus = ottResponse['StatusCode'] == 9999 ? 2 : 3;
                            ott_vendor = ` ,oi.ott_vendor=1 `;
                            console.log('ottres:', ottResponse['StatusCode'], 'Status', 'Status', ottstatus);
                            // if (ottstatus == 3) ottres = { "message": "Currently Given Package Not Available.", "Pack_code": h.ottplancode };
                        }
                        if (ottdata.ott_vendor == 2) {
                            console.log('vendorrr',ottdata.ott_vendor);
                            // Step 1 check OTT Pack is available or not 
                            let getpartnerpack = await pbcheckavapack(), packava = '';
                            console.log('Get Packkk---------------------',getpartnerpack.body);
                            getpartnerpack = JSON.parse(getpartnerpack.body);
                            // console.log('getpartnerpack : ', getpartnerpack);
                            if (getpartnerpack.statusCode == 200) {
                                let presult = getpartnerpack.result;
                                packava = presult.find(o => o.packs_id === ottdata.ottplancode);
                                packava = packava == null ? 'NA' : packava;
                                console.log('Available pack Details',packava);
                                // check pack available or not
                            } else {
                                // error or pack not available
                                console.log('Currently Given Package Not Available. Pack Code : ', ottdata.ottplancode);
                                ottres = { "message": "Currently Given Package Not Available.", "Pack_code": ottdata.ottplancode };
                                // await conn.rollback();
                            }
                            if (packava == 'NA' && packava != '') {
                                console.log('Currently Given Package Not Available. Pack Code : ', ottdata.ottplancode);
                                ottres = { "message": "Currently Given Package Not Available.", "Pack_code": ottdata.ottplancode };
                                // await conn.rollback();
                            }
                            if (packava != 'NA' && packava != '') {
                                // send activation details.
                                // Step 3 Activate subscription.
                                ottres = await PlayBoxottSubscription(ottdata);
                                console.log('ottresponse',ottres);
                                // ottResponse = ottres;
                                ottstatus = ottres['message'] == 'Pack assigned successfully.' ? 2 : 3;
                                console.log('ottres:', ottres['message'], 'Status', 'Status', ottstatus);

                            }

                            // Step 2 check new user or existing  || Dont Need This Step


                            ott_vendor = ` ,oi.ott_vendor=2 `;
                        }
                        if (ottstatus != '') {
                            updateottinvoice = ` UPDATE ott.Ottinvoice oi SET oi.mobile='${ottdata.mobile}',oi.ottstatus=${ottstatus},oi.res_msg='${JSON.stringify(ottres)}',oi.res_date=NOW() ${ott_vendor} WHERE oi.iolid='${ottdata.iolid}' `;
                            updateottinvoice = await conn.query(updateottinvoice);
                            if (updateottinvoice[0]['affectedRows'] > 0) {
                                await conn.commit();
                            } else {
                                console.log('Cannot Update Status In Invoice.....');
                                await conn.rollback();
                            }
                        }

                    } catch (e) {
                        console.log('processOtt Catch Error -----------------\n', e);
                    }
                }
            } else {
                console.log('Connection Error.');
            }
            if (conn_status == 1) {
                conn.release();
                console.log('OTT SubScription Connection Released.', conn_status);
            } else {
                console.log('OTT SubScription Connection Not Done.', conn_status);
            }

        }
    });
}
async function ottSubs(invid) {
    var sql = ` SELECT count(*) cnt FROM ott.Ottinvoice inv LEFT JOIN ott.ottUsers u ON inv.uid=u.id WHERE inv.ottstatus=1 AND inv.iolid=${invid} `
    let conn = await poolPromise.getConnection(), insertdata = false;
    if (conn) {
        await conn.beginTransaction();
        try {
            let result = await conn.query(sql);
            console.log('OTT Count :', result[0][0].cnt);
            if (result[0][0].cnt > 0) {
                let sqlquery = ` SELECT inv.*,u.profileid,u.mobileverify,u.mobile,u.emailverify,u.email 
        FROM ott.Ottinvoice inv LEFT JOIN ott.ottUsers u ON inv.uid=u.id WHERE inv.ottstatus=1 AND inv.iolid=${invid} `;
                console.log('sqlquery :', sqlquery);
                sqlquery = await conn.query(sqlquery);
                console.log(sqlquery[0])
                processOtt(sqlquery[0]);
                // }
            } else {
                console.log('No OTT Subscription Available For :', invid);
            }
        }
        catch (e) { console.log('Internal Error ', e); await conn.rollback(); }
        // console.log('try done.');
        conn.release();
        console.log('GET OTT LIST CONNECTION Closed....');
    } else {
        console.log('-------------OTT SCHEDULE Connection ERROR----------');
    }
}

async function dist_renewal(m, gd) {
    console.log('Dist Renewal');
    return new Promise(async (resolve, reject) => {
        var conn = await poolPromise.getConnection(), erroraray = [], addinv = ' INSERT INTO ott.Ottinvoice SET mobile=' + m.mobile + ',ott_vendor=' + gd.ott_vendor + ',busid=' + m.bid, update_ottusers = '', update_man = '', manstatus = false,
            totpackprice = 0, tottaxamt = 0, gltvamt = 0, gltvtaxamt = 0, ottamt = 0, otttaxamt = 0,
            gltvtot_amt = 0, otttot_amt = 0, tottot_amt = 0;
        if (conn) {
            // await delay(1000);
            await conn.beginTransaction();
            try {
                gltvamt = gd.gltvpackamt, gltvtaxamt = gd.gltvpacktaxamt;
                console.log('GLTV  Price', gltvamt, 'GLTV Tax price', gltvtaxamt);
                ottamt = gd.ottpamt, otttaxamt = gd.ottptaxamt;
                console.log('OTT  Price', ottamt, 'OTT Tax price', otttaxamt);
                totpackprice = gd.totpamt, tottaxamt = gd.totptaxamt;
                console.log('Tax Inclusive ', 'TOTAL Pack Price', totpackprice, 'TOTAL Tax price', tottaxamt);
                if (m.msharetype == 1) {      // Bulk
                    console.log('Bulk Dist----');
                }
                if (m.msharetype == 2) {      // Sharing
                    if (Number(m.mtotshare) == 100) {
                        var gltvbprice = gd.gltvbamt
                        console.log('\nGLTV Business share amount', gd.gltvbamt);
                        var gltvdprice = gd.gltvdamt
                        console.log('GLTV Dist  Share amt ', gd.gltvdamt);
                        var gltvsdprice = gd.gltvsdamt
                        console.log('GLTV Sub Dist share amount', gd.gltvsdamt);
                        var gltvreseller_price = gd.gltvramt
                        console.log('GLTV Reseller share amount', gd.gltvramt);

                        var ottbprice = gd.ottbamt
                        console.log('\nOTT Business share amount', gd.ottbamt);
                        var ottdprice = gd.ottdamt
                        console.log('OTT Dist  Share amt ', gd.ottdamt);
                        var ottsdprice = gd.ottsdamt
                        console.log('OTT Sub Dist share amount', gd.ottsdamt);
                        var ottreseller_price = gd.ottramt
                        console.log('OTT Reseller share amount', gd.ottramt);

                        var totbprice = gd.totbamt
                        console.log('\nTOTAL Business share amount', gd.totbamt);
                        var totdprice = gd.totdamt
                        console.log('TOTAL Dist  Share amt ', gd.totdamt);
                        var totsdprice = gd.totsdamt
                        console.log('TOTAL Sub Dist share amount', gd.totsdamt);
                        var totreseller_price = gd.totramt
                        console.log('TOTAL Reseller share amount', gd.totramt);


                        if (m.role == 777) {      // Dist
                            gltvtot_amt = Number(Number(gd.gltvbamt) + Number(gltvtaxamt)).toFixed(2);
                            otttot_amt = Number(Number(gd.ottbamt) + Number(otttaxamt)).toFixed(2);
                            tottot_amt = Number(Number(gd.totbamt) + Number(tottaxamt)).toFixed(2);

                            addinv += `,bshare=${Number(m.mbshare)},dshare=${Number(m.mdshare)}`;
                            addinv += `,bamt=${Number(gd.totbamt)},damt=${Number(gd.totdamt)}`;
                            addinv += `,dmid=${Number(m.mid)}`;
                        }
                        console.log('\nGLTV TOTAL D Amt:', gltvtot_amt);
                        console.log('OTT TOTAL D Amt:', otttot_amt);
                        console.log('TOTAL TOTAL D Amt:', tottot_amt);
                        addinv += `,beforedetection=${m.mamt},detectedamt=${tottot_amt}`;
                    } else {
                        erroraray.push({ msg: 'Check Sharing Percentage', error_msg: 99999 });
                        await conn.rollback();
                    }
                }
                if (gd.mapotttype == 1) {      // GLTV Only
                    addinv += ` ,gltvpakname='${gd.packname}',mapgltvid=${gd.mapgltvpackid},mapgltvpackamt=${gd.mapgltvpackamt} `
                }
                if (gd.mapotttype == 2) {      // GLTV and OTT
                    addinv += ` ,platform='${gd.ottplatform}',dayormonth=${gd.ottdayormonth},ottdays=${gd.ottdays},gltvpakname='${gd.packname}',mapgltvid=${gd.mapgltvpackid},mapgltvpackamt=${gd.mapgltvpackamt},mapottid=${gd.mapottpid},ottpackname='${gd.ottplan_name}',ottplancode='${gd.ottplancode}',mapottamt=${gd.mapottamt}`
                }
                if (m.statestatus == 0) { addinv += `,igst=${m.igst}` }
                if (m.statestatus == 1) { addinv += `,cgst=${m.cgst},sgst=${m.sgst}` }

                addinv += ` ,uid=${m.uid},cby=${m.mid},mapid=${gd.mapid},supplier_gst_number='${m.gstno}',maptaxtype=${gd.maptaxtype},totinvamt=${totpackprice},totinvtaxamt=${tottaxamt} `

                console.log('ADD Inv :', addinv);

                addinv = await conn.query(addinv);
                console.log(addinv[0].affectedRows);
                if (addinv[0].affectedRows == 1) {
                    console.log('INV ID:', addinv[0].insertId);

                    update_ottusers += ` UPDATE ott.ottUsers SET packid=${gd.mapgltvpackid},inv_type=2,invid=${addinv[0].insertId},invdate=NOW(),expirydate=IF(${gd.mapgltvdaytype}=1,NOW() + INTERVAL ${gd.mapgltvdays} DAY,NOW() + INTERVAL ${gd.mapgltvdays} MONTH) `
                    if (gd.mapotttype == 2) { update_ottusers += ` ,ottplancode='${gd.ottplanid}',ottplancode='${gd.ottplancode}',ott_platform='${gd.ottplatform}',ottexpirydate=IF(${gd.ottdayormonth}=1,NOW() + INTERVAL ${gd.ottdays} DAY,NOW() + INTERVAL ${gd.ottdays} MONTH) ` }
                    update_ottusers += ` WHERE id=${m.uid}`
                    console.log('User Update Query:', update_ottusers);
                    update_ottusers = await conn.query(update_ottusers);
                    console.log(update_ottusers[0].affectedRows);
                    if (update_ottusers[0].affectedRows == 1) {
                        if (m.msharetype == 1) {      // Bulk
                            manstatus = true;
                        }
                        if (m.msharetype == 2) {      // Shareing
                            if (Number(m.mamt) > Number(tottot_amt)) {
                                let sqlquery = ' UPDATE ott.`managers` SET mamt =mamt - ' + Number(tottot_amt) + ' WHERE `mid`=' + m.mid + ' AND role=777;' //tax amount
                                console.log(" Manager balance Update query\n\n", sqlquery);
                                sqlquery = await conn.query(sqlquery);
                                if (sqlquery[0].affectedRows == 1) {
                                    let addlog = `INSERT INTO ott.ott_inv_balance_log SET busid=${m.bid},invid=${addinv[0].insertId},manid=${m.mid},before_balance_amt=${m.mamt},amt=${tottot_amt},rflag=1,role=777,cby=${m.mid},renewal_type=2`
                                    console.log('add Log Query :', addlog);
                                    addlog = await conn.query(addlog)
                                    if (addlog[0].affectedRows == 1) {
                                        manstatus = true;
                                    } else {
                                        erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 88888 });
                                        await conn.rollback();
                                    }
                                } else {
                                    erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 88888 });
                                    await conn.rollback();
                                }
                            } else {
                                erroraray.push({ msg: 'TOP UP Your Account..', error_msg: 6789 });
                                await conn.rollback();
                            }
                        }
                        if (manstatus) {
                            erroraray.push({ msg: 'Account Activated..', error_msg: 0 });
                            await conn.commit();
                            ottSubs(addinv[0].insertId);
                            // ottSubs(23);
                        } else {
                            erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 88888 });
                            await conn.rollback();
                        }
                    } else {
                        erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 88888 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: 'Can Not Generate Invoice.. ', error_msg: 88888 });
                    await conn.rollback();
                }
            } catch (e) {
                erroraray.push({ msg: 'Internal Error please try later ', error_msg: 88888 });
                console.log('Internal Error ', e)
                await conn.rollback();
            }
            conn.release();
            console.log('bus_ottuser Connection Closed...');

        } else {
            erroraray.push({ msg: 'Internal Error please try later ', error_msg: 99999 });
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}
async function sub_dist_renewal(m, gd) {
    console.log('SUb Dist Renewal');
    return new Promise(async (resolve, reject) => {
        var conn = await poolPromise.getConnection(), erroraray = [], addinv = ' INSERT INTO ott.Ottinvoice SET mobile=' + m.mobile + ',ott_vendor=' + gd.ott_vendor + ', sdmid = ' + m.sdmid + ', busid = ' + m.bid, update_ottusers = '', update_man = '', manstatus = false,
        totpackprice = 0, tottaxamt = 0, gltvamt = 0, gltvtaxamt = 0, ottamt = 0, otttaxamt = 0,
            gltvtot_amt = 0, otttot_amt = 0, tottot_amt = 0;
        if (conn) {
            // await delay(1000);
            await conn.beginTransaction();
            try {
                // console.log('m:', m, '\ngd:', gd, '\nuid:', uid);

                gltvamt = gd.gltvpackamt, gltvtaxamt = gd.gltvpacktaxamt;
                console.log('GLTV  Price', gltvamt, 'GLTV Tax price', gltvtaxamt);
                ottamt = gd.ottpamt, otttaxamt = gd.ottptaxamt;
                console.log('OTT  Price', ottamt, 'OTT Tax price', otttaxamt);
                totpackprice = gd.totpamt, tottaxamt = gd.totptaxamt;
                console.log('Tax Inclusive ', 'TOTAL Pack Price', totpackprice, 'TOTAL Tax price', tottaxamt);

                if (m.msharetype == 1) {      // Bulk

                }
                if (m.msharetype == 2) {      // Sharing
                    if (Number(m.mtotshare) == 100) {

                        var gltvbprice = gd.gltvbamt
                        console.log('\nGLTV Business share amount', gd.gltvbamt);
                        var gltvdprice = gd.gltvdamt
                        console.log('GLTV Dist  Share amt ', gd.gltvdamt);
                        var gltvsdprice = gd.gltvsdamt
                        console.log('GLTV Sub Dist share amount', gd.gltvsdamt);
                        var gltvreseller_price = gd.gltvramt
                        console.log('GLTV Reseller share amount', gd.gltvramt);

                        var ottbprice = gd.ottbamt
                        console.log('\nOTT Business share amount', gd.ottbamt);
                        var ottdprice = gd.ottdamt
                        console.log('OTT Dist  Share amt ', gd.ottdamt);
                        var ottsdprice = gd.ottsdamt
                        console.log('OTT Sub Dist share amount', gd.ottsdamt);
                        var ottreseller_price = gd.ottramt
                        console.log('OTT Reseller share amount', gd.ottramt);

                        var totbprice = gd.totbamt
                        console.log('\nTOTAL Business share amount', gd.totbamt);
                        var totdprice = gd.totdamt
                        console.log('TOTAL Dist  Share amt ', gd.totdamt);
                        var totsdprice = gd.totsdamt
                        console.log('TOTAL Sub Dist share amount', gd.totsdamt);
                        var totreseller_price = gd.totramt
                        console.log('TOTAL Reseller share amount', gd.totramt);

                        if (m.role == 666) {        // Sub Dist
                            gltvtot_amt = Number(Number(gd.gltvbamt) + Number(gd.gltvdamt) + Number(gltvtaxamt)).toFixed(2);
                            otttot_amt = Number(Number(gd.ottbamt) + Number(gd.ottdamt) + Number(otttaxamt)).toFixed(2);
                            tottot_amt = Number(Number(gd.totbamt) + Number(gd.totdamt) + Number(tottaxamt)).toFixed(2);

                            addinv += `,bshare=${Number(m.mbshare)},dshare=${Number(m.mdshare)},sdshare=${Number(m.msdshare)}`;
                            addinv += `,bamt=${Number(gd.totbamt)},damt=${Number(gd.totdamt)},sdamt=${Number(gd.totsdamt)}`;
                            addinv += `,dmid=${Number(m.dmid)},sdmid=${Number(m.mid)}`;
                        }
                        console.log('\nGLTV TOTAL D Amt:', gltvtot_amt);
                        console.log('OTT TOTAL D Amt:', otttot_amt);
                        console.log('TOTAL TOTAL D Amt:', tottot_amt);
                        addinv += `,beforedetection=${m.mamt},detectedamt=${tottot_amt}`;
                    } else {
                        erroraray.push({ msg: 'Check Sharing Percentage', error_msg: 99999 });
                        await conn.rollback();
                    }
                }
                if (gd.mapotttype == 1) {      // GLTV Only
                    addinv += ` ,gltvpakname='${gd.packname}',mapgltvid=${gd.mapgltvpackid},mapgltvpackamt=${gd.mapgltvpackamt} `;
                }
                if (gd.mapotttype == 2) {      // GLTV and OTT
                    addinv += ` ,platform='${gd.ottplatform}',dayormonth=${gd.ottdayormonth},ottdays=${gd.ottdays},gltvpakname='${gd.packname}',mapgltvid=${gd.mapgltvpackid},mapgltvpackamt=${gd.mapgltvpackamt},mapottid=${gd.mapottpid},ottpackname='${gd.ottplan_name}',ottplancode='${gd.ottplancode}',mapottamt=${gd.mapottamt}`
                }
                if (m.statestatus == 0) { addinv += `,igst=${m.igst}` }
                if (m.statestatus == 1) { addinv += `,cgst=${m.cgst},sgst=${m.sgst}` }

                addinv += ` ,uid=${m.uid},cby=${m.mid},mapid=${gd.mapid},supplier_gst_number='${m.gstno}',maptaxtype=${gd.maptaxtype},totinvamt=${totpackprice},totinvtaxamt=${tottaxamt} `

                console.log('ADD Inv :', addinv);

                addinv = await conn.query(addinv);
                console.log(addinv[0].affectedRows);
                if (addinv[0].affectedRows == 1) {
                    console.log('INV ID:', addinv[0].insertId);

                    update_ottusers += ` UPDATE ott.ottUsers SET packid=${gd.mapgltvpackid},inv_type=2,invid=${addinv[0].insertId},invdate=NOW(),expirydate=IF(${gd.mapgltvdaytype}=1,NOW()+ INTERVAL ${gd.mapgltvdays} DAY,NOW()+ INTERVAL ${gd.mapgltvdays} MONTH) `
                    if (gd.mapotttype == 2) { update_ottusers += ` ,ottplancode='${gd.ottplanid}',ottplancode='${gd.ottplancode}',ottexpirydate=IF(${gd.ottdayormonth}=1,NOW()+ INTERVAL ${gd.ottdays} DAY,NOW()+ INTERVAL ${gd.ottdays} MONTH) ` }
                    update_ottusers += ` WHERE id=${m.uid}`
                    console.log('User Update Query:', update_ottusers);
                    update_ottusers = await conn.query(update_ottusers);
                    console.log(update_ottusers[0].affectedRows);
                    if (update_ottusers[0].affectedRows == 1) {
                        if (m.msharetype == 1) {      // Bulk
                            manstatus = true;
                            console.log('BULK..............');
                        }
                        if (m.msharetype == 2) {      // Shareing
                            if (Number(m.mamt) > Number(tottot_amt)) {
                                let sqlquery = ' UPDATE ott.`managers` SET mamt =mamt - ' + Number(tottot_amt) + ' WHERE `mid`=' + m.mid + ' AND role=666;' //tax amount
                                console.log(" Manager balance Update query\n\n", sqlquery);
                                sqlquery = await conn.query(sqlquery);
                                if (sqlquery[0].affectedRows == 1) {
                                    let updatedist = ' UPDATE ott.`managers` SET mamt =mamt + ' + Number(gd.totdamt) + ' WHERE `mid`=' + m.dmid + ' AND role=777;'
                                    console.log('updatedist :', updatedist);
                                    updatedist = await conn.query(updatedist);
                                    if (updatedist[0].affectedRows == 1) {

                                        let addlog = `INSERT INTO ott.ott_inv_balance_log SET busid=${m.bid},invid=${addinv[0].insertId},manid=${m.mid},before_balance_amt=${m.mamt},amt=${tottot_amt},rflag=1,role=666,cby=${m.mid},renewal_type=2`
                                        console.log('add Log Query :', addlog);
                                        addlog = await conn.query(addlog)
                                        if (addlog[0].affectedRows == 1) {
                                            let addlog = `INSERT INTO ott.ott_inv_balance_log SET busid=${m.bid},invid=${addinv[0].insertId},manid=${m.dmid},before_balance_amt=${m.dmamt},amt=${gd.totdamt},rflag=2,role=777,cby=${m.mid},renewal_type=2`
                                            console.log('add Log Query :', addlog);
                                            addlog = await conn.query(addlog)
                                            if (addlog[0].affectedRows == 1) {
                                                manstatus = true;
                                            } else {
                                                erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 344 });
                                                await conn.rollback();
                                            }
                                        } else {
                                            erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 348 });
                                            await conn.rollback();
                                        }
                                    } else {
                                        erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 352 });
                                        await conn.rollback();
                                    }
                                } else {
                                    erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 356 });
                                    await conn.rollback();
                                }
                            } else {
                                console.log('TOP UP Your Account..');
                                erroraray.push({ msg: 'TOP UP Your Account..', error_msg: 361 });
                                await conn.rollback();
                                // ottSubs(23);
                            }
                        }
                        if (manstatus) {
                            erroraray.push({ msg: 'Account Activated..', error_msg: 0 });
                            await conn.commit();
                            ottSubs(addinv[0].insertId);

                            console.log('----------------------Inv ID Send TO OTTSUBS---------------------');

                        }
                    } else {
                        erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 373 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: 'Can Not Generate Invoice.. ', error_msg: 88888 });
                    await conn.rollback();
                }

            } catch (e) {
                erroraray.push({ msg: 'Internal Error please try later ', error_msg: 88888 });
                console.log('Internal Error ', e);
                await conn.rollback();
            }
            conn.release();
            console.log('sub_dist_renewal Connection Closed...');

        } else {
            erroraray.push({ msg: 'Internal Error please try later ', error_msg: 99999 });
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}
async function reseller_renewal(m, gd) {
    console.log('Reseller');
    return new Promise(async (resolve, reject) => {
        var conn = await poolPromise.getConnection(), erroraray = [], addinv = ' INSERT INTO ott.Ottinvoice SET mobile=' + m.mobile + ',ott_vendor=' + gd.ott_vendor + ',mid=' + m.mid + ', busid=' + m.bid, update_ottusers = '', update_man = '', manstatus = false,
            totpackprice = 0, tottaxamt = 0, gltvamt = 0, gltvtaxamt = 0, ottamt = 0, otttaxamt = 0, gltvtot_amt = 0, otttot_amt = 0, tottot_amt = 0;
        if (conn) {
            // await delay(1000);
            await conn.beginTransaction();
            try {
                gltvamt = gd.gltvpackamt, gltvtaxamt = gd.gltvpacktaxamt;
                console.log('GLTV  Price', gltvamt, 'GLTV Tax price', gltvtaxamt);
                ottamt = gd.ottpamt, otttaxamt = gd.ottptaxamt;
                console.log('OTT  Price', ottamt, 'OTT Tax price', otttaxamt);
                totpackprice = gd.totpamt, tottaxamt = gd.totptaxamt;
                console.log('Tax Inclusive ', 'TOTAL Pack Price', totpackprice, 'TOTAL Tax price', tottaxamt);

                if (m.msharetype == 1) {      // Bulk

                }
                if (m.msharetype == 2) {      // Sharing
                    if (Number(m.mtotshare) == 100) {
                        console.log('\nGLTV Business share amount', gd.gltvbamt);
                        console.log('GLTV Dist  Share amt ', gd.gltvdamt);
                        console.log('GLTV Sub Dist share amount', gd.gltvsdamt);
                        console.log('GLTV Reseller share amount', gd.gltvramt);

                        console.log('\nOTT Business share amount', gd.ottbamt);
                        console.log('OTT Dist  Share amt ', gd.ottdamt);
                        console.log('OTT Sub Dist share amount', gd.ottsdamt);
                        console.log('OTT Reseller share amount', gd.ottramt);

                        console.log('\nTOTAL Business share amount', gd.totbamt);
                        console.log('TOTAL Dist  Share amt ', gd.totdamt);
                        console.log('TOTAL Sub Dist share amount', gd.totsdamt);
                        console.log('TOTAL Reseller share amount', gd.totramt);

                        if (m.role == 555) {        // Reseller
                            gltvtot_amt = Number(Number(gd.gltvbamt) + Number(gd.gltvdamt) + Number(gd.gltvsdamt) + Number(gltvtaxamt));
                            otttot_amt = Number(Number(gd.ottbamt) + Number(gd.ottdamt) + Number(gd.ottsdamt) + Number(otttaxamt)).toFixed(2);
                            tottot_amt = Number(Number(gd.totbamt) + Number(gd.totdamt) + Number(gd.totsdamt) + Number(tottaxamt)).toFixed(2);

                            addinv += `,bshare=${Number(m.mbshare)},dshare=${Number(m.mdshare)},sdshare=${Number(m.msdshare)},mshare=${Number(m.mmshare)}`;
                            addinv += `,bamt=${Number(gd.totbamt)},damt=${Number(gd.totdamt)},sdamt=${Number(gd.totsdamt)},mamt=${Number(gd.totramt)}`;
                            addinv += `,dmid=${Number(m.dmid)},sdmid=${Number(m.sdmid)}`;
                        }

                        console.log('\nGLTV TOTAL D Amt:', gltvtot_amt);
                        console.log('OTT TOTAL D Amt:', otttot_amt);
                        console.log('TOTAL TOTAL D Amt:', tottot_amt);
                        addinv += `,beforedetection=${m.mamt},detectedamt=${tottot_amt}`;

                    } else {
                        erroraray.push({ msg: 'Check Sharing Percentage', error_msg: 99999 });
                        await conn.rollback();
                    }
                }
                if (gd.mapotttype == 1) {      // GLTV Only
                    addinv += ` ,gltvpakname='${gd.packname}',mapgltvid=${gd.mapgltvpackid},mapgltvpackamt=${gd.mapgltvpackamt} `
                }
                if (gd.mapotttype == 2) {      // GLTV and OTT
                    addinv += ` ,platform='${gd.ottplatform}',dayormonth=${gd.ottdayormonth},ottdays=${gd.ottdays},gltvpakname='${gd.packname}',mapgltvid=${gd.mapgltvpackid},mapgltvpackamt=${gd.mapgltvpackamt},mapottid=${gd.mapottpid},ottpackname='${gd.ottplan_name}',ottplancode='${gd.ottplancode}',mapottamt=${gd.mapottamt}`
                }
                if (m.statestatus == 0) { addinv += `,igst=${m.igst}` }
                if (m.statestatus == 1) { addinv += `,cgst=${m.cgst},sgst=${m.sgst}` }

                addinv += ` ,uid=${m.uid},cby=${m.mid},mapid=${gd.mapid},supplier_gst_number='${m.gstno}',maptaxtype=${gd.maptaxtype},totinvamt=${totpackprice},totinvtaxamt=${tottaxamt} `

                console.log('ADD Inv :', addinv);

                addinv = await conn.query(addinv);
                console.log(addinv[0].affectedRows);
                if (addinv[0].affectedRows == 1) {
                    console.log('INV ID:', addinv[0].insertId);
                    update_ottusers += ` UPDATE ott.ottUsers SET packid=${gd.mapgltvpackid},inv_type=2,invid=${addinv[0].insertId},invdate=NOW(),expirydate=IF(${gd.mapgltvdaytype}=1,NOW()+ INTERVAL ${gd.mapgltvdays} DAY,NOW() + INTERVAL ${gd.mapgltvdays} MONTH) `
                    if (gd.mapotttype == 2) { update_ottusers += `,ottplancode='${gd.ottplanid}',ottplancode='${gd.ottplancode}',ottexpirydate=IF(${gd.ottdayormonth}=1,NOW()+ INTERVAL ${gd.ottdays} DAY,NOW() + INTERVAL ${gd.ottdays} MONTH) ` }
                    update_ottusers += ` WHERE id=${m.uid}`
                    console.log('User Update Query:', update_ottusers);
                    update_ottusers = await conn.query(update_ottusers);
                    console.log(update_ottusers[0].affectedRows);
                    if (update_ottusers[0].affectedRows == 1) {
                        if (m.msharetype == 1) {      // Bulk
                            manstatus = true;
                            console.log('BULK..............');
                        }
                        if (m.msharetype == 2) {      // Shareing
                            if (Number(m.mamt) > Number(tottot_amt)) {

                                let tempuser = [], updateres = 'UPDATE ott.`managers` SET mamt =( CASE ' + ' WHEN  mid=' + m.mid + '  THEN mamt - ' + Number(tottot_amt); // Reseller

                                if (m.dmid != 0 && m.mdshare != 0) {
                                    updateres += ' WHEN  mid=' + m.dmid + ' THEN ' + ' mamt + ' + Number(gd.totdamt).toFixed(2); // Dist share amt
                                    tempuser.push(m.dmid);
                                }
                                if (m.sdmid != 0 && m.msdshare != 0) {
                                    updateres += ' WHEN mid=' + m.sdmid + '  THEN ' + ' mamt + ' + Number(gd.totsdamt); // sub dist share amt
                                    tempuser.push(m.sdmid);
                                }
                                updateres += ' END)   WHERE mid IN (' + m.mid + '';
                                if (tempuser.length > 0) {
                                    updateres += ',' + tempuser.join(',');
                                }
                                updateres += ') ';
                                console.log(" Manager balance Update query", updateres);
                                let result = await conn.query(updateres);
                                console.log(result[0]['affectedRows']);
                                if (result[0]['affectedRows'] == 0) {
                                    erroraray.push({ msg: 'Something Went Wrong Please Try Later.', error_msg: 98465312 });
                                    await conn.rollback();
                                } else {
                                    let bal_data = [], invlogquery;
                                    bal_data.push(['(' + m.bid, addinv[0].insertId, m.mid, m.mamt, tottot_amt, 1, m.mid, 555, 2 + ')'])
                                    if (m.dmid != 0 && m.mdshare != 0) {
                                        bal_data.push(['(' + m.bid, addinv[0].insertId, m.dmid, m.dmamt, gd.totdamt, 2, m.mid, 555, 2 + ')'])
                                    }
                                    if (m.sdmid != 0 && m.msdshare != 0) {
                                        bal_data.push(['(' + m.bid, addinv[0].insertId, m.sdmid, m.sdmamt, gd.totsdamt, 2, m.mid, 555, 2 + ')'])
                                    }
                                    console.log('Invoice Balance Data : ', bal_data);
                                    invlogquery = ' INSERT INTO ott.ott_inv_balance_log (busid,invid,manid,before_balance_amt,amt,rflag,cby,role,renewal_type) VALUES ' + ' ' + [bal_data] + ' '
                                    console.log("InvoiceBalance Log query", invlogquery);
                                    let logresult = await conn.query(invlogquery);
                                    if (logresult[0]['affectedRows'] > 0) {
                                        console.log("Invoice Balance Log Created Success");
                                        manstatus = true;
                                    } else {
                                        console.log("Balance LOg Failed", 5678);
                                        erroraray.push({ msg: 'Internal Error', error_msg: 7890098765 });
                                        await conn.rollback();
                                    }
                                }
                            } else {
                                console.log('TOP UP Your Account..');
                                erroraray.push({ msg: 'TOP UP Your Account..', error_msg: 361 });
                                await conn.rollback();
                            }
                        }
                        if (manstatus) {
                            erroraray.push({ msg: 'Account Activated..', error_msg: 0 });
                            await conn.commit();
                            ottSubs(addinv[0].insertId);
                            // ottSubs(23);
                        }
                    } else {
                        erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 373 });
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: 'Can Not Generate Invoice.. ', error_msg: 88888 });
                    await conn.rollback();
                }
            } catch (e) {
                erroraray.push({ msg: 'Internal Error please try later ', error_msg: 88888 });
                console.log('Internal Error ', e)
                await conn.rollback();
            }
            conn.release();
            console.log('sub_dist_renewal Connection Closed...');

        } else {
            erroraray.push({ msg: 'Internal Error please try later ', error_msg: 99999 });
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}
async function ottuser(m, planid) {
    return new Promise(async (resolve, reject) => {
        var conn = await poolPromise.getConnection(), erroraray = [], istatus = false, brole = m.role == 777 ? dist_renewal : m.role == 666 ? sub_dist_renewal : m.role == 555 ? reseller_renewal : '';
        if (conn) {
            // await delay(1000);
            await conn.beginTransaction();
            try {
                console.log('ghkewuddugfkbuicwregygfiukbg---------------------------------------');
                console.log('m DATA', m);
                console.log('INPUT DATA', planid);
                let getdetails = ` SELECT map.id mapid,map.busid mapbusid,map.manid mapmanid,map.gltvpackid mapgltvpackid,map.gltvpackamt mapgltvpackamt,map.gltvdaytype mapgltvdaytype,map.gltvdays mapgltvdays,
          map.ottpid mapottpid,map.ottpamt mapottamt,(map.gltvpackamt+map.ottpamt) totamt
          ,ROUND(IF(map.taxtype=0,(map.gltvpackamt-(map.gltvpackamt*${m.igst}/(100+${m.igst}))),map.gltvpackamt),2) gltvpackamt
          ,ROUND(IF(map.taxtype=0,(map.gltvpackamt*${m.igst}/(100+${m.igst})),(map.gltvpackamt*${m.igst})/100),2) gltvpacktaxamt 
       
          ,ROUND(IF(map.taxtype=0,(map.ottpamt-(map.ottpamt*${m.igst}/(100+${m.igst}))),map.ottpamt),2) ottpamt
          ,ROUND(IF(map.taxtype=0,(map.ottpamt*${m.igst}/(100+${m.igst})),(map.ottpamt*${m.igst})/100),2) ottptaxamt 

          ,ROUND(IF(map.taxtype=0,((map.gltvpackamt+map.ottpamt)-((map.gltvpackamt+map.ottpamt)*${m.igst}/(100+${m.igst}))),(map.gltvpackamt+map.ottpamt)),2) totpamt
          ,ROUND(IF(map.taxtype=0,((map.gltvpackamt+map.ottpamt)*${m.igst}/(100+${m.igst})),((map.gltvpackamt+map.ottpamt)*${m.igst})/100),2) totptaxamt 

          ,ROUND(IF(map.taxtype=0,(map.gltvpackamt-(map.gltvpackamt*${m.igst}/(100+${m.igst}))),map.gltvpackamt)*(${m.mbshare}/100),2) gltvbamt
          ,ROUND(IF(map.taxtype=0,(map.gltvpackamt-(map.gltvpackamt*${m.igst}/(100+${m.igst}))),map.gltvpackamt)*(${m.mdshare}/100),2) gltvdamt
          ,ROUND(IF(map.taxtype=0,(map.gltvpackamt-(map.gltvpackamt*${m.igst}/(100+${m.igst}))),map.gltvpackamt)*(${m.msdshare}/100),2) gltvsdamt
          ,ROUND(IF(map.taxtype=0,(map.gltvpackamt-(map.gltvpackamt*${m.igst}/(100+${m.igst}))),map.gltvpackamt)*(${m.mmshare}/100),2) gltvramt

          ,ROUND(IF(map.taxtype=0,(map.ottpamt-(map.ottpamt*${m.igst}/(100+${m.igst}))),map.ottpamt)*(${m.mbshare}/100),2) ottbamt
          ,ROUND(IF(map.taxtype=0,(map.ottpamt-(map.ottpamt*${m.igst}/(100+${m.igst}))),map.ottpamt)*(${m.mdshare}/100),2) ottdamt
          ,ROUND(IF(map.taxtype=0,(map.ottpamt-(map.ottpamt*${m.igst}/(100+${m.igst}))),map.ottpamt)*(${m.msdshare}/100),2) ottsdamt
          ,ROUND(IF(map.taxtype=0,(map.ottpamt-(map.ottpamt*${m.igst}/(100+${m.igst}))),map.ottpamt)*(${m.mmshare}/100),2) ottramt

          ,ROUND(IF(map.taxtype=0,((map.gltvpackamt+map.ottpamt)-((map.gltvpackamt+map.ottpamt)*${m.igst}/(100+${m.igst}))),(map.gltvpackamt+map.ottpamt))*(${m.mbshare}/100),2) totbamt
          ,ROUND(IF(map.taxtype=0,((map.gltvpackamt+map.ottpamt)-((map.gltvpackamt+map.ottpamt)*${m.igst}/(100+${m.igst}))),(map.gltvpackamt+map.ottpamt))*(${m.mdshare}/100),2) totdamt
          ,ROUND(IF(map.taxtype=0,((map.gltvpackamt+map.ottpamt)-((map.gltvpackamt+map.ottpamt)*${m.igst}/(100+${m.igst}))),(map.gltvpackamt+map.ottpamt))*(${m.msdshare}/100),2) totsdamt
          ,ROUND(IF(map.taxtype=0,((map.gltvpackamt+map.ottpamt)-((map.gltvpackamt+map.ottpamt)*${m.igst}/(100+${m.igst}))),(map.gltvpackamt+map.ottpamt))*(${m.mmshare}/100),2) totramt

          ,map.apstatus mapapstatus,map.taxtype maptaxtype,map.otttype mapotttype,map.ott_vendor
          ,pkg.pack_id,map.gltvdaytype,map.gltvdays,pkg.packname,op.ottplanid,op.ottplan_name,op.ottplancode,op.ottplatform,op.dayormonth ottdayormonth,op.days ottdays
          FROM ott.managersallowedpack map LEFT JOIN ott.package pkg ON map.gltvpackid=pkg.pack_id
          LEFT JOIN ott.ottplan op ON op.ottplanid=map.ottpid WHERE map.id=${planid} `

                console.log('getdetails :\n', getdetails);
                getdetails = await conn.query(getdetails);
                if (getdetails[0].length == 1) {
                    // Check Validation and other conditions..
                    let gd = getdetails[0][0];
                    console.log('getdetails Result :', gd);
                    console.log('User Exit...');
                    let res = await brole(m, gd);
                    console.log(res);
                    erroraray.push({ msg: res[0].msg, error_msg: res[0].error_msg });
                }
                if (getdetails[0].length > 1) {         // More than 1 Record Found
                    console.log('More than 1 Record Found');
                    erroraray.push({ msg: 'Contact Your Admin.', error_msg: 88888 });
                    await conn.rollback();
                }
                if (getdetails[0].length == 0) {      //  No Record Found
                    console.log('No Record Found');
                    erroraray.push({ msg: 'Contact Your Admin.', error_msg: 88888 });
                    await conn.rollback();

                }
                // erroraray.push({ msg: 'Checking ', error_msg: 88888 });

            } catch (e) {
                erroraray.push({ msg: 'Internal Error please try later ', error_msg: 88888 });
                console.log('Internal Error ', e)
                await conn.rollback();
            }
            conn.release();
            console.log('business renewal Connection Closed...');

        } else {
            erroraray.push({ msg: 'Internal Error please try later ', error_msg: 99999 });
            return;
        }
        console.log('success--2');
        return resolve(erroraray);
    });
}
async function ottrenewal(req) {
    return new Promise(async (resolve, reject) => {
        var data = req.body, sql, erroraray = [], conn = await poolPromise.getConnection(), getbusdetails = '';

        console.log('Input DATA  : ', data);
        if (conn) {
            await conn.beginTransaction();
            try {
                let findman = ` SELECT u.id uid,u.busid,u.dmid,u.sdmid,u.mid,u.role_type FROM ott.ottUsers u  WHERE u.id=${data.uid} `
                console.log('findman :', findman);
                findman = await conn.query(findman);
                if (findman[0].length == 1) {
                    let l = findman[0][0];
                    getbusdetails = ` SELECT m.mid,m.mamt,m.sharetype msharetype,m.bshare mbshare,m.dshare mdshare,m.sdshare msdshare,m.mshare mmshare,(m.bshare+m.dshare+m.sdshare+m.mshare) mtotshare
                        ,m.bid,m.dmid,m.sdmid,m.role,IF(m.state=gs.state,1,0) statestatus,m.status mstatus,m.under_man
                        ,gs.bname,gs.amt,gs.address,gs.igst,gs.cgst,gs.sgst,gs.pan,gs.gstno,gs.servicetax,gs.hsn,gs.phone,gs.email
                        ,u.id uid,u.profileid,u.fullname,IF(u.expirydate>NOW(),1,0) gltvastatus,IF(u.ottexpirydate>NOW(),1,0) ottastatus
                        ,u.mobile,u.mobileverify,u.email,u.emailverify,u.ustatus `
                    if (l.role_type == 1) { // DIST
                        getbusdetails += ` FROM ott.ottUsers u LEFT JOIN   ott.managers m ON u.dmid=m.mid LEFT JOIN ott.gltvsettings gs ON u.busid=gs.ottbid WHERE u.id=${data.uid} `
                    }
                    if (l.role_type == 2) { //SUB DIST
                        getbusdetails += ` ,d.mamt dmamt,d.role drole
                                    FROM ott.ottUsers u LEFT JOIN ott.managers m ON u.sdmid=m.mid LEFT JOIN ott.managers d ON u.dmid=d.mid
                                    LEFT JOIN ott.gltvsettings gs ON u.busid=gs.ottbid WHERE u.id=${data.uid} `
                    }
                    if (l.role_type == 3) {     // RESELLER
                        getbusdetails += ` ,d.mamt dmamt,d.role drole,sd.mamt sdmamt,sd.role sdrole
                                            FROM ott.ottUsers u LEFT JOIN ott.managers m ON u.mid=m.mid
                                            LEFT JOIN ott.managers d ON d.mid=u.dmid
                                            LEFT JOIN ott.managers sd ON sd.mid=u.sdmid
                                            LEFT JOIN ott.gltvsettings gs ON u.busid=gs.ottbid
   WHERE u.id=${data.uid} `
                    }
                    console.log('getbusdetails :', getbusdetails);
                    getbusdetails = await conn.query(getbusdetails);
                    if (getbusdetails[0].length == 1) {
                        let m = getbusdetails[0][0], res = '';
                        console.log(m);
                        if (m.ustatus == 1) {
                            if (m.gltvastatus == 0 && m.ottastatus == 0) {
                                if (m.mobileverify == 1) {
                                    res = await ottuser(m, data.planid);
                                    console.log(res);
                                    if (res) { erroraray.push({ msg: res[0].msg, error_msg: res[0].error_msg }); }
                                } else {
                                    erroraray.push({ msg: 'Mobile Number Need to Verify..', error_msg: 777777 });
                                    await conn.rollback();
                                }
                            } else {
                                erroraray.push({ msg: 'GLTV Service Not Expired..', error_msg: 777777 });
                                await conn.rollback();
                            }
                        } else {
                            erroraray.push({ msg: 'Subscriber Account Has Been Disabled or Terminated..', error_msg: 777777 });
                            await conn.rollback();
                        }

                    } else {
                        console.log('No Details Found..');
                        erroraray.push({ msg: 'No Data Found..', error_msg: 88888 });
                        await conn.rollback();
                    }
                } else {
                    console.log('No Details Found..');
                    erroraray.push({ msg: 'No Data Found..', error_msg: 88888 });
                    await conn.rollback();
                }
            } catch (e) {
                erroraray.push({ msg: 'Internal Error please try later ', error_msg: 88888 });
                console.log('Internal Error ', e)
                await conn.rollback();
            }
            conn.release();
            console.log('Active Account Connection Closed...');

        } else {
            erroraray.push({ msg: 'Internal Error please try later ', error_msg: 99999 });
            return;
        }
        console.log('success--2');
        // res.end(JSON.stringify(erroraray));
        return resolve(erroraray);
    });
}
async function recheckOttStatus(req) {				// Recheck OTT SubScription Single
    return new Promise(async (resolve, reject) => {
        let d = req.body, conn = await poolPromise.getConnection(), insertdata = false, conn_status = 0, erroraray = [], jwtott = req.ott_data;
        if (conn) {
            conn_status = 1;
            await conn.beginTransaction();
            try {
                console.log('Data', d);
                let getdetails = `SELECT u.id uid,i.iolid,u.fullname,u.profileid,u.dob,u.emailverify,u.email,u.mobile,i.ottpackname,i.ottplancode,i.ottstatus,(i.totinvamt+i.totinvtaxamt) planmrp,ott_vendor FROM ott.Ottinvoice i INNER JOIN ott.ottUsers u ON i.uid=u.id WHERE i.iolid=` + d.iolid
                console.log('getdetails :', getdetails);
                getdetails = await conn.query(getdetails);
                if (getdetails[0].length == 1) {
                    if (getdetails[0][0]['ottstatus'] != 2) {
                        if (getdetails[0][0]['ott_vendor'] == 1) {
                            let ottres = await ottSubscription(getdetails[0][0]), ottstatus = '', updateottinvoice = '';
                            console.log('ottres:', ottres);
                            let ottResponse = JSON.parse(ottres.responce);
                            console.log('RefNo:', ottResponse.RefNo, '\nStatusCode:', ottResponse.StatusCode);
                            ottstatus = ottResponse['StatusCode'] == 9999 ? 2 : 3
                            updateottinvoice = `UPDATE ott.Ottinvoice oi SET oi.ottstatus=${ottstatus},oi.res_msg='${JSON.stringify(ottres)}',oi.res_date=NOW(),mby=${jwtott.id},mdate=NOW() WHERE oi.iolid='${d.iolid}' `;
                            updateottinvoice = await conn.query(updateottinvoice);
                            if (updateottinvoice[0]['affectedRows'] > 0) {
                                await conn.commit();
                                erroraray.push({ msg: ottres, error_msg: ottstatus });
                            } else {
                                console.log('Cannot Update Status In Invoice.....');
                                await conn.rollback();
                            }
                        };
                        if(getdetails[0][0]['ott_vendor'] == 2){
                            let ottdata = getdetails[0][0]
                           let ottres = await PlayBoxottSubscription(ottdata),ottstatus='';
                            console.log('ottresponse', ottres);
                            // ottResponse = ottres;
                            ottstatus = ottres['message'] == 'Pack assigned successfully.' ? 2 : 3;
                            console.log('ottres:', ottres['message'], 'Status', 'Status', ottstatus);
                            if (ottstatus != '') {
                               let updateottinvoice = ` UPDATE ott.Ottinvoice oi SET oi.mobile='${ottdata.mobile}',oi.ottstatus=${ottstatus},oi.res_msg='${JSON.stringify(ottres)}',oi.res_date=NOW(),ott_vendor =2 WHERE oi.iolid='${ottdata.iolid}' `;
                                updateottinvoice = await conn.query(updateottinvoice);
                                if (updateottinvoice[0]['affectedRows'] > 0) {
                                    await conn.commit();
                                    if(ottstatus == 2){
                                        let expdate = ottres.expiryAt.split('.')[0]
                                        let updateUserExpiry  = ` UPDATE ott.ottUsers SET expirydate='${expdate}',ottexpirydate='${expdate}' WHERE 
                                        invid =${ottdata.iolid} AND id = ${ottdata.uid}`
                                        updateUserExpiry = await conn.query(updateUserExpiry);
                                        if(updateUserExpiry[0]['affectedRows'] > 0){
                                            await conn.commit()
                                        }else{
                                            console.log('Error While updating user table');
                                            await conn.rollback()
                                        }
                                    }
                                } else {
                                    console.log('Cannot Update Status In Invoice.....');
                                    await conn.rollback();
                                }
                            }
                        }


                    }
                    if (getdetails[0][0]['ottstatus'] == 2) {
                        erroraray.push({ msg: 'Subscription Already Taken...', error_msg: 88888 });
                        console.log('Subscription Already Taken...');
                        await conn.rollback();
                    }
                } else {
                    erroraray.push({ msg: 'No Record Found...', error_msg: 88888 });
                    console.log('No Record Found...')
                    await conn.rollback();
                }
            } catch (e) {
                erroraray.push({ msg: 'Internal Error please try later ', error_msg: 88888 });
                console.log('Internal Error ', e)
                await conn.rollback();
            }
        } else {
            console.log('Connection Error.');
        }
        if (conn_status == 1) {
            conn.release();
            console.log('recheck Ott Status SubScription Connection Released.', conn_status);
        } else {
            console.log('recheck Ott Status SubScription Connection Not Done.', conn_status);
        }
        return resolve(erroraray)
    });
}
oper.post('/recheckOttStatus', async (req, res) => {            // Recheck OTT SubScription Single
    req.setTimeout(10000);
    let result = await recheckOttStatus(req);
    console.log("recheckOttStatus Result", result);
    res.end(JSON.stringify(result));
});

oper.post('/ottrenewal', async (req, res) => {
    req.setTimeout(10000);
    // console.log('result----', req.body);
    let result = await ottrenewal(req);
    console.log("OTT Renewal Result", result);
    res.end(JSON.stringify(result));
});

async function delay(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = oper;