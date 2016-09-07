PILOT_ACCELERATION = 0.05;
PERSON_TRACKING_DISTANCE = 200;

var repl = require("repl");
var arDrone = require('ar-drone');
var arDroneConstants = require('ar-drone/lib/constants');
var Controller = require('node-pid-controller')
var dualShock = require('dualshock-controller');
var say = require('say');
var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(3001); //all socket traffic goes through port 3001
var absoluteControlEnabled = false;

var controller = dualShock(
    {
        config : "dualShock3",
        //smooths the output from the acelerometers (moving averages) defaults to true
        accelerometerSmoothing : true,
        //smooths the output from the analog sticks (moving averages) defaults to false
        analogStickSmoothing : true //false
    });

var droneMovements = {front: null, back: null, right: null, left: null};
var ver_ctrl = new Controller(0.3, 0.01, 0.1);
var hor_ctrl = new Controller(0.4, 0.01, 0.1);
var depth_ctrl = new Controller(0.4, 0.01, 0.1);

dronesData =
{
   drone1 : {ip : "10.0.1.10"},
   //drone2 : {ip : "10.0.1.11"},
   //drone3 : {ip : "10.0.1.12"},
   //drone4 : {ip : "10.0.1.13"},
}

drones = {};

//MAKE & CONFIGURE THE DRONES
for(var name in dronesData){
	drones[name] = arDrone.createClient(dronesData[name]); //dronesData[name]
  var idx = Object.keys(dronesData).indexOf(name);
  console.log("created a drone named "+name+" with ip "+dronesData[name].ip);
  //console.log("drone SSID name: "+drones[name].config('network:ssid_single_player',"drone2"));

  //create the dronestreams for the video feeds
  require("dronestream").listen(3002+idx, dronesData[name]);

  drones[name].config('general:navdata_demo', true);
  drones[name].config('detect:detect_type', 13); //12
  drones[name].config('detect:enemy_colors', 3); //12
  drones[name].config('detect:enemy_without_shell', false); //12
  drones[name].config('pic:ultrasound_freq', (idx%2==0)?7:8); //7: 22.22Hz, 8: 25Hz  -- if idx is odd ...
  drones[name].config('control:altitude_max', 5000); //7: [500-5000] /1000 = 0.5m-5m
  drones[name].config('control:euler_angle_max', 0.3); //7: SET TO MAX SPEED 0.5

  drones[name]._absModePhiValue = -0.17; //-0.1; //angle for absolute mode

  //TAG TRACKING MECHANISM
  drones[name].on('navdata', function(navdata){

    //console.log(Object(navdata['droneState']));

    var tags = Object(navdata['visionDetect']);
    if (tags.nbDetected>0) {
      moveDroneToTarget(drones[name],tags.xc[0],tags.yc[0],tags.dist[0],tags.width[0],tags.height[0]);
      if (!drones[name]._tagTracking) {
        drones[name]._tagTracking = true;
        console.log("TRACKING")
      }
    }
    else {
      if (drones[name]._tagTracking) {
        drones[name]._tagTracking = false;
        drones[name].stop();
        console.log("NOT TRACKING")
      }
    }
   });
};

moveDroneToTarget = function (drone,x,y,z,width,height) {

  var tagCenterX = x + (width * 0.5);
  var tagCenterY = y + (height * 0.5);
  var heightAmount = -(tagCenterY - 500) / 500;
  var turnAmount = -(tagCenterX - 500) / 500;
  var moveAmount = -(z - PERSON_TRACKING_DISTANCE ) / PERSON_TRACKING_DISTANCE;

  heightAmount = ver_ctrl.update(-heightAmount); // pid
  turnAmount   = hor_ctrl.update(-turnAmount);   // pid
  moveAmount = depth_ctrl.update(-moveAmount);   //pid

  var lim = 0.1;
  if( Math.abs( turnAmount ) > lim || Math.abs( heightAmount ) > lim || Math.abs( moveAmount ) > lim ){
    if( turnAmount < 0 ) drone.clockwise( Math.abs( turnAmount ) );
    else drone.counterClockwise( turnAmount );

    if(  heightAmount < 0 ) drone.down( Math.abs(heightAmount) );
    else drone.up( heightAmount );

    if(  moveAmount < 0 ) drone.front( Math.abs(moveAmount) );
    else drone.back( moveAmount );
  }
  else {
    drone.stop();
  }
}

takeoff = function () {
	for(var name in drones){
		drones[name].takeoff();
	}
}

land = function () {
	for(var name in drones){
		drones[name].land();
	}
}

clockwise = function (amount) {
	for(var name in drones){
    if(!drones[name]._tagTracking){
      drones[name].clockwise(amount)
    }
	}
}

counterClockwise = function (amount) {
	for(var name in drones){
    if(!drones[name]._tagTracking){
		  drones[name].counterClockwise(amount)
    }
	}
}

up = function (amount) {
	for(var name in drones){
    if(!drones[name]._tagTracking){
	    drones[name].up(amount)
    }
	}
}

down = function (amount) {
	for(var name in drones){
    if(!drones[name]._tagTracking){
	    drones[name].down(amount)
    }
	}
}

front = function (amount) {
	for(var name in drones){
    if(!drones[name]._tagTracking){
	    drones[name].front(amount)
    }
	}
}

back = function (amount) {
	for(var name in drones){
    if(!drones[name]._tagTracking){
	    drones[name].back(amount)
    }
	}
}

left = function (amount) {
	for(var name in drones){
    if(!drones[name]._tagTracking){
	    drones[name].left(amount)
    }
	}
}

right = function (amount) {
	for(var name in drones){
    if(!drones[name]._tagTracking){
	    drones[name].right(amount)
    }
	}
}

blinkLeds = function (amount) {
	for(var name in drones){
		drones[name].animateLeds('redSnake', 5, 5)
	}
}

stop = function (amount) {
	for(var name in drones){
		drones[name].stop()
	}
}

batteryLife = function () {
	for(var name in drones){
		var val = drones[name].battery()
    console.log("battery life: "+val);
	}
}

disableEmergency = function () {
  for(var name in drones){
    drones[name].disableEmergency();
  }
}

calibrate = function () {
  for(var name in drones){
    drones[name].calibrate(0);
  }
}

flatTrim = function () {
  for(var name in drones){
    drones[name].ftrim();
  }
}

flipLeft = function () {
  for(var name in drones){
    drones[name].animate('flipLeft', 1000);
  }
}

enableAbsoluteMode = function () {
  for(var name in drones){
    drones[name]._absoluteMode = !drones[name]._absoluteMode;
    console.log(drones[name]._absoluteMode ? "ABSOLUTE MODE" : "NORMAL MODE");
  }
}

doRandomAnimation = function () {

  var animations = ['phiM30Deg', 'phi30Deg', 'thetaM30Deg', 'theta30Deg', 'theta20degYaw200deg',
'theta20degYawM200deg', 'turnaround', 'turnaroundGodown', 'yawShake',
'yawDance', 'phiDance', 'thetaDance', 'vzDance', 'wave', 'phiThetaMixed',
'doublePhiThetaMixed']; //'flipAhead', 'flipBehind', 'flipLeft', 'flipRight'

  var chosenAnimation = animations[Math.floor(Math.random() * animations.length)];
  console.log("playing animation: "+chosenAnimation);
  say.speak(chosenAnimation);

  for(var name in drones){
    drones[name].animate(chosenAnimation, 2000);
  }
}

//make sure you add an error event handler
controller.on('error', function(data) {
  //...someStuffDidNotWork();
	console.log(data);
});

controller.on('triangle:press', function (data) {
  console.log("takeoff");
	takeoff();
});

controller.on('x:press', function (data) {
  console.log("land");
	land();
});

controller.on('square:press', function (data) {
  console.log("calibrating magnetometer");
  calibrate();
});

controller.on('circle:press', function (data) {
  console.log("Do random animation");
  doRandomAnimation();
});

controller.on('start:press', function (data) {
  console.log("Perform Flat Trim - fetch battery life - blink leds");
  flatTrim();
  blinkLeds();
  batteryLife();
});

controller.on('select:press', function (data) {
  console.log("Disable Emergency");
  disableEmergency();
});

controller.on('l2:press', function(data) {
  console.log("CONTROL STYLE:");
  enableAbsoluteMode();
});

controller.on('r2:press', function(data) {
  console.log("stop");
  stop();
});

//MOVEMENT CONTROLL

controller.on('l1:press', function(data) {
  counterClockwise(0.9);
});

controller.on('l1:release', function(data) {
  counterClockwise(0);
});

controller.on('r1:press', function(data) {
  clockwise(0.9);
});

controller.on('r1:release', function(data) {
  clockwise(0);
});

controller.on('dpadUp:press', function(data) {
  //if the movement isn't registered yet, add it with initial acceleration
    if (droneMovements["front"]===null) {
      droneMovements["front"] = PILOT_ACCELERATION;
    }
});

controller.on('dpadUp:release', function(data) {
  //delete the movement from the list and reset to zero
    droneMovements["front"] = null;
    front(0);
    stop();
});

controller.on('dpadRight:press', function(data) {
  //if the movement isn't registered yet, add it with initial acceleration
    if (droneMovements['right']===null) {
      droneMovements['right'] = PILOT_ACCELERATION;
    }
});

controller.on('dpadRight:release', function(data) {
  //delete the movement from the list and reset to zero
    droneMovements['right'] = null;
    right(0);
    stop();
});

controller.on('dpadDown:press', function(data) {
  //if the movement isn't registered yet, add it with initial acceleration
    if (droneMovements['back']===null) {
      droneMovements['back'] = PILOT_ACCELERATION;
    }
});

controller.on('dpadDown:release', function(data) {
  //delete the movement from the list and reset to zero
    droneMovements['back'] = null;
    back(0);
    stop();
});

controller.on('dpadLeft:press', function(data) {
  //if the movement isn't registered yet, add it with initial acceleration
    if (droneMovements['left']===null) {
      droneMovements['left'] = PILOT_ACCELERATION;
    }
});

controller.on('dpadLeft:release', function(data) {
  //delete the movement from the list and reset to zero
    droneMovements['left'] = null;
    left(0);
    stop();
});


setInterval(function(){
    for (var key in droneMovements) {
      if (droneMovements[key] != null) {

        switch (key) {
          case "front":
            front(droneMovements[key]);
            break;
          case "back":
            back(droneMovements[key]);
            break;
          case "left":
            left(droneMovements[key]);
            break;
          case "right":
            right(droneMovements[key]);
            break;
        }
        //update speed
        droneMovements[key] = droneMovements[key] + PILOT_ACCELERATION / (1 - Math.min(droneMovements[key],0.999));
      }
    }
},100);


var replServer = repl.start({
	prompt: "swarm >",
});

//add event handlers:
controller.on('right:move', function(data) {

  	// if (data.x < 128) {
  	// 	var amount = (128-data.x)/128.0;
    //   if (amount > 0.1) {
    //     counterClockwise(amount/2.0);
    //     console.log("TURN-LEFT: "+amount/2.0);
    //   }
  	// }
  	// else if (data.x > 128) {
  	// 	var amount = (data.x-128)/128.0;
    //   if (amount > 0.1) {
		//     clockwise(amount/2.0);
	  //     console.log("TURN-RIGHT: "+amount/2.0);
    //   }
  	// }
  	// else {
  	// 	//stop();
  	// }

  	if (data.y < 128) {
  		var amount = (128-data.y)/128.0
      if (amount > 0.1) {
		    up(amount/2.0);
	      console.log("UP: "+amount/2.0);
      }
  	}
  	else if (data.y > 128) {
  		var amount = (data.y-128)/128.0;
      if (amount > 0.1) {
		    down(amount/2.0);
	      console.log("DOWN: "+amount/2.0);
      }
  	}
  	else {
  		//stop();
  	}

});

//controller status
//as of version 0.6.2 you can get the battery %, if the controller is connected and if the controller is charging
controller.on('battery:change', function (value) {
     console.log("controller-battery-power: "+value);
});
controller.on('connection:change', function (value) {
  console.log("controller-connection-type: "+value);
});
controller.on('charging:change', function (value) {
  console.log("controller-battery-status: "+value);
});


//STREAM STUFF

app.use(express.static(__dirname + '/public'));

io.on('connection', function (socket) {

  console.log("connection with client established");

    setInterval(function(){
        var batteryLevel = [drones["drone1"].battery()]; //drones["drone2"].battery()
//console.log(batteryLevel);

        socket.emit('event', { name: 'battery',value: batteryLevel});
    },3000);
});

app.listen(3000);
