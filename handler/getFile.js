const getImage = async (filename,path) => {
	if (filename) {
		const fs = require('fs');
		return new Promise((resolve, reject) => {
			const imagePath = `${__dirname}/../Documents/${path}/${filename}`;
			console.log('Get ImagePath', imagePath);
			fs.exists(imagePath, exists => {
				if (exists) {
					return resolve(fs.readFileSync(imagePath).toString("base64"))
				} else {
					return reject('Error: Image does not exists');
				}
			});
		});
	}
};

module.exports = getImage;