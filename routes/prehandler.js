var jwt = require('jsonwebtoken'),
    privateKey = require('./config'),
    pool = require('../connection/connection');


module.exports = async (req, res, next) => {
    var sqlquery;
    pool.getConnection(async (err, con) => {
        if (err) {
            console.log(err);
            return res.json({
                msg: 'Please Try After Sometimes',
                status: 0
            });
        } else {
            const auth = req.headers.authorization || req.headers.Authorization;
            // console.log('token',auth);
            // For Decode
            try {
                let decoded = await jwt.verify(auth, privateKey, {
                    algorithm: ['HS512']
                });
                // console.log('Decoded', decoded);
                req.ott_data = decoded;
                if (decoded.role == 111) sqlquery = 'SELECT EXISTS(SELECT * FROM ott.ottUsers WHERE id=' + decoded.id + ' AND token="' + auth + '")AS count';
                else sqlquery = ' SELECT EXISTS(SELECT * FROM ott.managers WHERE `mid`=' + decoded.id + ' AND token="' + auth + '")AS count';
                // console.log(sqlquery)
                var sql = con.query(sqlquery, (err, result) => {
                    // console.log(sql.sql)
                    con.release();
                    if (err) {
                        console.log(err)
                        return res.json({
                            msg: 'Please try after sometime',
                            status: 0
                        });
                    } else {
                        if (result[0].count != 0) {
                            console.log("Session Success")
                            next();
                        } else {
                            console.log("Session Failed due to another logged In")     // Single Login .................
                            return res.status(401).send({
                                msg: 'User Not Autheticated',
                                status: 401,
                            });
                        }
                    }
                })

            } catch (e) {                  // Token Expiration...........................
                con.release();
                console.log('Inside prehandler Catch........ Token Expired......',e)
                return res.status(401).send({
                    msg: 'Token is Expired',
                    status: 401,
                    restore: true
                });
            }
        }
    });
}

