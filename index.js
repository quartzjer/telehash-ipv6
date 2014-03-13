var dgram = require("dgram");
var os = require("os");

exports.install = function(self, args)
{
  if(!args) args = {};
  if(typeof args.port != "number") args.port = 0;

  function msgs(msg, rinfo){
    self.receive(msg.toString("binary"), {type:"ipv6", ip:rinfo.address, port:rinfo.port});
  }

  var server = dgram.createSocket("udp6", msgs);
  server.on("error", function(err){
    console.log("error from the UDP6 socket, dropping IPv6 support",err);
    self.deliver("ipv6",false);
    delete self.paths.pub6;
    delete self.paths.lan6;
  });

  self.deliver("ipv6",function(to,msg){
    var buf = Buffer.isBuffer(msg) ? msg : new Buffer(msg, "binary");
    server.send(buf, 0, buf.length, to.port, to.ip);    
  });

  var networkIP = "";
  self.wait(true);
  server.bind(args.port, "::0", function(err){
    // regularly update w/ local ip address changes
    function interfaces()
    {
      var ifaces = os.networkInterfaces()
      var address = server.address();
      for (var dev in ifaces) {
        ifaces[dev].forEach(function(details){
          // upgrade to actual interface ip, prefer local ones
          if(details.family == "IPv6" && !details.internal && self.isLocalIP(address.address)) address.address = details.address;
        });
      }
      networkIP = address.address; // used for local broadcasting
      self.pathSet({type:"lan6",ip:address.address,port:address.port});
      setTimeout(interfaces,10000);
    }
    interfaces();
    self.wait(false);
  });
}

