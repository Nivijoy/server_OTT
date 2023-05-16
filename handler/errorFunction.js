const errorFunction =   (msg, errorBit, data = '') => {
    console.log(msg)
    if (errorBit != 0) return { msg: msg, error_msg: errorBit };
    else return { msg: msg, error_msg: errorBit, id: data };
};

module.exports = errorFunction;