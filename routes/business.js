"use strict"
const express = require('express'),
    compress = require('compression'),
    bus = express.Router(),
    pool = require('../connection/connection'),
    poolPromise = require('../connection/connection').poolPromise;
const multer = require('multer');
const schema = require('../schema/schema');
const errorFunction = require('../handler/errorFunction');
const errorHandler = require('../handler/errorHandler');
const getImage = require('../handler/getFile');

bus.use(compress());

bus.post('/listbusiness', (req, res, err) => {
    const ott_data = req.ott_data;
    var data = req.body, sql, sqlquery, sqlc, value = [], sqldata = '';
    sqlquery = ' SELECT m.*,s.name sname,d.name dname FROM ott.`managers` m LEFT JOIN ott.`states` s ON m.state=s.id ' +
        ' LEFT JOIN ott.`districts` d ON d.id=m.city WHERE m.role !=999  ';
    sqlc = ' SELECT COUNT(*) tot FROM ott.`managers` m LEFT JOIN ott.`states` s ON m.state=s.id ' +
        ' LEFT JOIN ott.`districts` d ON d.id=m.city WHERE m.role !=999  ';

    if (data.hasOwnProperty('role') && data.role) {
        sqldata += ' AND m.role =' + data.role
    }
    if (data.hasOwnProperty('bname') && data.bname) {
        sqldata += ' AND m.mid =' + data.bname
    }
    if (data.hasOwnProperty('profile_id') && data.profile_id) {
        sqldata += ' AND m.mid =' + data.profile_id
    }
    if (data.hasOwnProperty('sharetype') && data.sharetype) {
        sqldata += ' AND m.share_type =' + data.sharetype
    }
    if (data.hasOwnProperty('status') && data.status) {
        sqldata += ' AND m.status =' + data.status
    }
    if (sqldata) {
        sqlquery += sqldata;
        sqlc += sqldata;
    }
    if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
        sqlquery += ' LIMIT ' + data.index + ', ' + data.limit;
    }
    console.log('List Manager Data', data);
    console.log('List Manager Query', sqlquery)
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

async function addBusiness(req) {
    return new Promise(async (resolve, reject) => {
        var data = req.body, sql, sqlquery, errorarray = [], status1 = false;
        let conn = await poolPromise.getConnection();
        if (conn) {
            try {
                console.log('Add Business Data===', data);
                await conn.beginTransaction();
                let bname = data.business_name,
                    userid = data.login,			// Manager ID(Login ID)
                    gender = data.gender,
                    fname = data.fname,
                    Password = data.password,				// Login Password
                    psw = data.pswd,			//MD5 Password
                    email = data.email,
                    mobile = data.mobile,				// Mobile Number
                    phone_num = data.phone,			// Phone Number
                    gstno = data.gstno,
                    city = data.district,
                    state = data.state,
                    address = data.address,
                    share_type = data.share,
                    pincode = data.pincode,
                    status = data.active == true ? 1 : 0,
                    resel_under = data.re_type,
                    resel1 = data.d1_type,
                    role = data.role, dist = data.dis_type, sub_dist = data.sub1,
                    pgid = data.pgid ? data.pgid : 0;

                sql = ` SELECT EXISTS(SELECT * FROM ott.managers WHERE bname = '${bname}' ) count `;
                let resultc = await conn.query(sql);
                if (resultc[0][0]['count'] != 0) {
                    errorarray.push({ msg: `${bname} BusinessName already exists`, error_msg: 79 })
                    await conn.rollback();
                } else {
                    let suserid = ` SELECT EXISTS ( SELECT * FROM ott.managers WHERE userid = '${userid}' UNION 
                  SELECT * FROM ott.ottUsers WHERE profileid ='${userid}' ) count `
                    suserid = await conn.query(suserid)
                    if (suserid[0][0].count != 0) {
                        errorarray.push({ msg: `${userid} LoginId already exists`, error_msg: 84 })
                        await conn.rollback();
                    } else {
                        if (share_type == 2) {   // Sharing
                            try {
                                let sresult;
                                if (role == 777) sresult = await shareLimit(100, data.dshare, data.isp)   // Distributor 
                                if (role == 666) sresult = await shareLimit(100, data.isp, data.dshare, data.sub_share) // Sub-Distributor
                                if (resel_under == 0 && role == 555) sresult = await shareLimit(100, data.isp, data.reseller_share) // Reseller Under None
                                if (resel_under == 1 && role == 555) sresult = await shareLimit(100, data.isp, data.dshare, data.reseller_share) // Reseller Under Dist
                                if (resel_under == 2 && role == 555) sresult = await shareLimit(100, data.isp, data.dshare, data.sub_share, data.reseller_share) // Reseller Under SubDist
                                console.log('Share Result---', sresult)
                            } catch (e) {
                                status1 = true;
                                console.log('Error', e)
                                errorarray.push({ msg: 'Please Provide Valid share', error_msg: 85 })
                                await conn.rollback();
                            }
                        }
                        if (!status1) {
                            sqlquery = ` INSERT INTO ott.managers SET bname =TRIM('${bname}'),userid=LOWER(REPLACE('${userid}'," ","")),psw='${psw}',fname='${fname}',address='${address}'
                                ,gender=${gender},gstno='${gstno}',mobile=${mobile},email='${email}',state=${state},city=${city},status=${status} `

                            if (phone_num) sqlquery += ` ,phone=${phone_num} `
                            if (pgid) sqlquery += ` ,pgid=${pgid} `
                            console.log('Swithch', role, resel_under);

                            switch (role) {
                                case 1:
                                case '1':
                                    sqlquery += ` ,role= 777`;
                                    if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},dshare=${data.dshare} `
                                    break;
                                case '2':
                                case 2:
                                    sqlquery += ` ,role =666,under_man=1,dmid=${dist} `
                                    if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},dshare=${data.dshare},sdshare=${data.sub_share} `
                                    break;
                                case 3:
                                case '3':
                                    if (resel_under == 1) {
                                        sqlquery += ` ,role =555,under_man=0`
                                        if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},mshare=${data.reseller_share}`
                                    }
                                    if (resel1 == 1 && resel_under == 2) {
                                        sqlquery += ` ,role =555,under_man=1,dmid=${dist} `
                                        if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},dshare=${data.dshare},mshare=${data.reseller_share} `
                                    }
                                    if (resel1 == 2 && resel_under == 2) {
                                        sqlquery += ` ,role =555,under_man=2,dmid=(SELECT m.dmid FROM ott.managers m WHERE m.mid =${sub_dist}),sdmid=${sub_dist} `
                                        if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},dshare=${data.dshare},sdshare=${data.sub_share},mshare=${data.reseller_share} `
                                    }
                                    break;

                                default:
                                    console.log('Default', role, resel_under, resel1)
                                    break;
                            }

                            console.log('Business Insert Query : ', sqlquery);
                            let result = await conn.query(sqlquery);
                            if (result[0]['affectedRows'] > 0 && result[0]['insertId'] > 0) {
                                errorarray.push({ msg: `${bname} Added Successfully`, error_msg: 0, id: result[0]['insertId'] })
                                await conn.commit();
                            } else {
                                errorarray.push({ msg: 'Please Try After Sometime', error_msg: 90 })
                                await conn.rollback();
                            }
                        }
                    }
                }
                console.log("connection Closed");
            } catch (e) {
                console.log('Connection Error ', e)
                errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });
                await conn.rollback();
            }
        } else errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' });

        conn.release();
        console.log('Return Value----', errorarray);
        return resolve(errorarray);
    });
}

bus.post('/addBusiness', schema.addBusValidate(), schema.validate, async (req, res) => {
    req.setTimeout(864000000);
    console.log(req.body)
    let result = await addBusiness(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});

bus.post('/uploadLogo', function (req, res) {       // Initial Upload BusinessLogo && Update Logo
    var erroraray = [], data, sqlquery, file;
    upload(req, res, function (err) {
        if (err) {
            console.log("Error uploading file.", err)
            erroraray.push({ msg: "Upload Failed", error_msg: '125' });
            res.end(JSON.stringify(erroraray));
        } else {
            data = req.body, file = req.files;
            console.log("Request.", req.body, file)
            console.log("Request Files .", file.length)
            let filename = `${file[0].filename}`;
            sqlquery = ` UPDATE ott.managers SET manlogo= '${filename}'  WHERE mid =${data.id} `
            console.log("Update Logo Query.", sqlquery)
            pool.getConnection(function (err, conn) {
                if (err) {
                    console.log('Connection Error---')
                } else {
                    let sql = conn.query(sqlquery, function (err, result) {
                        conn.release();
                        if (!err) {
                            if (result.affectedRows > 0) {
                                erroraray.push({ msg: "Succesfully Added", error_msg: 0 });
                                console.log("File is uploaded.")
                                res.end(JSON.stringify(erroraray));
                            } else {
                                console.log("File Not uploaded.", err)
                                erroraray.push({ msg: "Upload Failed", error_msg: '135' });
                                res.end(JSON.stringify(erroraray));
                            }
                        } else {
                            console.log("File Not uploaded.", err)
                            erroraray.push({ msg: "Upload Failed", error_msg: '141' });
                            res.end(JSON.stringify(erroraray));
                        }
                    });

                }
            });

        }
    });
});

bus.post('/getBusinessEdit', function (req, res) {
    pool.getConnection(function (err, conn) {
        var sql, data = req.body,
            sqlquery = ' SELECT m.* FROM ott.`managers` m WHERE m.mid = ?  '
        if (err) {
            console.log('err');
        } else {
            sql = conn.query(sqlquery, data.id, function (err, result) {
                // console.log(sql.sql)
                console.log('connection Closed.');
                conn.release();
                if (!err) {
                    res.json(result[0]);
                }
            });
        }
    });
});

async function editBusiness(req) {
    return new Promise(async (resolve, reject) => {
        var data = req.body, sql, sqlquery, errorarray = [], status1 = false;
        let conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Edit Business Data===', data);
            await conn.beginTransaction();
            try {
                let bname = data.business_name,
                    userName = data.login,			// Manager ID(Login ID)
                    gender = data.gender,
                    fname = data.fname,
                    email = data.email,
                    mobile = data.mobile,				// Mobile Number
                    phone = data.phone,			// Phone Number
                    gst_no = data.gstno,
                    city = data.district,
                    state = data.state,
                    address = data.address,
                    share_type = data.share,
                    pincode = data.pincode,
                    status = data.active == true ? 1 : 0,
                    resel_under = data.re_type,
                    resel1 = data.d1_type,
                    role = data.role, dist = data.dis_type, sub_dist = data.sub1,
                    pgid = data.pgid ? data.pgid : 0;

                sql = ` SELECT EXISTS(SELECT * FROM ott.managers WHERE mid = '${data.id}' ) count `;
                let resultc = await conn.query(sql);
                if (resultc[0][0]['count'] == 0) {
                    errorarray.push({ msg: `${userName} Not Found`, error_msg: 228 })
                    await conn.rollback();
                } else {
                    if (share_type == 2) {   // Sharing
                        try {
                            let sresult;
                            if (role == 777) sresult = await shareLimit(100, data.dshare, data.isp)   // Distributor 
                            if (role == 666) sresult = await shareLimit(100, data.isp, data.dshare, data.sub_share) // Sub-Distributor
                            if (resel_under == 0 && role == 555) sresult = await shareLimit(100, data.isp, data.reseller_share) // Reseller Under None
                            if (resel_under == 1 && role == 555) sresult = await shareLimit(100, data.isp, data.dshare, data.reseller_share) // Reseller Under Dist
                            if (resel_under == 2 && role == 555) sresult = await shareLimit(100, data.isp, data.dshare, data.sub_share, data.reseller_share) // Reseller Under SubDist
                            console.log('Share Result---', sresult)
                        } catch (e) {
                            status1 = true;
                            console.log('Error', e)
                            errorarray.push({ msg: 'Please Provide Valid share', error_msg: 85 })
                            await conn.rollback();
                        }
                    }
                    if (!status1) {
                        let sqlupdate = ` UPDATE ott.managers SET sharetype = 1,under_man=0,dmid=0,sdmid=0,bshare=0,dshare=0,mshare=0 WHERE mid =${data.id} `
                        sqlupdate = await conn.query(sqlupdate);
                        sqlquery = ` UPDATE ott.managers SET bname =TRIM('${bname}'),fname='${fname}',address='${address}'
                        ,gender=${gender},gstno='${gst_no}',mobile=${mobile},email='${email}',state=${state},city=${city},status=${status} `

                        if (phone) sqlquery += ` ,phone=${phone} `
                        if (pgid) sqlquery += ` ,pgid=${pgid} `
                        switch (role) {
                            case 1:
                            case '1':
                                sqlquery += ` ,role= 777`;
                                if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},dshare=${data.dshare} `
                                break;
                            case '2':
                            case 2:
                                sqlquery += ` ,role =666,under_man=1,dmid=${dist} `
                                if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},dshare=${data.dshare},sdshare=${data.sub_share} `
                                break;
                            case 3:
                            case '3':
                                if (resel_under == 1) {
                                    sqlquery += ` ,role =555,under_man=0`
                                    if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},mshare=${data.reseller_share}`
                                }
                                if (resel1 == 1 && resel_under == 2) {
                                    sqlquery += ` ,role =555,under_man=1,dmid=${dist} `
                                    if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},dshare=${data.dshare},mshare=${data.reseller_share} `
                                }
                                if (resel1 == 2 && resel_under == 2) {
                                    let sdistId = ` SELECT m.dmid FROM ott.managers m WHERE m.mid =${sub_dist} `
                                    let [[distId]] = await conn.query(sdistId)
                                    sqlquery += ` ,role =555,under_man=2,dmid=${distId.dmid},sdmid=${sub_dist} `
                                    if (share_type == 2) sqlquery += ` ,sharetype=${share_type},bshare=${data.isp},dshare=${data.dshare},sdshare=${data.sub_share},mshare=${data.reseller_share} `
                                }
                                break;

                            default:
                                console.log('Default', role, resel_under, resel1)
                                break;
                        }


                        sqlquery += ` WHERE mid = ${data.id} `
                        console.log('Business Update Query : ', sqlquery);
                        let result = await conn.query(sqlquery);
                        if (result[0]['affectedRows'] > 0) {
                            await conn.commit();
                            errorarray.push({ msg: 'Updated Successfully', error_msg: 0 })
                        } else {
                            errorarray.push({ msg: 'Please Try After Sometime', error_msg: 90 })
                            await conn.rollback();
                        }
                    }
                }
            } catch (e) {
                console.log('Error ', e)
                errorarray.push({ msg: 'Please Try After Sometime', error_msg: 'CONN' })
                await conn.rollback();
            }
            conn.release();
            console.log("connection Closed");
        } else {
            return;
        }
        console.log('Return Value----', errorarray);
        return resolve(errorarray);
    });
}

bus.post('/editBusiness', schema.editBusValidate(), schema.validate, async (req, res) => {
    req.setTimeout(864000000);
    let result = await editBusiness(req);
    console.log("process completed");
    res.end(JSON.stringify(result));
});


async function getIspLogo(data) {
    return new Promise(async (resolve, reject) => {
        console.log(data.id)
        var sqlquery, imageName, img_result;
        img_result = { isp_logo: '' };
        let conn = await poolPromise.getConnection();
        if (conn) {
            console.log('Data===', data);
            await conn.beginTransaction();
            try {
                sqlquery = ' SELECT mid,manlogo FROM ott.managers WHERE mid =' + data.id
                console.log("Get IspLogo Qwery", sqlquery)
                let result = await conn.query(sqlquery)

                if (result[0][0].manlogo) {
                    imageName = [{
                        key: 'ManLogo',
                        fileName: `${data.id}/${result[0][0].manlogo}`
                    }];
                    const element = imageName[0]
                    img_result[element.key] = await getImage(element.fileName, element.key)
                } else {
                    console.log('Image Not Upload')
                }
            } catch (e) {
                console.log('Inside Catch', e)
            }
            conn.release();
            if (img_result) {
                return resolve(img_result)
            } else {
                return resolve({ error: true, msg: 'Image Not Found' })
            }
        } else {
            console.log("Connection Failed")
            return
        }
    });
}

bus.get('/getIspLogo', async (req, res) => {
    req.setTimeout(864000000);
    const url = require('url');
    const url_parts = url.parse(req.url, true);
    const query = url_parts.query;
    console.log('Get Logo', query);
    let resp = await getIspLogo(query);
    if (resp.error) {
        return res.end(JSON.stringify(resp));
    }
    res.end(JSON.stringify(resp));
});



async function shareLimit(limit, ...values) {
    return new Promise((resolve, reject) => {
        let sum = values.reduce((a, b) => a + b);
        console.log('Sumof Values', sum);
        if (limit == sum) return resolve(true)
        else return reject(false);
    })
}

bus.post('/showDistributor', function (req, res) {
    const ott_data = req.ott_data;
    let data = req.body, sqlquery, sql, where = [];
    console.log(data)
    sqlquery = ' SELECT mid,userid,bname,mamt FROM ott.managers '
    if (data.type == 1) where.push(' role = 777')  // distributor
    if (data.type == 2) where.push(' role = 666')  // SUb-distributor
    if (data.type == 4) where.push(' role IN (777,666,555)')   // For PackageMapping & Search Reseller's
    if (data.type == 3) where.push(' role = 555') // Reseller
    if (data.hasOwnProperty('role') && data.role) {
        where.push(' role =' + data.role + '')
    }
    if (data.hasOwnProperty('like') && data.like != '') where.push(' bname LIKE "%' + data.like + '%"')
    if (data.hasOwnProperty('u_like') && data.u_like != '') where.push(' userid LIKE "%' + data.u_like + '%"')

    sqlquery += where.length > 0 ? 'WHERE' + where.join(' AND ') : ''
    console.log('ShowQuery', sqlquery)
    pool.getConnection((err, conn) => {
        if (err) res.json(err)
        else {
            sql = conn.query(sqlquery, (err, result) => {
                conn.release();
                if (err) res.json(err)
                else res.json(result)
            })
        }
    })
});


// Find DiskStorage To Upload Files
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        console.log(file.originalname, 'file', file)
        let namefile = file.originalname.split('-')[0], folder_status = false;
        const fs = require("fs")
        const filename = namefile
        const imagePath = `${__dirname}/../Documents/ManLogo/${filename}`;
        //! fs.exists() is deprecated so use fs.existsSync()
        /* 
        fs.exists(imagePath, exists => {
            if (exists) {
                folder_status = true
                console.log(" Directory Already created.")
            } else {
                folder_status = true
                fs.mkdir(imagePath, { recursive: true }, function (err) {
                    if (err) {
                        console.log(err)
                    } else { console.log("New directory successfully created.") }
                })
            }
            if (folder_status) { callback(null, imagePath); }
        });
        */

        if (fs.existsSync(imagePath)) {
            folder_status = true
            console.log(" Directory Already created.")
            if (folder_status) { callback(null, imagePath); }
        } else {
            folder_status = true
            fs.mkdir(imagePath, { recursive: true }, function (err) {
                if (err) {
                    console.log(err)
                } else { console.log("New directory successfully created.") }
            });
            if (folder_status) { callback(null, imagePath); }
        }
    },
    filename: function (req, file, callback) {
        console.log('Filename', file.originalname)
        let nowdate = new Date();
        let edate = ((nowdate).toISOString().replace(/T/, '-').replace(/\..+/, '')).slice(0, 16);
        let file_name = file.originalname.split('-')[1]
        callback(null, file_name + '-' + nowdate.toISOString().slice(0, 10) + '.' + 'png')
    }
})

const upload = multer({ storage: storage }).array('file', 4)





module.exports = bus;
