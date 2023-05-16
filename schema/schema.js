const { body, validationResult } = require('express-validator');
const errorFunction = require('../handler/errorFunction')

module.exports.addBusValidate = () => {
    return [
        body('business_name').exists().isString(),
        body('login').exists().isString(),
        // body('password').isLength({ min: 3 }),
        // body('email').isEmail(),
        // body('active').isBoolean(),
        body('share').exists().isNumeric(),
        body('isp').if(body('share').equals('2')).exists().notEmpty(),
        body('dshare').if(body('share').equals('2')).if(body('resel_under').equals('0').if(body('resel_under').equals('1'))).exists().notEmpty(),
        // body('sdshare').if(body('share').equals('2')).if(body('resel_under').equals('1').if(body('resel_under').equals('2'))).exists().notEmpty(),
        body('mshare').if(body('share').equals('2')).if(body('role').equals('555')).exists().notEmpty(),
        body('dist_id').if(body('resel_under').equals('1')).exists().notEmpty(),
        // body('dist_id').exists().custom(  (dist_id, { req }) => {
        //     console.log(dist_id, req.body)
        //     let data = req.body
        //     if (data.resel_under == 1 && (data.role == 555 || data.role == 666)) {

        //     }
        // }),
        body('subdist_id').if(body('resel_under').equals('2')).exists().notEmpty(),
 
    ]
}

module.exports.editBusValidate = () => {
    return [
        body('business_name').exists().isString(),
        body('login').exists().isString(),
        body('email').isEmail(),
        body('active').isBoolean(),
        body('share').exists().isNumeric(),
         body('isp').if(body('share').equals('2')).exists().notEmpty(),
        // body('dshare').if(body('share').equals('2')).if(body('resel_under').equals('0').if(body('resel_under').equals('1'))).exists().notEmpty(),
        // body('sdshare').if(body('share').equals('2')).if(body('resel_under').equals('1').if(body('resel_under').equals('2'))).exists().notEmpty(),
        // body('mshare').if(body('share').equals('2')).if(body('role').equals('555')).exists().notEmpty(),
        // body('dist_id').if(body('resel_under').equals('1')).exists().notEmpty(),
        // body('subdist_id').if(body('resel_under').equals('2')).exists().notEmpty(),

    ]
}

 



module.exports.validate = (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) {
        return next()
    }
    const extractedErrors = [];
    let schema;
    errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }))
    console.log('Error', extractedErrors)
    schema = errorFunction(extractedErrors, 'ERR')
    console.log('Return Schema', schema)
    // return res.status(422).json({
    //     errors: extractedErrors,
    // })
    return res.json([schema]);
}

