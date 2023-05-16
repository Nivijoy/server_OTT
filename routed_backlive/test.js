
let busid='LIMBLU',buskey='f7119930ac6ea7cb25e26b7ab72ae39e',data={
name:'Ramajeyam S',
gender:'M',
dob:'1990-06-06',
gltvplancode:'8',
ottplancode:'1S',
mobile:'979012589611',
email:'jeyam.7@gmail.com',
dayid:'119',
profileid:'blss1177',
password:'e10adc3949ba59abbe56e057f20f883e'
}



// format id_length(4)+id(12)+key_len(4)+key(64)

//encript data

busid= Buffer.from(busid,'utf8').toString('hex');
console.log('BUS ID:',busid,'\nBUS ID LEN:',busid.length);
let busidlen=('0000' + (busid.length).toString(16)).slice(-4);
console.log('bus id len HEX:',busidlen);


buskey= Buffer.from(buskey,'utf8').toString('hex');
console.log('BUS KEY:',buskey,'\nBUS KEY LEN:',buskey.length);
let buskeylen=('0000' + (buskey.length).toString(16)).slice(-4);
console.log('BUS KEY len HEX:',buskeylen);

data = Buffer.from(JSON.stringify(data)).toString('hex');
console.log('data:',data);

let cmd=busidlen+busid+buskeylen+buskey+data;

console.log('SEND DATA:',cmd);
cmd=new Buffer.from(cmd, 'hex')

// console.log(cmd);


// Decript Data

let d=cmd.toString('hex')
// console.log('INPUT DATA :',d);

let idlen=Number(parseInt(d.slice(0,4),16)+4);
console.log('idlen :',idlen);
let bid=d.slice(4,idlen)
console.log('BUS ID IN HEX:',bid);
bid=Buffer.from((d).slice(4,idlen),'hex').toString('utf8')
console.log('BUS ID:',bid);

let keylen=Number(parseInt(d.slice(idlen,(idlen+4)),16)+4);
console.log('keylen :',keylen);
let bkey=d.slice(Number(idlen+4),Number(keylen+idlen))
console.log('BUS KEY IN HEX:',bkey);
bkey=Buffer.from((d).slice(Number(idlen+4),Number(keylen+idlen)),'hex').toString('utf8')
console.log('BUS KEY:',bkey);

let dd= Buffer.from(d.slice(Number(keylen+idlen)),'hex')

console.log(dd);

var temp = JSON.parse(dd);

console.log(temp);