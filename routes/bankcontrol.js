async function bankhtml(d,res) {
    return new Promise(async (resolve, reject) => {
        console.log('data', d)
        if (d.gwid == 1) {
            // let hash = `${d.mid}|${d.orderID}|${d.amt}|TypeField1|SecurityID|TypeField2|txtadditional1|txtadditional2|txtadditional3|txtadditional4|txtadditional5|txtadditional6|txtadditional7|RU|CU|`
            let hash = Buffer.from(`${d.mid}|${d.orderID}|${d.amt}|test|${d.name}|${d.email}|${d.mobile}|anyemi|NA|NA|NA|NA|NA|NA|NA|NA|NA|NA|NA|${d.SUrl}|${d.FUrl}`).toString('base64')
            console.log('hash value without Base64 :   ', `${d.mid}|${d.orderID}|${d.amt}|NA|NA|${d.email}|${d.mobile}|NA|NA|NA|NA|NA|NA|${d.SUrl}|${d.FUrl}`)
            console.log('Base64 hash value:  ', hash);

            let ldata = '<html><head><title>Easy EMI Checkout..</title></head><body><center><h1>Please do not refresh this page...</h1></center>' +
                '<form method="post" action="' + d.payurl + '" name="f1" id="f1">' +
                '<input type="text" name="msg" value="' + hash + '" />' +
                '</form><script type="text/javascript">document.f1.submit();</script></body></html>'
            resolve({ ldata: ldata, error_status: 0 });
            // resolve({ url:d.payurl,hash:hash, error_status: 0 });

         }
    });
}

module.exports.bankhtml = bankhtml;


 