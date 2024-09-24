  let conf = require('../utility/config'),
  request = require('request'),
  util = require('util');
  const fs = require('fs');
const rp = util.promisify(request);
var privateKey = fs.readFileSync('/etc/nginx/ssl/crm.gltv.co.in.key', 'utf8');
var certificate = fs.readFileSync('/etc/nginx/ssl/cert.crt', 'utf8');
  async function pbcheckavapack() {
    const getpartnerpack = await rp({ 'method': 'GET', 'url': conf.playbox.getplan + conf.playbox.pkey + '/packs','key': privateKey,'cert': certificate,'headers': { 'Content-Type': 'application/json','x-api-key':conf.playbox.AuthKey } });
    // console.log(getpartnerpack.body);
    // return getpartnerpack;
let presult=JSON.parse(getpartnerpack.body);
presult=presult.result;
// console.log(presult);
    let packava = presult.find(o => o.packs_id ==='5590');
    packava=packava==null ? 'NA':packava;
    console.log(packava);
}

//{"statusCode":200,"message":"success","result":{"statusCode":400,"message":{}}}
// pbcheckavapack();


async function PlayBoxottSubscription() {
  const getpartnerpack = await rp({ 'method': 'POST', 'url': conf.playbox.planactivation,'json':{"phone":"8123556975","partnerKey":conf.playbox.pkey ,"packCode":"514"}, 'headers': { 'Content-Type': 'application/json','x-api-key':conf.playbox.AuthKey } });
  console.log(getpartnerpack.body);
  // return getpartnerpack;
  /*
  {
    phone: '8123556975',
    partnerCode: 'a8d75f4452e4df8ed737618de9217fa2b04a4994b30625d9919d5b9e13d0a77b3d39bfb570ddc64bf98df646c525f63bdf4c3b0a153ee74bb8f25c7dae9aa224',
    packCode: '514',
    pack_name: 'MONTHLY PLATINUM PLAN',
    validity: 30,
    soldAt: '2023-03-15T10:26:56.263Z',
    startAt: '2023-04-15T10:26:13.888Z',
    expiryAt: '2023-05-15T10:26:13.888Z',
    createdAt: '2023-03-15T10:26:56.259Z',
    otts: [
      {
        statusCode: 2,
        key: 'c1bbef5e2aa4578e2f5c14ecd215c307ad0a35aaa22051e51e8b30e935575947c98be880bc6897',
        ottCode: 1501,
        ottName: 'sonyliv'
      },
      {
        statusCode: 2,
        key: 'c1bbef5e2aa4578e2f5c14ecd215c307ad0a35aaa22051e51d8b30e935575947c98be880bc6897',
        ottCode: 1502,
        ottName: 'zee5'
      },
      {
        statusCode: 2,
        key: 'c1bbef5e2aa4578e2f5c14ecd215c307ad0a35aaa22051e51b8b30e935575947c98be880bc6897',
        ottCode: 1504,
        ottName: 'shemaroo'
      },
      {
        statusCode: 2,
        key: 'c1bbef5e2aa4578e2f5c14ecd215c307ad0a35aaa22051e51a8b30e935575947c98be880bc6897',
        ottCode: 1505,
        ottName: 'epic-on'
      },
      {
        statusCode: 2,
        key: 'c1bbef5e2aa4578e2f5c14ecd215c307ad0a35aaa22051e5198b30e935575947c98be880bc6897',
        ottCode: 1506,
        ottName: 'amazon prime'
      },
      {
        statusCode: 2,
        key: 'c1bbef5e2aa4578e2f5c14ecd215c307ad0a35aaa22051e51e952cee3458594aca8feb87b86c928e',
        ottCode: 1510,
        ottName: 'hungama'
      },
      {
        statusCode: 2,
        key: 'c1bbef5e2aa4578e2f5c14ecd215c307ad0a35aaa22051e51c9738f23359564ac78cef84bf68968bbf',
        ottCode: 15115,
        ottName: 'ALTBalaji'
      }
    ],
    message: 'Pack assigned successfully.'
  }
  */
}

// PlayBoxottSubscription()



async function CheckSubscription() {
  const getpartnerpack = await rp({ 'method': 'GET', 'url': conf.playbox.getsubscription+ conf.playbox.pkey + '&phone=8123556975', 'headers': { 'Content-Type': 'application/json','x-api-key':conf.playbox.AuthKey } });
  let presult=JSON.parse(getpartnerpack.body);
  console.log(presult);
  // return getpartnerpack; 
}

// CheckSubscription()