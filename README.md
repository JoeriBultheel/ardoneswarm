# ardroneswarm
Code to control multiple Parrot A.R. Drones simultaneously. 
Features include: 
  - controlling the drones with a wireless bluetooth PS3 controller. 
  - drones doing person tracking (following a person with a marker/color-tag included in the parrot AR 2.0 box) 

### instructions

* **connect laptop to wifi of drone**
* **cd to droneInstall**
* **run script/install**. this will upload code to connect to wpa2 secured network
* **run script/connect**. see script/connect -h for help (make sure to select valid available ip-adress)
* **repeat for all drones**
* **connect laptop to wifi**
* **change ip-adress in the 'dronesData' dictionary to those of your connected drones**
* **run node multiRepl.js and have fun!** tryout swarm> takeoff() :)
