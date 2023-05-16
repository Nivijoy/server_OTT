"use strict";
var express = require('express'),
  gltvapi = express(),
  compress = require('compression'),
  poolPromise = require('../connection/connection').poolPromise,
  pool = require('../connection/connection');
const { json } = require('body-parser');
const { fs } = require('fs');
let conf = require('../utility/config'),
  request = require('request'),
  util = require('util')
const rp = util.promisify(request);

gltvapi.use(compress());

async function pbcheckavapack(req,res) {
  const getpartnerpack = await rp({ 'method': 'GET', 'url': conf.playbox.getplan + conf.playbox.pkey + '/packs', 'headers': { 'Content-Type': 'application/json', 'x-api-key': conf.playbox.AuthKey } });
  return res.end(getpartnerpack.body);
}
async function PlayBoxottSubscription(d) {
  const getPlayBoxSubscription = await rp({ 'method': 'POST', 'url': conf.playbox.planactivation, 'json': { "phone": d.mobile, "partnerKey": conf.playbox.pkey, "packCode": d.ottplancode }, 'headers': { 'Content-Type': 'application/json', 'x-api-key': conf.playbox.AuthKey } });
  console.log('playbox subscription response', getPlayBoxSubscription.body);
  const presult =  getPlayBoxSubscription.body;
  console.log('presult--------------------------', presult);
  return presult;
}

const ottSubscription = async (d) => {
  console.log('ottSubscription :', d);
  if (d) {
    return new Promise((resolve, reject) => {
      (async () => {
        let refid = '', oid = ('0000000000' + d.iolid).slice(-10), email = d.emailverify == 1 ? d.email : ''
          , date = Math.floor(new Date().getTime()), DIM = (19800) * 1000             // 5:30 H:M 
        refid = 'BLSSOTT' + oid
        var myDate = new Date((Math.floor(new Date(date + DIM).getTime())));
        date = (('0' + myDate.getDate()).slice(-2) + '-' + ('0' + (myDate.getMonth() + 1)).slice(-2) + '-' + myDate.getFullYear());
        console.log('date:', date);
        let bodydate = JSON.stringify({
          "VendorCode": conf.ottapi.vendorCode,
          "CustMobileNo": "91" + d.mobile,
          "Plan": d.ottplancode,
          "Email": email,
          "RefNo": refid,
          "planMrp": "",
          "ISPPlanName": d.ottpackname,
          "StartDate": date,
          "IsAddon": "N",
          "OperatorCode": "",
          "UserName": d.profileid
        })
        console.log('bodydate:', bodydate);
        const rp = util.promisify(request);
        const response = await rp({ 'method': 'POST', 'url': conf.ottapi.getsubscription, 'headers': { 'Authorization': conf.ottapi.AuthKey, 'Content-Type': 'application/json' }, body: bodydate });
        if (response.body) {
          console.log('OTT Response Body', response.body);
          resolve({ refid: refid, responce: response.body, invid: d.iolid });
        }
        if (response.error) {
          console.log('response', response.error);
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
            // let ottres = await ottSubscription(ottdata), ottstatus = '', updateottinvoice = '';
            // console.log('ottres:', ottres);
            // console.log('vendorrr',ottdata.ott_vendor);
            // {"CustMobileNo":"918501091111","RefNo":"8501091111BLSSPL","GID":"001b9e486e","Plan":"1S","StatusCode":"9999","Errmsg":"Customer Registered and Subscribed Succesfully."}
            // console.log('RefNo:', ottres.RefNo, '\nStatusCode:', ottres.StatusCode);
            // let ottResponse = JSON.parse(ottres.responce);
            // ottstatus = ottResponse.StatusCode == 9999 ? 2 : 3

            // updateottinvoice = ` UPDATE ott.Ottinvoice oi SET oi.ottstatus=${ottstatus},oi.res_msg='${JSON.stringify(ottres)}',oi.res_date=NOW() WHERE oi.iolid='${ottdata.iolid}' `;
            // updateottinvoice = await conn.query(updateottinvoice);
            // if (updateottinvoice[0]['affectedRows'] > 0) {
            //   await conn.commit();
            // } else {
            //   console.log('Cannot Update Status In Invoice.....');
            //   await conn.rollback();
            // }
            let ottres = '', ottstatus = '', updateottinvoice = '', ottResponse = '', ott_vendor = '';
            console.log('ottres:', ottres);
            console.log('vendorrr', ottdata.ott_vendor);

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
              console.log('vendorrr', ottdata.ott_vendor);
              // // Step 1 check OTT Pack is available or not 
              // let getpartnerpack = await pbcheckavapack(), packava = '';
              // console.log('Get Packkk---------------------', getpartnerpack.body);
              // getpartnerpack = JSON.parse(getpartnerpack.body);
              // // console.log('getpartnerpack : ', getpartnerpack);
              // if (getpartnerpack.statusCode == 200) {
              //   let presult = getpartnerpack.result;
              //   packava = presult.find(o => o.packs_id === ottdata.ottplancode);
              //   packava = packava == null ? 'NA' : packava;
              //   console.log('Available pack Details', packava);
              //   // check pack available or not
              // } else {
              //   // error or pack not available
              //   console.log('Currently Given Package Not Available. Pack Code : ', ottdata.ottplancode);
              //   ottres = { "message": "Currently Given Package Not Available.", "Pack_code": ottdata.ottplancode };
              //   // await conn.rollback();
              // }
              // if (packava == 'NA' && packava != '') {
              //   console.log('Currently Given Package Not Available. Pack Code : ', ottdata.ottplancode);
              //   ottres = { "message": "Currently Given Package Not Available.", "Pack_code": ottdata.ottplancode };
              //   // await conn.rollback();
              // }
              // if (packava != 'NA' && packava != '') {
                // send activation details.
                // Step 3 Activate subscription.
                ottres = await PlayBoxottSubscription(ottdata);
                console.log('ottresponse', ottres);
                // ottResponse = ottres;
                ottstatus = ottres['message'] == 'Pack assigned successfully.' ? 2 : 3;
                console.log('ottres:', ottres['message'], 'Status', 'Status', ottstatus);

              // }

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
        FROM ott.Ottinvoice inv LEFT JOIN ott.ottUsers u ON inv.uid=u.id WHERE inv.ottstatus=1 AND inv.iolid=${invid} `
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
async function dist_renewal(m, gd, uid) {
  console.log('Dist Renewal');
  return new Promise(async (resolve, reject) => {
    var conn = await poolPromise.getConnection(), erroraray = [], addinv = ' INSERT INTO ott.Ottinvoice SET ott_vendor=' + gd.ott_vendor + ',busid=' + m.bid, update_ottusers = '', update_man = '', manstatus = false,
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

        addinv += ` ,uid=${uid},cby=${m.mid},mapid=${gd.mapid},supplier_gst_number='${m.gstno}',maptaxtype=${gd.maptaxtype},totinvamt=${totpackprice},totinvtaxamt=${tottaxamt} `

        console.log('ADD Inv :', addinv);

        addinv = await conn.query(addinv);
        console.log(addinv[0].affectedRows);
        if (addinv[0].affectedRows == 1) {
          console.log('INV ID:', addinv[0].insertId);

          update_ottusers += ` UPDATE ott.ottUsers SET packid=${gd.mapgltvpackid},inv_type=2,invid=${addinv[0].insertId},invdate=NOW(),expirydate=IF(${gd.mapgltvdaytype}=1,NOW() + INTERVAL ${gd.mapgltvdays} DAY,NOW() + INTERVAL ${gd.mapgltvdays} MONTH) `
          if (gd.mapotttype == 2) { update_ottusers += ` ,ottplancode='${gd.ottplanid}',ottplancode='${gd.ottplancode}',ott_platform='${gd.ottplatform}',ottexpirydate=IF(${gd.ottdayormonth}=1,NOW() + INTERVAL ${gd.ottdays} DAY,NOW() + INTERVAL ${gd.ottdays} MONTH) ` }
          update_ottusers += ` WHERE id=${uid}`
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
                    erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 238 });
                    await conn.rollback();
                  }
                } else {
                  erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 242 });
                  await conn.rollback();
                }
              } else {
                erroraray.push({ msg: 'TOP UP Your Account..', error_msg: 246 });
                await conn.rollback();
              }
            }
            if (manstatus) {
              erroraray.push({ msg: 'Account Activated..', error_msg: 0 });
              await conn.commit();
              ottSubs(addinv[0].insertId);
            } else {
              erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 255 });
              await conn.rollback();
            }
          } else {
            erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 259 });
            await conn.rollback();
          }
        } else {
          erroraray.push({ msg: 'Can Not Generate Invoice.. ', error_msg: 263 });
          await conn.rollback();
        }
      } catch (e) {
        erroraray.push({ msg: 'Internal Error please try later ', error_msg: 267 });
        console.log('Internal Error ', e)
        await conn.rollback();
      }
      conn.release();
      console.log('bus_ottuser Connection Closed...');
    } else {
      erroraray.push({ msg: 'Internal Error please try later ', error_msg: 274 });
      return;
    }
    console.log('bus_ottuser success--2\n', erroraray, '\n---------------------------------------');
    return resolve(erroraray);
  });
}
async function sub_dist_renewal(m, gd, uid) {
  console.log('SUb Dist Renewal');
  return new Promise(async (resolve, reject) => {
    var conn = await poolPromise.getConnection(), erroraray = [], addinv = ' INSERT INTO ott.Ottinvoice SET ott_vendor=' + gd.ott_vendor + ', busid=' + m.bid, update_ottusers = '', update_man = '', manstatus = false,
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
            erroraray.push({ msg: 'Check Sharing Percentage', error_msg: 347 });
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

        addinv += ` ,uid=${uid},cby=${m.mid},mapid=${gd.mapid},supplier_gst_number='${m.gstno}',maptaxtype=${gd.maptaxtype},totinvamt=${totpackprice},totinvtaxamt=${tottaxamt} `

        console.log('ADD Inv :', addinv);

        addinv = await conn.query(addinv);
        console.log(addinv[0].affectedRows);
        if (addinv[0].affectedRows == 1) {
          console.log('INV ID:', addinv[0].insertId);

          update_ottusers += ` UPDATE ott.ottUsers SET packid=${gd.mapgltvpackid},inv_type=2,invid=${addinv[0].insertId},invdate=NOW(),expirydate=IF(${gd.mapgltvdaytype}=1,NOW()+ INTERVAL ${gd.mapgltvdays} DAY,NOW()+ INTERVAL ${gd.mapgltvdays} MONTH) `
          if (gd.mapotttype == 2) { update_ottusers += ` ,ottplancode='${gd.ottplanid}',ottplancode='${gd.ottplancode}',ottexpirydate=IF(${gd.ottdayormonth}=1,NOW()+ INTERVAL ${gd.ottdays} DAY,NOW()+ INTERVAL ${gd.ottdays} MONTH) ` }
          update_ottusers += ` WHERE id=${uid}`
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
                let sqlquery = ' UPDATE ott.`managers` SET mamt =mamt - ' + Number(tottot_amt) + ' WHERE `mid`=' + m.mid + ' AND role=777;' //tax amount
                console.log(" Manager balance Update query\n\n", sqlquery);
                sqlquery = await conn.query(sqlquery);
                if (sqlquery[0].affectedRows == 1) {
                  let updatedist = ' UPDATE ott.`managers` SET mamt =mamt + ' + Number(gd.totdamt) + ' WHERE `mid`=' + m.mid + ' AND role=777;'
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
                        erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 401 });
                        await conn.rollback();
                      }
                    } else {
                      erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 405 });
                      await conn.rollback();
                    }
                  } else {
                    erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 409 });
                    await conn.rollback();
                  }
                } else {
                  erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 413 });
                  await conn.rollback();
                }
              } else {
                console.log('TOP UP Your Account..');
                erroraray.push({ msg: 'TOP UP Your Account..', error_msg: 418 });
                await conn.rollback();
              }
            }
            if (manstatus) {
              erroraray.push({ msg: 'Account Activated..', error_msg: 0 });
              await conn.commit();
              ottSubs(addinv[0].insertId);
              console.log('----------------------Inv ID Send TO OTTSUBS---------------------');
            }
          } else {
            erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 429 });
            await conn.rollback();
          }
        } else {
          erroraray.push({ msg: 'Can Not Generate Invoice.. ', error_msg: 433 });
          await conn.rollback();
        }
      } catch (e) {
        erroraray.push({ msg: 'Internal Error please try later ', error_msg: 437 });
        console.log('Internal Error ', e);
        await conn.rollback();
      }
      conn.release();
      console.log('sub_dist_renewal Connection Closed...');
    } else {
      erroraray.push({ msg: 'Internal Error please try later ', error_msg: 444 });
      return;
    }
    console.log(' sub_dist_renewal success--2\n', erroraray, '\n---------------------------------------');
    return resolve(erroraray);
  });
}
async function reseller_renewal(m, gd, uid) {
  console.log('Reseller');
  return new Promise(async (resolve, reject) => {
    var conn = await poolPromise.getConnection(), erroraray = [], addinv = ' INSERT INTO ott.Ottinvoice SET ott_vendor=' + gd.ott_vendor + ', busid=' + m.bid, update_ottusers = '', update_man = '', manstatus = false,
      totpackprice = 0, tottaxamt = 0, gltvamt = 0, gltvtaxamt = 0, ottamt = 0, otttaxamt = 0, gltvtot_amt = 0, otttot_amt = 0, tottot_amt = 0;
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
              addinv += `,dmid=${Number(m.dmid)},sdmid=${Number(m.sdmid)},mid=${Number(m.mid)}`;
            }
            console.log('\nGLTV TOTAL D Amt:', gltvtot_amt);
            console.log('OTT TOTAL D Amt:', otttot_amt);
            console.log('TOTAL TOTAL D Amt:', tottot_amt);
            addinv += `,beforedetection=${m.mamt},detectedamt=${tottot_amt}`;

          } else {
            erroraray.push({ msg: 'Check Sharing Percentage', error_msg: 505 });
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

        addinv += ` ,uid=${uid},cby=${m.mid},mapid=${gd.mapid},supplier_gst_number='${m.gstno}',maptaxtype=${gd.maptaxtype},totinvamt=${totpackprice},totinvtaxamt=${tottaxamt} `

        console.log('ADD Inv :', addinv);

        addinv = await conn.query(addinv);
        console.log(addinv[0].affectedRows);
        if (addinv[0].affectedRows == 1) {
          console.log('INV ID:', addinv[0].insertId);
          update_ottusers += ` UPDATE ott.ottUsers SET packid=${gd.mapgltvpackid},inv_type=2,invid=${addinv[0].insertId},invdate=NOW(),expirydate=IF(${gd.mapgltvdaytype}=1,NOW()+ INTERVAL ${gd.mapgltvdays} DAY,NOW() + INTERVAL ${gd.mapgltvdays} MONTH) `
          if (gd.mapotttype == 2) { update_ottusers += `,ottplancode='${gd.ottplanid}',ottplancode='${gd.ottplancode}',ottexpirydate=IF(${gd.ottdayormonth}=1,NOW()+ INTERVAL ${gd.ottdays} DAY,NOW() + INTERVAL ${gd.ottdays} MONTH) ` }
          update_ottusers += ` WHERE id=${uid}`
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
                  erroraray.push({ msg: 'Something Wrong Please Try Later.', error_msg: 559 });
                  await conn.rollback();
                } else {
                  let bal_data = [], invlogquery;
                  bal_data.push(['(' + m.bid, addinv[0].insertId, m.mid, m.mamt, tottot_amt, 1, m.mid, 555, 2 + ')'])
                  if (m.dmid != 0 && m.mdshare != 0) { bal_data.push(['(' + m.bid, addinv[0].insertId, m.dmid, m.dmamt, gd.totdamt, 2, m.mid, 555, 2 + ')']) }
                  if (m.sdmid != 0 && m.msdshare != 0) { bal_data.push(['(' + m.bid, addinv[0].insertId, m.sdmid, m.sdmamt, gd.totsdamt, 2, m.mid, 555, 2 + ')']) }
                  console.log('Invoice Balance Data : ', bal_data);
                  invlogquery = ' INSERT INTO ott.ott_inv_balance_log (busid,invid,manid,before_balance_amt,amt,rflag,cby,role,renewal_type) VALUES ' + ' ' + [bal_data] + ' '
                  console.log("InvoiceBalance Log query", invlogquery);
                  let logresult = await conn.query(invlogquery);
                  if (logresult[0]['affectedRows'] > 0) {
                    console.log("Invoice Balance Log Created Success");
                    manstatus = true;
                  } else {
                    console.log("Balance LOg Failed", 574);
                    erroraray.push({ msg: 'Internal Error', error_msg: 575 });
                    await conn.rollback();
                  }
                }
              } else {
                console.log('TOP UP Your Account..');
                erroraray.push({ msg: 'TOP UP Your Account..', error_msg: 581 });
                await conn.rollback();
              }
            }
            if (manstatus) {
              erroraray.push({ msg: 'Account Activated..', error_msg: 0 });
              await conn.commit();
              ottSubs(addinv[0].insertId);
            }
          } else {
            erroraray.push({ msg: 'Please Try After 5 MIN', error_msg: 591 });
            await conn.rollback();
          }
        } else {
          erroraray.push({ msg: 'Can Not Generate Invoice.. ', error_msg: 595 });
          await conn.rollback();
        }
      } catch (e) {
        erroraray.push({ msg: 'Internal Error please try later ', error_msg: 599 });
        console.log('Internal Error ', e)
        await conn.rollback();
      }
      conn.release();
      console.log('sub_dist_renewal Connection Closed...');
    } else {
      erroraray.push({ msg: 'Internal Error please try later ', error_msg: 606 });
      return;
    }
    console.log('sub_dist_renewal success--2\n', erroraray, '\n---------------------------------------');
    return resolve(erroraray);
  });
}
async function ottuser(m, ipdata) {
  return new Promise(async (resolve, reject) => {
    var conn = await poolPromise.getConnection(), erroraray = [], istatus = false, brole = m.role == 777 ? dist_renewal : m.role == 666 ? sub_dist_renewal : m.role == 555 ? reseller_renewal : '';
    if (conn) {
      // await delay(1000);
      await conn.beginTransaction();
      try {
        console.log('m DATA', m);
        console.log('INPUT DATA', ipdata);
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
        ,pkg.pack_id,map.gltvdaytype,map.gltvdays,pkg.packname,op.ottplanid,op.ottplan_name,op.ottplancode,op.ottplatform,op.dayormonth ottdayormonth,op.days ottdays,op.status opstatus

        FROM ott.managersallowedpack map LEFT JOIN ott.package pkg ON map.gltvpackid=pkg.pack_id
        LEFT JOIN ott.ottplan op ON op.ottplanid=map.ottpid WHERE map.id=${ipdata.gltvplancode} `

        console.log('getdetails :\n', getdetails);
        getdetails = await conn.query(getdetails);
        if (getdetails[0].length == 1) {
          // Check Validation and other conditions..
          let gd = getdetails[0][0], ioru_user = '';
          if (gd.opstatus == 1) {
            if (gd.mapapstatus == 1) {
              console.log('getdetails Result :', getdetails[0][0]);
              let checkottuser = ' SELECT u.*,IF(u.expirydate<NOW(),0,1) gltvexpstatus,IF(u.ottexpirydate<NOW(),0,1) ottexpstatus FROM ott.ottUsers u WHERE u.mobile="' + ipdata.mobile + '" '
              console.log('checkottuser :', checkottuser);
              checkottuser = await conn.query(checkottuser);
              console.log('checkottuser Count', checkottuser[0].length);
              if (checkottuser[0].length == 1) {                  // User EXISTS
                console.log('User Exit...');
                if (gd.mapotttype == 1 && checkottuser[0][0].gltvexpstatus == 0) {        // user expired
                  console.log('1:0');
                  let res = await brole(m, gd, checkottuser[0][0].id);
                  // console.log(res);
                  erroraray.push({ msg: res[0].msg, error_msg: res[0].error_msg });
                  // await conn.rollback();
                }
                if (gd.mapotttype == 1 && checkottuser[0][0].gltvexpstatus == 1) {        // user not Expired
                  console.log('Pack Not Expired...');
                  erroraray.push({ msg: 'Pack Not Expired...', error_msg: 677 });
                  await conn.rollback();
                }
                if (gd.mapotttype == 2 && checkottuser[0][0].gltvexpstatus == 0 && checkottuser[0][0].ottexpstatus == 0) {        // user expired
                  console.log('2:0:0');
                  let res = await brole(m, gd, checkottuser[0][0].id);
                  console.log(res);
                  erroraray.push({ msg: res[0].msg, error_msg: res[0].error_msg });
                  // await conn.rollback();
                }
                if (gd.mapotttype == 2 && (checkottuser[0][0].gltvexpstatus == 1 || checkottuser[0][0].ottexpstatus == 1)) {        // user not Expired
                  console.log('2:1:1');
                  console.log('Pack Not Expired...');
                  erroraray.push({ msg: 'Pack Not Expired...', error_msg: 690 });
                  await conn.rollback();
                }
              }
              if (checkottuser[0].length == 0) {          // User Not Available...
                console.log('User Not Available...');
                ioru_user += ` INSERT INTO ott.ottUsers SET busid=${m.mid},fullname='${ipdata.name}',profileid='${ipdata.profileid}',pwd='${ipdata.password}',user_pwd='${ipdata.user_pwd}'
            ,dob='1994-7-18',cdate=NOW(),mobile='${ipdata.mobile}',mobileverify=1,create_from=2 `

                if (ipdata.email != '' && ipdata.email != null) {
                  ioru_user += ` ,email='${ipdata.email}',emailverify=1 `
                }
                if (ipdata.gender) ioru_user += ` ,gender='${ipdata.gender}' `
                console.log('ioru_user -------------------\n', ioru_user);
                ioru_user = await conn.query(ioru_user);
                if (ioru_user[0].affectedRows == 1) {
                  await conn.commit();
                  console.log('OTT User ID', ioru_user[0].insertId);
                  let res = await brole(m, gd, ioru_user[0].insertId);
                  erroraray.push({ msg: res[0].msg, error_msg: res[0].error_msg });
                  await conn.rollback();
                } else {
                  erroraray.push({ msg: 'Can Not Create Account to "' + ipdata.mobile + '"', error_msg: 712 });
                  await conn.rollback();
                }
              }
            } else {
              erroraray.push({ msg: 'Assigned OTT PLAN Disabled..', error_msg: 717 });
              await conn.rollback();
            }
          } else {
            erroraray.push({ msg: 'GLTV OTT PLAN Not Available..', error_msg: 721 });
            await conn.rollback();
          }
        }
        if (getdetails[0].length > 1) {         // More than 1 Record Found
          console.log('More than 1 Record Found');
          erroraray.push({ msg: 'Contact Your Admin.', error_msg: 727 });
          await conn.rollback();
        }
        if (getdetails[0].length == 0) {      //  No Record Found
          console.log('No Record Found');
          erroraray.push({ msg: 'Contact Your Admin.', error_msg: 732 });
          await conn.rollback();
        }
      } catch (e) {
        erroraray.push({ msg: 'Internal Error please try later ', error_msg: 736 });
        console.log('Internal Error ', e)
        await conn.rollback();
      }
      conn.release();
      console.log('business renewal Connection Closed...');
    } else {
      erroraray.push({ msg: 'Internal Error please try later ', error_msg: 743 });
      return;
    }
    console.log('ottuser success--2\n', erroraray, '\n----------------------------------');
    return resolve(JSON.stringify(erroraray));
  });
}
async function activeaccount(req, res) {
  return new Promise(async (resolve, reject) => {
    var data = req.body, sql, erroraray = [], conn = await poolPromise.getConnection();
    console.log('Input DATA  : ', Object.keys(data).length);
    console.log('Input DATA : ', data.gltvidata);
    if (conn) {
      await delay(100);
      await conn.beginTransaction();
      try {
        // Decript Data
        if (Object.keys(data).length) {
          let d = data.gltvidata.toString('hex')
          console.log('INPUT DATA :', d);

          let idlen = Number(parseInt(d.slice(0, 4), 16) + 4);
          console.log('idlen :', idlen);
          let bid = d.slice(4, idlen)
          console.log('BUS ID IN HEX:', bid);
          bid = Buffer.from((d).slice(4, idlen), 'hex').toString('utf8')
          console.log('BUS ID:', bid);

          let keylen = Number(parseInt(d.slice(idlen, (idlen + 4)), 16) + 4);
          console.log('keylen :', keylen);
          let bkey = d.slice(Number(idlen + 4), Number(keylen + idlen))
          console.log('BUS KEY IN HEX:', bkey);
          bkey = Buffer.from((d).slice(Number(idlen + 4), Number(keylen + idlen)), 'hex').toString('utf8')
          console.log('BUS KEY:', bkey);
          let dd = Buffer.from(d.slice(Number(keylen + idlen)), 'hex')
          console.log(dd);
          var ipdata = JSON.parse(dd);
          console.log('OttUserData-----------------', ipdata)
          if (bid && bkey) {
            let getbusdetails = ` SELECT m.mid,m.mamt,m.sharetype msharetype,m.bshare mbshare,m.dshare mdshare,m.sdshare msdshare,m.mshare mmshare,(m.bshare+m.dshare+m.sdshare+m.mshare) mtotshare
                  ,m.bid,m.dmid,m.sdmid,m.role,IF(m.state=gs.state,1,0) statestatus,m.status mstatus,m.under_man,gs.bname,gs.amt,gs.address,gs.igst,gs.cgst,gs.sgst,gs.pan,gs.gstno,gs.servicetax,gs.hsn,gs.phone,gs.email
                  ,d.mamt dmamt,d.role drole ,sd.mamt sdmamt,sd.role sdrole
                  FROM ott.managers m LEFT JOIN ott.gltvsettings gs ON m.gltvid=gs.ottbid 
                  LEFT JOIN ott.managers d ON d.mid=m.dmid 
                  LEFT JOIN ott.managers sd ON sd.mid=m.sdmid WHERE m.busid='${bid}' AND m.key='${bkey}' `
            /*
                        let getbusdetails = ' SELECT m.mid,m.mamt,m.sharetype msharetype,m.bshare mbshare,m.dshare mdshare,m.sdshare msdshare,m.mshare mmshare,(m.bshare+m.dshare+m.sdshare+m.mshare) mtotshare ' +
                          ' ,m.bid,m.dmid,m.sdmid,m.role,IF(m.state=gs.state,1,0) statestatus,m.status mstatus,m.under_man,gs.bname,gs.`amt`,gs.`address`,gs.`igst`,gs.cgst,gs.sgst,gs.`pan`,gs.`gstno`,gs.servicetax,gs.`hsn`,gs.`phone`,gs.email ' +
                          ' FROM ott.`managers` m,ott.gltvsettings gs WHERE m.gltvid=gs.ottbid AND m.busid="' + bid + '" AND m.key="' + bkey + '" '
            */

            console.log('getbusdetails :', getbusdetails);
            getbusdetails = await conn.query(getbusdetails);
            if (getbusdetails[0].length == 1) {
              let m = getbusdetails[0][0], res = '';
              if (m.mstatus == 1) {
                res = await ottuser(m, ipdata);
                res=JSON.parse(res);
                console.log('activeaccount : ', res, '\n---------------\nmsg:', res[0].msg, '\n-----\nerror_msg:', res[0].error_msg);
                if (res) { erroraray.push({ msg: res[0].msg, error_msg: res[0].error_msg }); }
              } else {
                erroraray.push({ msg: 'Your Admin Account Has Been Disabled..', error_msg: 804 });
                await conn.rollback();
              }
            } else {
              console.log('No Business Found..');
              erroraray.push({ msg: 'You ID or Key Invalid..', error_msg: 808 });
              await conn.rollback();
            }
          }
        } else {
          console.log('NO InpUT DATA');
          erroraray.push({ msg: 'NO InpUT DATA', error_msg: 814 });
          await conn.rollback();
        }
      } catch (e) {
        erroraray.push({ msg: 'Internal Error please try later ', error_msg: 818 });
        console.log('Internal Error ', e)
        await conn.rollback();
      }
      conn.release();
      console.log('Active Account Connection Closed...');
    } else {
      erroraray.push({ msg: 'Internal Error please try later ', error_msg: 825 });
      return;
    }
    console.log('activeaccount success--2\n', erroraray,'\n------------------------------------------------');
    return res.end(JSON.stringify(erroraray));
  });
}
async function delay(ms) {
  return await new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { gltvapi, activeaccount, pbcheckavapack };