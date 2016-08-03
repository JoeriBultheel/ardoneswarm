var repl = require("repl");
var arDrone = require('ar-drone');

dronesData =
{
	drone1 : {ip : "192.168.178.200"},
	drone2 : {ip : "192.168.178.201"}
}

drones = {};

for(var name in dronesData){
	drones[name] = arDrone.createClient(dronesData[name]);
	console.log("created a drone");
};

takeoffFunc = function () {
	for(var name in drones){
		drones[name].takeoff();
	}
}

landFunc = function () {
	for(var name in drones){
		drones[name].land();
	}
}

var replServer = repl.start({
	prompt: "swarm >",
});

replServer.context.takeoff = takeoffFunc;
replServer.context.land = landFunc;
