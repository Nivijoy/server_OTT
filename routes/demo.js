// let data ='Qmx1ZV9Mb3R1c3xHTFRWRVAxNTE4MzExNTk2fEJsdWVfTG90dXMzMTA1MjIwMTMzNjM1N3xDcmVkaXQ='
// var buf = Buffer.from(data,'base64').toString('utf-8');
//          console.log('Decrypt data', buf);


// let data1 = 'Blue_Lotus|GLTVEP1518311596|Blue_Lotus31052201336357|Credit'

// let decoded = data1.split('|')

// console.log(decoded[0]);
// const URL = require('url');



// let url ='https://crm.gltv.co.in:2003/api/account/trn-status?status=Credit&msg=Transaction%20Successfully%20Completed&txnid=GLTVEP1709855061&order_id=Blue_Lotus02062201338453';

// let url_parts = url.split('/')

// // console.log(url_parts[5].split('?')[1].split('&'));

// let data = url_parts[5].split('?')[1].split('&');

// console.log(data);
// let data2=[]
// data.forEach(function (d) {
//     pair = d.split('=');
//     data2.push({ key: pair[0], value: pair[1] });

//  });


//  let msg = data2[1].value.split('%20')
//  console.log(msg.join(' '));


//  https://crm.gltv.co.in:2003/#/pages/account/trn-status?status=Failed&msg=Transaction%20Failed&txnid=GLTVEP1082331746&order_id=Blue_Lotus03062201338776


//  https://crm.gltv.co.in:2003/#/pages/account/trn-statu?status=Failed&msg=Transaction%20Failed&txnid=GLTVEP9808231006&order_id=Blue_Lotus03062201339282


//  https://crm.gltv.co.in:2003/#/pages/account/trn-status?status=Failed&msg=Transaction%20Failed&txnid=GLTVEP1082331746&order_id=Blue_Lotus03062201338776

// var x=5,y=1 ;
// var obj ={ x:10}
//  with(obj) { console.log(y); }

//  let a=1; 
//  if(a!=null){
//     console.log(a!=null);
//  }

//  let num=10; 
//  console.log(typeof(num));
//  if(num==="10"){
//     console.log(num==="10");
//  } else{
//     console.log('false');
//  }


//  function equalto(){
//     let num=10;
//     if(num ==="10"){
//         return true
//     }
//     return false
//  }

//  console.log(equalto());


// let arr = [2, 3, 4, 5, 4, 6, 4, 7, 4, 5, 6, 6]
// let arr4 = arr.filter((v, i, a) =>
//    a.indexOf(v) === i
// )
// let arr1 = arr.sort(), y = 0; z = 0, arr2 = [];

// for (let i = 0; i < arr4.length; i++) {
//    let count = 0;
//    y = arr4[i];
//    for (let j = 0; j < arr1.length; j++) {
//        if (y == arr1[j]) {
//          count++
//       }
//    }
//     if (count > 1) arr2.push({ 'id': y, 'count': count })
// }

// console.log('Final Array with Frequencies more than once',arr2);

// const md5 = require('md5');
// console.log(md5('Joyce12@'));
 


// let array = [5, 1,2];

// const result = array.reduce((a, b, i,items) => {
//   if (i == 1) items.pop();
// //   items.push(1)
//   console.log(i,items);
//   return a+b
// });

// console.log(array, result);


// let obj =[{x:1},{x:2},{x:3}];

// const sum = obj.reduce((a,b) =>{
//    console.log(a);
//    return a + b.x
// },1)

// console.log(sum);

// console.log([1,2].concat([2,3]));
// const myArray = ['a', 'b', 'a', 'b', 'c', 'e', 'e', 'c', 'd', 'd', 'd', 'd'];

// const result = myArray.reduce((x,y)=>{
//    console.log(x,y);
// //   if(!x.includes(y)) x.push(y)
// if(x.indexOf(y) === -1) x.push(y)
//   return x 
   
// },[])

// console.log(result);

/* 
function myObject() { 
  this.property1 = "value1"; this.property2 = "value2"; 
  var newValue = this.property1; 
 this.performMethod = function() 
 { myMethodValue = newValue; return myMethodValue; };
 }
 
 var myObjectInstance = new myObject(); alert(myObjectInstance.performMethod()); */


 const add = (x,y) =>{
  console.log('in Add',x,y);
  return x + y;
 }


 const calculate = (add) => (x,y) =>{
  console.log('In calculate',x,y);
    return add(x,y)
 }

// const calculate = (x,y,add) =>{
//   console.log('In calculate',x,y);
//     return add(x,y)
//  }
 const result = calculate(add);
// const result =(1,2) => {

// }
 const res = result(1,2)
 const resp =  result(1,2)

 console.log('res',resp);
