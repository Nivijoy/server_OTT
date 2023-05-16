var fs = require('fs');
var http = require('http');
const path = require('path');

const IP = '192.168.101.158', port = '2003'; //Home

const express = require('express');
app = express();

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));

const channel = require('./routes/channel'),
    login = require('./routes/login'),
    pack = require('./routes/pack'),
    bus = require('./routes/business'),
    select = require('./routes/select'),
    user = require('./routes/user'),
    genre = require('./routes/genre'),
    lang = require('./routes/lang'),
    { pagltvapiy, activeaccount,pbcheckavapack } = require('./routes/gltvapi');
prehandler = require('./routes/prehandler'),
    rtoken = require('./routes/renewtoken'),
    subs = require('./routes/subscriber'),
    operation = require('./routes/operations'),
    account = require('./routes/account'),
    dashboard = require('./routes/dashboard'),
    cors = require('cors');


//const ErrorHandler = require('./handler/errorHandler')

var compress = require('compression');
const helmet = require('helmet'),
    bodyParser = require('body-parser');
const { pay, meTStatus } = require('./routes/pay');

app.use(cors());
app.use(compress());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

app.use(function (req, res, next) {
    console.log(
        // 'req.headers : ', req.headers,
        'System IP :', req.ip,
        'Local IP :', req.connection.remoteAddress,
        'req Origin :', req.url,
        'req Origin Ip :', req.headers.origin
    );

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.setHeader('Content-Type', 'application/font-woff');

    res.setHeader('Access-Control-Allow-Methods', 'POST,GET');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Expose-Headers,content-type,authorization');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');


    next();
});

app.use(helmet({ frameguard: { action: 'deny' } }));

app.use('/api/login', login);
app.post('/api/gltv/activeaccount', activeaccount);
app.post('/api/gltv/pbcheckavapack', pbcheckavapack);
app.use('/rtoken', rtoken);
app.use('/api/pay/meTStatus', meTStatus);
app.use('/api/pay/meCStatus', meTStatus);
app.use('/*', prehandler);
app.use('/api/user', user);
app.use('/api/business', bus);
app.use('/api/select', select);
app.use('/api/channel', channel);
app.use('/api/genre', genre);
app.use('/api/lang', lang);
app.use('/api/pack', pack);
app.use('/subs', subs);
app.use('/operation', operation);
app.use('/account', account);
app.use('/api/dashboard', dashboard);
app.use('/pay', pay);

//app.use(ErrorHandler);
// const httpsServer = http.createServer(credentials, app);

app.listen(port, () => {
    console.log('GLTV Server running on ', IP + ':' + port);
});