module.exports = (err,req,res,next) =>{
    res.status(err.status)
    .send({
        msg:err.msg
    });
}