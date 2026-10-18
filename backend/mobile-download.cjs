const fs=require('node:fs');
const {HttpError}=require('./security.cjs');
function androidDownload(req,res,file){
 if(!['GET','HEAD'].includes(req.method))throw new HttpError(405,'Use GET or HEAD');
 let descriptor,stat;try{const entry=fs.lstatSync(file);if(!entry.isFile()||entry.isSymbolicLink())throw Error();descriptor=fs.openSync(file,'r');stat=fs.fstatSync(descriptor);}catch{if(descriptor!==undefined)fs.closeSync(descriptor);throw new HttpError(404,'Android download is not available yet');}
 try{const magic=Buffer.alloc(4);fs.readSync(descriptor,magic,0,4,0);if(stat.size<4||!magic.equals(Buffer.from([80,75,3,4])))throw new HttpError(503,'Android package is invalid');}catch(error){fs.closeSync(descriptor);throw error;}
 res.writeHead(200,{'Content-Type':'application/vnd.android.package-archive','Content-Length':stat.size,'Content-Disposition':'attachment; filename="ChinaLowCost-android.apk"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 if(req.method==='HEAD'){fs.closeSync(descriptor);res.end();return;}
 const stream=fs.createReadStream(file,{fd:descriptor,start:0,autoClose:true});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}
module.exports={androidDownload};
