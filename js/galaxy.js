/* Copyright (c) 2012-2014 Sascha Lange (sascha@5dlab.com) */

window.onload = function() 
{
  //
  // CONFIG
  //
  // add your galaxy configuration here. 
  //
  var config = {
    centerZ: 200,       // center of galaxy on z-axis
    a: 2000,            // distance of a (focal point(?!) / Fluchtpunkt) on z-axis
    angularSpeed: .008, // revolutions per second
    shadow: 'soft',     // specifies type of shadow to render: 'none', 'sharp', 'soft'
    shadowY: -135,      // position of the the 'ground plane' on the y-axis
  };
  
  var canvas = document.getElementById('animation');

  if (!canvas) {
    return ;
  }
  
  var width = canvas.width;
  var scale = width / 1024;  // all absolute sizes have been created for 1024px width
  
  var ismobile=navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i)     
  var isFirefox = /Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent);
  
  if (ismobile) {
    config = 'none';
  }
  else if (isFirefox) {
    config = 'sharp';
  }
  
  var planetConfigs = PlanetConfig(scale);
  
  var galaxy = Galaxy(config);
  
  for (var i=0; i < planetConfigs.length; i++) {
    var planetConfig = planetConfigs[i];
    galaxy.addPlanet(Planet({
      y:            planetConfig[0],
      radius:       planetConfig[1],
      startAngle:   planetConfig[2],
      size:         planetConfig[3],
      fill:         planetConfig[4],
      stroke:       planetConfig[5],
      
      centerZ:      config.centerZ,
      a:            config.a,
      angularSpeed: config.angularSpeed,
      shadow:       config.shadow,
      shadowY:      config.shadowY,
    }));
  }

  galaxy.animate(new Date(), canvas);
};



var Planet = window.Planet || function(spec)
{
  var that = {};
  
  var _position    = null;
  var _startAngle  = spec.startAngle ||   0;
  var _radius      = spec.radius     ||  50;
  var _centerZ     = spec.centerZ    || 100;
  var _hasShadow   = spec.shadow !== "none";  
    
  var recalcPosition = function (rotation) {
    return { x: Math.sin(rotation + _startAngle) * _radius,
             y: spec.y,
             z: Math.cos(rotation + _startAngle) * _radius + _centerZ };
  };
    
  that.setRotation = function(rotation) {
    _position = recalcPosition(rotation);
  };
    
  that.position = function() {
    return _position;
  };
    
  that.fill = function() {
    return spec.fill;
  }
    
  that.stroke = function() {
    return spec.stroke;
  }
    
  that.project = function() {
    return {
      /** projects the size of a planet onto the 2d image plane */
      pos: { x: _position.x/(1+_position.z/spec.a), 
             y: _position.y/(1+_position.z/spec.a) },
               
      /** projects a 3d point onto the 2d image plane via an application
        * of the "Strahlensatz". */
      size: spec.size/(1+_position.z/spec.a),
        
      shadow: _hasShadow ? { x: _position.x/(1+_position.z/spec.a), y: spec.shadowY/(1+_position.z/spec.a) } : undefined
    };
  };
    
  _position = recalcPosition(0.);
  
  return that;
};



var Galaxy = window.Galaxy || function(spec) 
{
  var that = {};
  
  var planets = new Array();
  
  
  that.addPlanet = function(planet) {
    planets[planets.length] = planet;
  };
    
  that.animate = (function() 
  {
    // private animation variables
    var startTime = null;
    var numFrames = 1;
      
    return function(lastTime, canvas) {
        
      // update
      if (!startTime) startTime = new Date();
      var now = new Date();
      var timeDiff = now.getTime() - startTime.getTime();
      var angularDiff = spec.angularSpeed * 2 * Math.PI * timeDiff / 1000.;

      // log fps
      var fpsDiv = document.getElementById('fps');
      if (fpsDiv) {
        fpsDiv.innerHTML = 'FPS: ' + Math.floor(numFrames++ / (timeDiff/1000.));
      }

      // recalc positions
      var cX = canvas.width / 2;        // center on x axis 
      var cY = canvas.height / 1.75;    // center on y axis  (z-axis center in config)

      for(var i=0; i < planets.length; i++) {
        var planet = planets[i];
        planet.setRotation(angularDiff);
      }

      // sort according to z-position
      planets = planets.sort(function(a,b) {
        return b.position().z - a.position().z;
      });
    
      // paint    
      if (canvas.getContext) {
        context = canvas.getContext('2d');
      
        context.clearRect(0,0, canvas.width, canvas.height);
        context.lineWidth = 2;

        // draw shadows
        if (spec.shadow === 'soft') {              // soft shadows
          context.save();
          context.shadowOffsetX = 0;   
          context.shadowColor = "rgba(0,0,0,.1)";  

          context.scale(1,.125);
          context.fillStyle = "rgba(0,0,0)";
          context.shadowBlur = 5.;

          for (var i=0; i < planets.length; i++) {
            var planet = planets[i];
            
            var projection = planet.project();
            
            context.shadowOffsetY = (projection.pos.y - projection.shadow.y) ;
            context.beginPath();
            context.arc( cX+projection.pos.x, 
                        (cY-projection.pos.y)*8,  // y-axis upwards
                         projection.size*.8, 0, 2*Math.PI, true);
            context.fill();
            context.closePath();
          }
          context.restore();
        }
        else if (config.shadow === 'sharp') {      // shadows without blurring
          context.save();
          context.scale(1,.125);
          context.fillStyle = "rgba(0,0,0,.1)";

          for (var i=0; i < planets.length; i++) {
            var planet = planets[i];
            var projection = planet.project();
            
            context.beginPath();
            context.arc( cX+projection.shadow.x, 
                        (cY-projection.shadow.y)*8,  // y-axis upwards
                         projection.size*.8, 0, 2*Math.PI, true);
            context.fill();
            context.closePath();
          }
          context.restore();           
        }
      
        // draw planets
        for (var i=0; i < planets.length; i++) {
          var planet = planets[i];
            
          var projection = planet.project();

          context.fillStyle = planet.fill(); 
          context.strokeStyle = planet.stroke(); 
            
          context.beginPath();
          context.arc( cX+projection.pos.x, 
                       cY-projection.pos.y,  // y-axis upwards
                       projection.size, 0, 2*Math.PI, true);
          context.fill();
          context.closePath();
      
          context.beginPath();
          context.arc( cX+projection.pos.x, 
                       cY-projection.pos.y, // y-axis upwards
                       projection.size-3, 0, 2*Math.PI, true);
          context.stroke();
          context.closePath();  
        }
      }
        
      // request new frame
      requestAnimFrame(function(){
        that.animate(now, canvas);
      });
    };
  })();
  
  return that;
};


/** use browser requestAnimationFrame method or add a timer
 * solution. */
window.requestAnimFrame = (function(callback){
  return window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function(callback){
      window.setTimeout(callback, 1000 / 60);
  };
})();

    
var PlanetConfig = window.PlanetConfig || function(scale) {
  return [
      
      // logo planets
    [ 140*scale, 220*scale, // logo dark blue
      -Math.PI/3*2., 41.47*scale, 
      "rgb(40,111,183)", "rgb(50,163,218)" ],

    [ -50*scale, 495*scale, // logo green
      Math.PI/11*8, 24*scale, 
      "rgb(215,223,35)", "rgb(225,243,40)" ],

    [ -20*scale, 375*scale, // logo orange
      Math.PI/2.9, 20*scale, 
      "rgb(247,148,30)", "rgb(255,162,36)" ],

    [ -32*scale, 355*scale, // logo light blue
      0, 28.8*scale, 
      "rgb(39,170,225)", "rgb(43,202,240)" ],

    [ 50*scale, 385*scale, // logo warm grey
      Math.PI/11*8, 34.56*scale, 
      "rgb(194,181,155)", "rgb(214,200,166)" ],

    // other planets
    [ 17*scale, 510*scale,   // grey
      -Math.PI/2., 18*scale, 
      "rgb(150,150,150)", "rgb(190,190,190)" ],

    [ -35 *scale, 400*scale,   // grey
      -Math.PI/2.2, 28*scale, 
      "rgb(140,140,140)", "rgb(180,180,180)" ],

    [ -8 *scale, 415*scale,   // grey
      -Math.PI/1.8, 34*scale, 
      "rgb(210,210,210)", "rgb(230,230,230)" ],

    [ -45 *scale, 410*scale,   // grey
      -Math.PI/1.95, 14*scale, 
      "rgb(150,150,150)", "rgb(170,170,170)" ],

    [ -35 *scale, 490*scale,   // grey
      Math.PI/2, 12*scale, 
      "rgb(150,150,150)", "rgb(170,170,170)" ],

    [ 20 *scale, 440*scale,   // grey
      Math.PI/2.2, 20*scale, 
      "rgb(200,200,200)", "rgb(220,220,220)" ],

    [ -30 *scale, 420*scale,   // grey
      -Math.PI*.25, 20*scale, 
      "rgb(230,230,230)", "rgb(240,240,240)" ],

    [ -30 *scale, 490*scale,   // grey
      Math.PI*.9, 16*scale, 
      "rgb(210,210,210)", "rgb(220,220,220)" ],

    [ -75 *scale, 500*scale,   // grey
      -Math.PI*.1, 12*scale, 
      "rgb(190,190,190)", "rgb(210,210,210)" ],

    [ -25 *scale, 140*scale,   // grey
      Math.PI*.1, 50*scale, 
      "rgb(225,225,225)", "rgb(240,240,240)" ],

    [ 25 *scale, 20*scale,     // grey
      Math.PI*1.1, 20*scale, 
      "rgb(170,170,170)", "rgb(190,190,190)" ],

    [ 185 *scale, 30*scale,     // grey
      Math.PI*.5, 16*scale, 
      "rgb(140,140,140)", "rgb(160,160,160)" ],

    [ 30 *scale, 380*scale,     // grey
      -Math.PI*.44, 14*scale, 
      "rgb(180,180,180)", "rgb(200,200,200)" ],

    [ -2 *scale, 375*scale,     // grey
      -Math.PI*.43, 14*scale, 
      "rgb(180,180,180)", "rgb(200,200,200)" ],

    [ 55 *scale, 385*scale,     // grey
      -Math.PI*.425, 14*scale, 
      "rgb(180,180,180)", "rgb(200,200,200)" ],

    [ 23 *scale, 330*scale,     // grey
      -Math.PI*.44, 28*scale, 
      "rgb(160,160,160)", "rgb(180,180,180)" ],

    [ 2 *scale, 330*scale,     // grey
      -Math.PI*.28, 21*scale, 
      "rgb(130,130,130)", "rgb(150,150,150)" ],

    [ 38 *scale, 290*scale,     // grey
      -Math.PI*.75, 19*scale, 
      "rgb(205,205,205)", "rgb(220,220,220)" ],

    [ -38 *scale, 450*scale,     // grey
      -Math.PI*.95, 12*scale, 
      "rgb(205,205,205)", "rgb(220,220,220)" ],

    [ -45 *scale, 420*scale,     // grey
      Math.PI*.45, 12*scale, 
      "rgb(205,205,205)", "rgb(220,220,220)" ],

    [ -25 *scale, 280*scale,     // grey
      Math.PI*.35, 22*scale, 
      "rgb(190,190,190)", "rgb(210,210,210)" ],

    [ -15 *scale, 485*scale,     // grey
      Math.PI*.24, 18*scale, 
      "rgb(170,170,170)", "rgb(190,190,190)" ],

    [ 45 *scale, 365*scale,     // grey
      Math.PI*.28, 25*scale, 
      "rgb(180,180,180)", "rgb(190,190,190)" ],

    [ 145*scale, 180*scale, // logo dark blue
      -Math.PI*.58, 18*scale, 
      "rgb(150,150,150)", "rgb(170,170,170)" ],
  
    [ 115*scale, 170*scale, // logo dark blue
      -Math.PI*.5, 26*scale, 
      "rgb(190,190,190)", "rgb(200,200,200)" ],

    [ 85*scale, 200*scale, // logo dark blue
      -Math.PI*.585, 18*scale, 
      "rgb(140,140,140)", "rgb(170,170,170)" ],

    [ 115*scale, 215*scale, // logo dark blue
      -Math.PI*.78, 20*scale, 
      "rgb(190,190,190)", "rgb(200,200,200)" ],
  
    [ 145*scale, 180*scale, // logo dark blue
      Math.PI*.58, 12*scale, 
      "rgb(150,150,150)", "rgb(170,170,170)" ],
  
    [ 65*scale, 170*scale, // logo dark blue
      Math.PI*.5, 23*scale, 
      "rgb(210,210,210)", "rgb(220,220,220)" ],

    [ 85*scale, 120*scale, // logo dark blue
      Math.PI*.585, 14*scale, 
      "rgb(140,140,140)", "rgb(170,170,170)" ],

    [ 115*scale, 225*scale, // logo dark blue
      Math.PI*.78, 17*scale, 
      "rgb(190,190,190)", "rgb(200,200,200)" ],

    [ 155*scale, 180*scale, // logo dark blue
      Math.PI*.28, 12*scale, 
      "rgb(210,210,210)", "rgb(220,220,220)" ],
  
    [ 45*scale, 170*scale, // logo dark blue
      Math.PI*.21, 19*scale, 
      "rgb(210,210,210)", "rgb(220,220,220)" ],

    [ 120*scale, 225*scale, // logo dark blue
      Math.PI*.38, 17*scale, 
      "rgb(190,190,190)", "rgb(200,200,200)" ],

    [ 105*scale, 170*scale, // logo dark blue
      -Math.PI*.21, 19*scale, 
      "rgb(210,210,210)", "rgb(220,220,220)" ],

    [ 130*scale, 225*scale, // logo dark blue
      -Math.PI*.38, 17*scale, 
      "rgb(170,170,170)", "rgb(200,200,200)" ],

    [ 140*scale, 275*scale, // logo dark blue
      Math.PI*.4, 17*scale, 
      "rgb(170,170,170)", "rgb(200,200,200)" ],

    [ -70*scale, 495*scale, // logo dark blue
      -Math.PI*.65, 15*scale, 
      "rgb(170,170,170)", "rgb(200,200,200)" ],

    [ -20*scale, 425*scale, // logo dark blue
      -Math.PI*.75, 12*scale, 
      "rgb(150,150,150)", "rgb(200,200,200)" ],

    [ +50*scale, 325*scale, // logo dark blue
      -Math.PI*.95, 12*scale, 
      "rgb(150,150,150)", "rgb(170,170,170)" ],

    [ +70*scale, 305*scale, // logo dark blue
      -Math.PI*.98, 14*scale, 
      "rgb(140,140,140)", "rgb(160,160,160)" ],

    [ +30*scale, 285*scale, // logo dark blue
      -Math.PI*.95, 22*scale, 
      "rgb(180,180,180)", "rgb(200,200,200)" ],
  
    [ -45 *scale, 120*scale,   // grey
      Math.PI*1, 20*scale, 
      "rgb(180,180,180)", "rgb(200,200,200)" ],

    [ -18*scale, 335*scale, // logo light blue
      -Math.PI*0.05, 24*scale, 
      "rgb(210,210,210)", "rgb(220,220,220)" ],

  ];
}
