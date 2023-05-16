"use strict";
var express = require('express'),
	compress = require('compression'),
	select = express.Router(),
	pool = require('../connection/connection');
const { validationResult } = require('express-validator');


select.post('/showState', function (req, res, err) {  // show State
	pool.getConnection(function (err, conn) {
		var data = req.body, where = [],
			sqlquery = 'SELECT id,`name` FROM ott.states';
		console.log("show State Data", data);

		if (data.hasOwnProperty('like') && data.like != '') {
			where.push('`name` LIKE "%' + data.like + '%"');
		}
		if (where.length > 0) {
			sqlquery += " where " + where.join(' AND ')
		}

		// if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
		// 	sqlquery += ' LIMIT ' + data.index + ', ' + data.limit;
		// }
		// if(!data.edit_flag){ sqlquery += ' LIMIT 10 ';}
		console.log('show state Query', sqlquery)
		if (err) {
			console.log("Failed")
		} else {
			var sql = conn.query(sqlquery, function (err, result) {
				// console.log(sql.sql);
				console.log('connection Closed.');
				conn.release();
				res.send(JSON.stringify(result));
			});
		}
	});
});
select.post('/showDistrict', function (req, res, err) {  // show District
	pool.getConnection(function (err, conn) {
		var data = req.body, where = [],
			sqlquery = 'SELECT id,`name` FROM ott.districts';
		console.log(" showDistrict : ", data);

		if (data.hasOwnProperty('state_id') && data.state_id) {
			where.push('state_id = ' + data.state_id);
		}
		if (data.hasOwnProperty('like') && data.like != '') {
			where.push('`name` LIKE "%' + data.like + '%"');
		}
		if (where.length > 0) {
			sqlquery += " where " + where.join(' AND ')
		}
		// if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
		// 	sqlquery += '  LIMIT ' + data.index + ', ' + data.limit;
		// }

		// if (!data.edit_flag) sqlquery += ' LIMIT 10 ';
		console.log(" showDistrict query : ", sqlquery);
		if (err) {
			console.log("Failed")
		} else {
			var sql = conn.query(sqlquery, function (err, result) {
				console.log('connection Closed.');
				conn.release();
				res.send(JSON.stringify(result));
			});
		}
	});
});


select.post('/listDistrict', function (req, res, err) {
	const jwt_data = req.jwt_data
	var data = req.body, where = [],
		sqlquery = ' SELECT id,`name` FROM bms.`districts` ',
		sqlqueryc = ' SELECT COUNT(*) `count` FROM bms.`districts` ';

	if (data.hasOwnProperty('state_id') && data.state_id) {
		where.push('state_id = ' + data.state_id);
	}

	if (data.hasOwnProperty('district') && data.district) {
		where.push('id = ' + data.district);
	}
	if (where.length > 0) {
		sqlquery += " where " + where.join(' AND ');
		sqlqueryc += " where " + where.join(' AND ');
	}

	if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
		sqlquery += '  LIMIT ' + data.index + ', ' + data.limit;
	}
	console.log(' LIST District Query : ', sqlquery);
	console.log(' LIST District Count Query : ', sqlqueryc);

	pool.getConnection(function (err, conn) {
		if (err) {
			res.end("Failed");
			console.log("Failed")
		} else {
			var sql = conn.query(sqlquery, function (err, result) {
				if (!err) {
					var value = [];
					value.push(result);
					sql = conn.query(sqlqueryc, function (err, result) {
						conn.release();
						if (!err) {
							value.push(result[0]);
							res.send(JSON.stringify(value));
						} else {
							console.log('error', err);
							// conn.release();
							res.send(JSON.stringify(result));
						}
					});
				} else {
					console.log('error', err);
					conn.release();
					res.send(JSON.stringify(result));
				}
			});
		}
	});
});

select.post('/listState', function (req, res, err) {
	const jwt_data = req.jwt_data
	var data = req.body, where = [],
		sqlquery = ' SELECT id,`name` FROM bms.`states` ',
		sqlqueryc = ' SELECT COUNT(*) `count` FROM bms.`states` ';

	if (data.hasOwnProperty('state') && data.state) {
		where.push('id = ' + data.state);
	}
	if (where.length > 0) {
		sqlquery += " where " + where.join(' AND ');
		sqlqueryc += " where " + where.join(' AND ');
	}

	if (data.hasOwnProperty('index') && data.hasOwnProperty('limit')) {
		sqlquery += '  LIMIT ' + data.index + ', ' + data.limit;
	}
	console.log(' LIST State Query : ', sqlquery);
	console.log(' LIST State Count Query : ', sqlqueryc);

	pool.getConnection(function (err, conn) {
		if (err) {
			res.end("Failed");
			console.log("Failed")
		} else {
			var sql = conn.query(sqlquery, function (err, result) {
				if (!err) {
					var value = [];
					value.push(result);
					sql = conn.query(sqlqueryc, function (err, result) {
						conn.release();
						if (!err) {
							value.push(result[0]);
							res.send(JSON.stringify(value));
						} else {
							console.log('error', err);
							// conn.release();
							res.send(JSON.stringify(result));
						}
					});
				} else {
					console.log('error', err);
					conn.release();
					res.send(JSON.stringify(result));
				}
			});
		}
	});
});

module.exports = select;