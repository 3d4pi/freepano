/*
 * freepano - WebGL panorama viewer
 *
 * Copyright (c) 2014 FOXEL SA - http://foxel.ch
 * Please read <http://foxel.ch/license> for more information.
 *
 *
 * Author(s):
 *
 *      Luc Deschenaux <l.deschenaux@foxel.ch>
 *
 *
 * Contributor(s):
 *
 *      Alexandre Kraft <a.kraft@foxel.ch>
 *      Kevin Velickovic <k.velickovic@foxel.ch>
 *
 *
 * This file is part of the FOXEL project <http://foxel.ch>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *
 * Additional Terms:
 *
 *      You are required to preserve legal notices and author attributions in
 *      that material or in the Appropriate Legal Notices displayed by works
 *      containing it.
 *
 *      You are required to attribute the work as explained in the "Usage and
 *      Attribution" section of <http://foxel.ch/license>.
 */

function Texture(options) {
  if (!(this instanceof Texture)) {
    return new Texture(options);
  }
  $.extend(true,this,this.defaults,options);
  this.init();
}

$.extend(true,Texture.prototype,{
  defaults: {
    dirName: null,
    baseName: null,
    options: {
      wrapS: THREE.clampToEdgeWrapping,
      wrapT: THREE.clampToEdgeWrapping,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter
    },
    columns: 2,
    rows: 1,
    getTile: function(col,row) {
      return this.dirName+'/'+this.baseName+'_'+row+'_'+col+'.jpg';
    }
  },
  init: function texture_init(){
  }
});

function Sphere(options) {
  if (!(this instanceof Sphere)) {
    return new Sphere(options);
  }
  $.extend(true,this,this.defaults,options);
  this.init();
}

$.extend(true,Sphere.prototype,{
  defaults: {
    done: false,
    radius: 15,
    widthSegments: 36,
    heightSegments: 18,
    texture: null,
    object3D: null,
    callback: function(){}
  },

  init: function sphere_init(callback) {
    var sphere=this;
    if (sphere.texture!==undefined) {
      if (!(sphere.texture instanceof Texture)) {
        sphere.texture=new Texture(sphere.texture);
        sphere.done=false;
      }
    }
    sphere.object3D=new THREE.Object3D();
    sphere.build(callback);
  },

  build: function sphere_build(callback) {
    var sphere=this;
    var columns=sphere.texture.columns;
    var rows=sphere.texture.rows;
    var phiLength=2*Math.PI/columns;
    var thetaLength=Math.PI/rows;
    var remaining=columns*rows;
    var transform=new THREE.Matrix4().makeScale(-1,1,1);
    for(var col=0; col<columns; ++col) {
      for(var row=0; row<rows; ++row) {
        var geometry=new THREE.SphereGeometry(sphere.radius,sphere.widthSegments,sphere.heightSegments,col*phiLength,phiLength,row*thetaLength,thetaLength);
        geometry.applyMatrix(transform);

        var tileTexture=THREE.ImageUtils.loadTexture(sphere.texture.getTile(col,row),new THREE.UVMapping(),function(){
          --remaining;
          if (!remaining) {
            setTimeout(function(){
              sphere.texture.height=rows*tileTexture.image.height;
              sphere.r=sphere.texture.height/Math.PI;
              sphere.done=true;
              if (callback) {
                callback.call(sphere);
              } else {
                sphere.callback()
              }
            },0);
          }
        },
        function(){
          $.notify('Cannot load panorama.');
        });
        $.extend(tileTexture,sphere.texture.options);

        var material=new THREE.MeshBasicMaterial({
           map: tileTexture,
//           wireframe: true,
//           color: 'white'
        });
        mesh=new THREE.Mesh(geometry,material);
        sphere.object3D.add(mesh);
      }
    }
  }
});

function Camera(options) {
  if (!(this instanceof Camera)){
    return new Camera(options);
  }
  $.extend(true,this,this.defaults,options);
  this.init();
}

$.extend(true,Camera.prototype,{
    defaults: {
      fov: 120,
      nearPlane: 0.1,
      farPlane: Sphere.prototype.defaults.radius+1,
      zoom: {
        max: 1.5,
        min: 0.5,
        step: 0.05,
        current: 1
      }
    },
    init: function camera_init() {
      var camera=this;
      camera.instance=new THREE.PerspectiveCamera(camera.fov,$(camera.panorama.container).width()/$(camera.panorama.container).height(), camera.nearPlane, camera.farPlane);
      camera.target=new THREE.Vector3(0,0,0);
    }
});

var pano_count=0;
function Panorama(options) {
  if (!(this instanceof Panorama)) {
    return new Panorama(options);
  }
  $.extend(true,this,this.defaults,options);
  this.num=pano_count++;

  // Check if default_tile option is specified
  if(this.default_tile !== undefined && this.default_tile.length > 0 && this.default_tile !== null)
  {

      //If specified define default panorama based on it
      $.extend( this.sphere.texture, this.tiles[ this.default_tile ] );

  } else {

      // If not specified define default panorama based on the first element
      for(first in this.tiles) break;
      $.extend( this.sphere.texture, this.tiles[ first ] );
  }

  this.init();
  $(this.container).data('pano',this);
}

$.extend(true,Panorama.prototype,{
    defaults: {
      mode: {},
      container: 'body',
      fov: {
        start: 120,
        min: 1,
        max: 120
      },
      camera: undefined,
      sphere: undefined,
      postProcessing: undefined,
      lon: 0,
      lat: 0,
      phi: 0,
      theta: 0,
      callback: function(){},
      rotation: {
        heading: 0,
        tilt: 0,
        roll: 0,
        step: 0.1
      },
      limits: {
        lat: {
            min: -85,
            max: 85
        }
      }
    },

    ready: function() {
        // can be implemented in submodules.
    },

    init: function panorama_init(){
      var panorama=this;

      panorama.scene=new THREE.Scene();

      if (!(panorama.camera instanceof Camera)) {
        panorama.camera=new Camera($.extend(true,{
          panorama: panorama,
          fov: panorama.fov.start
        },panorama.camera));
      }

      if (panorama.sphere!==undefined) {
        if (!(panorama.sphere instanceof Sphere)) {
          panorama.sphere=new Sphere($.extend(true,{
            callback: function(){
              panorama.resize();
              panorama.callback();
              panorama.ready();
            }
          },panorama.sphere));
        }
        panorama.scene.add(panorama.sphere.object3D);
      }

      panorama.updateRotationMatrix();

      if (!(panorama.renderer instanceof THREE.WebGLRenderer)) {
        try {
          panorama.renderer=new THREE.WebGLRenderer(panorama.renderer);
          panorama.renderer.renderPluginsPre=[];
          panorama.renderer.renderPluginsPost=[];
        } catch(e) {
          try {
            panorama.renderer=new THREE.CanvasRenderer();
            panorama.renderer.renderPluginsPre=[];
            panorama.renderer.renderPluginsPost=[];
            $.notify('Cannot initialize WebGL. Canvas 2D used instead, please expect slow rendering results.',{type:'warning',sticky:false});
          } catch (ex) {
            $.notify('Cannot initialize WebGL neither fallback on Canvas 2D.');
            $.notify('Please check your browser configuration and/or compatibilty with HTML5 standards.',{type:'warning'});
            console.log(e);
            return;
          }
        }
      }

      panorama.renderer.setSize($(panorama.container).width(),$(panorama.container).height());
      $(panorama.container).append(panorama.renderer.domElement);

      if (panorama.postProcessing) {

        // renderer pass
        panorama.composer=new THREE.EffectComposer(panorama.renderer);
        panorama.composer.addPass(new THREE.RenderPass(panorama.scene,panorama.camera.instance));

        // shader passes
        $.each(panorama.postProcessing,function() {
          if (this instanceof Boolean) {
            return true;
          }
          this.pass=new THREE.ShaderPass(this.shader);
          this.pass.enabled=this.enabled;
          var pass=this.pass;
          $.each(this.uniforms,function(uniform,set){
            set.call(pass.uniforms[uniform],panorama);
          });
          panorama.composer.addPass(this.pass);
        });

        if (this.postProcessing.renderToScreen!==false) {
          var effect=new THREE.ShaderPass(THREE.CopyShader);
          effect.renderToScreen=true;
          this.composer.addPass(effect);
        }
      }

      this.eventsInit();
    },

    updateRotationMatrix: function panorama_updateRotationMatrix() {
      var panorama=this;
      panorama.rotation.matrix=new THREE.Matrix4();
      panorama.rotation.matrix.makeRotationAxis((new THREE.Vector3(0, 1, 0)).normalize(),THREE.Math.degToRad(this.rotation.heading));
      panorama.rotation.matrix.multiply((new THREE.Matrix4()).makeRotationAxis((new THREE.Vector3(1,0,0)).normalize(),THREE.Math.degToRad(this.rotation.tilt)));
      panorama.rotation.matrix.multiply((new THREE.Matrix4()).makeRotationAxis((new THREE.Vector3(0,0,1)).normalize(),THREE.Math.degToRad(this.rotation.roll)));

    },

    eventsInit: function panorama_eventsInit(){
      var panorama=this;
      var canvas=$('canvas:first',this.container);
      $(this.container)
      .off('.panorama'+this.num)
      .on('mousedown.panorama'+this.num, canvas, function(e){panorama.mousedown(e);})
      .on('mousemove.panorama'+this.num, canvas, function(e){panorama.mousemove(e)})
      .on('mouseup.panorama'+this.num, canvas, function(e){panorama.mouseup(e)})
      .on('mousewheel.panorama'+this.num, canvas, function(e){panorama.mousewheel(e)})
      .on('zoom.panorama'+this.num, canvas, function(e,zoom){panorama.zoom(e,zoom)});
      $(window).on('resize.panorama'+this.num, function(e){panorama.resize(e)});
    },

    pinch: function panorama_pinch(e){
      console.log(e);
    },

    worldToTextureCoords:function(worldCoords){
      this.inversePanoramaRotationMatrix=new THREE.Matrix4();
      this.inversePanoramaRotationMatrix.getInverse(this.sphere.object3D.matrix);

      // world to texture coordinates
      var v=worldCoords.clone().applyMatrix4(this.inversePanoramaRotationMatrix);
      var r=v.length();
      var phi=Math.acos(v.z/r);
      var theta=Math.atan2(v.y,v.x);

      var longitude=theta/(Math.PI/180);
      var latitude=phi/(Math.PI/180);

      return {
        longitude: longitude,
        latitude: latitude,
        left: (180+longitude)/360,
        top: (180-latitude)/180
      }
    },

    textureToWorldCoords: function(x,y) {
        var theta=(x*360-180)*(Math.PI/180);
        var phi=(y*180-180)*(Math.PI/180);
        var v=new THREE.Vector4();
        v.x=-this.sphere.radius*Math.sin(phi)*Math.cos(theta);
        v.y=-this.sphere.radius*Math.sin(phi)*Math.sin(theta);
        v.z=this.sphere.radius*Math.cos(phi);
        v.applyMatrix4(this.sphere.object3D.matrix);
        var r=v.length();
        var phi=Math.acos(v.z/r);
        var theta=Math.atan2(v.y,v.x);
        var longitude=theta/(Math.PI/180);
        var latitude=phi/(Math.PI/180);
        return {
          coords: v,
          longitude: longitude,
          latitude: latitude
        }
    },

    getMouseCoords: function panorama_getMouseCoords(e) {

      this.iMatrix=new THREE.Matrix4();
      this.iMatrix.getInverse(this.camera.instance.projectionMatrix.clone());

      var mouseNear=new THREE.Vector4(0,0,0,1);
      var offset=$(this.renderer.domElement).offset();
      mouseNear.x=-1+2*((e.clientX-offset.left)/this.renderer.domElement.width);
      mouseNear.y=1-2*((e.clientY-offset.top)/this.renderer.domElement.height)
      mouseNear.z=1;

      var mouseFar=mouseNear.clone();
      mouseFar.z=-1;

      mouseNear.applyMatrix4(this.iMatrix);
      mouseFar.applyMatrix4(this.iMatrix);

      mouseNear.x/=mouseNear.w;
      mouseNear.y/=mouseNear.w;
      mouseNear.z/=mouseNear.w;
      mouseNear.w=1;

      mouseFar.x/=mouseFar.w;
      mouseFar.y/=mouseFar.w;
      mouseFar.z/=mouseFar.w;
      mouseFar.w=1;

      this.mouseCoords=new THREE.Vector4().subVectors(mouseFar,mouseNear);
      this.mouseCoords.w=1;

      var r=this.mouseCoords.length();
      var phi=Math.acos(this.mouseCoords.x/r);
      var theta=Math.atan2(this.mouseCoords.y,this.mouseCoords.z);

      this.mouseCoords.x=-this.sphere.radius*Math.sin(phi)*Math.cos(theta);
      this.mouseCoords.y=-this.sphere.radius*Math.sin(phi)*Math.sin(theta);
      this.mouseCoords.z=-this.sphere.radius*Math.cos(phi);
      this.mouseCoords.phi=phi;
      this.mouseCoords.theta=theta;

      return {
        lon: this.mouseCoords.phi/(Math.PI/180),
        lat: this.mouseCoords.theta/(Math.PI/180)
      }
    },

    mousedown: function panorama_mousedown(e){
      this.mode.mousedown=true;
      if (isLeftButtonDown(e)) {
        e.preventDefault();
        this.mousedownPos={
          lon: this.lon,
          lat: this.lat,
          mouseCoords: this.getMouseCoords(e),
          textureCoords: this.worldToTextureCoords(this.mouseCoords)
        };
        var wc=this.textureToWorldCoords(this.mousedownPos.textureCoords.left,this.mousedownPos.textureCoords.top);
        console.log(this.mousedownPos.textureCoords.longitude+'=='+wc.longitude,this.mousedownPos.textureCoords.latitude+'=='+wc.latitude);
        //TODO something is wrong: this.mousedownPos.textureCoords.latitude != wc.latitude
      }
    },

    mousemove: function panorama_mousemove(e){
      if (!this.sphere.done) {
        return;
      }
      if (this.mode.mousedown) {
        e.preventDefault();
        if (isLeftButtonDown(e)) {
          var mouseCoords=this.getMouseCoords(e);
          this.lon=this.mousedownPos.lon-(mouseCoords.lon-this.mousedownPos.mouseCoords.lon);
          this.lat=this.mousedownPos.lat-(mouseCoords.lat-this.mousedownPos.mouseCoords.lat);
          this.drawScene();
        }
      }
    },

    mouseup: function panorama_mouseup(e){
      this.mode.mousedown=false;
    },

    getZoom: function panorama_getZoom() {
      var visible;
      visible=this.sphere.texture.height*this.camera.instance.fov/180;
      return this.renderer.domElement.height/visible;
    },

    getFov: function() {
      var fov=360*((this.renderer.domElement.width*this.camera.zoom.current/4)/this.sphere.texture.height*2);
      if (fov>this.fov.max) {
        var fovRatio=fov/this.fov.max;
        fov=this.fov.max;
        this.camera.zoom.current/=fovRatio;
      }
      fov=fov/(this.renderer.domElement.width/this.renderer.domElement.height);
      if (fov>this.fov.max){
        var fovRatio=fov/this.fov.max;
        fov=this.fov.max;
        this.camera.zoom.current/=fovRatio;
      }
      //console.log(this.camera.zoom.current,this.getZoom());
      return fov;
    },

    zoomUpdate: function panorama_zoomUpdate() {
      var fov=this.camera.instance.fov;
      this.camera.zoom.current=1/Math.min(this.camera.zoom.max,Math.max(this.camera.zoom.min,1/this.camera.zoom.current));
      this.camera.instance.fov=this.getFov();
      if (fov!=this.camera.instance.fov) {
        this.camera.instance.updateProjectionMatrix();
        this.drawScene();
      }
    },

    zoom: function panorama_zoom(e,scale) {
      this.camera.zoom.current=1/scale;
      this.zoomUpdate();
    },

    mousewheel: function panorama_mousewheel(e){
      if (!this.sphere.done) {
        return;
      }
      var needDrawScene = false;
      if (e.shiftKey) {
        this.rotation.tilt+=e.deltaX*this.rotation.step;
        this.updateRotationMatrix();
        needDrawScene = true;
      }
      if (e.altKey) {
        this.rotation.roll+=e.deltaY*this.rotation.step;
        this.updateRotationMatrix();
        needDrawScene = true;
      }
      if (needDrawScene) {
        //console.log('lon ['+this.lon+'] lat ['+this.lat+'] tilt ['+this.rotation.tilt+'] roll ['+this.rotation.roll+']');
        this.drawScene();
        return;
      }
      this.camera.zoom.current-=e.deltaY*this.camera.zoom.step;
      this.zoomUpdate();
    },

    drawScene: function panorama_drawScene(){
      if (!this.sphere.done) {
        return;
      }
      var panorama=this;
      requestAnimationFrame(function(){panorama.render()});
    },

    render: function render() {
      if (!this.sphere.done) {
        return;
      }
      this.lat=Math.max(this.limits.lat.min,Math.min(this.limits.lat.max,this.lat));

      var rotationMatrix=new THREE.Matrix4();
      rotationMatrix.multiply((new THREE.Matrix4()).makeRotationAxis((new THREE.Vector3(1,0,0)).normalize(),THREE.Math.degToRad(this.lat)));
      rotationMatrix.multiply((new THREE.Matrix4()).makeRotationAxis((new THREE.Vector3(0,1,0)).normalize(),THREE.Math.degToRad(this.lon)));
      this.sphere.object3D.matrix.copy(this.rotation.matrix.clone());
      this.sphere.object3D.applyMatrix(rotationMatrix);


      if (this.postProcessing && this.postProcessing.enabled) {
        this.composer.render(this.scene,this.camera.instance);
      } else {
        this.renderer.render(this.scene,this.camera.instance);
      }
    },

    resize: function panorama_resize(e){
      var panorama=this;
      this.camera.instance.aspect=$(this.container).width()/$(this.container).height();
      this.camera.instance.updateProjectionMatrix();
      this.renderer.setSize($(this.container).width(),$(this.container).height());
      if (this.postProcessing) {
        this.composer.setSize($(this.container).width(),$(this.container).height());
        $.each(this.postProcessing,function() {
          var pass=this.pass;
          if (pass) {
            $.each(this.uniforms,function(uniform,set){
              set.call(pass.uniforms[uniform],panorama);
            });
          }
        });
      }
      setTimeout(function(){
        if (!panorama.sphere.done) {
          return;
        }
        panorama.zoomUpdate();
        panorama.drawScene();
      },0);
    }
});

function isLeftButtonDown(e) {
  return ((e.buttons!==undefined && e.buttons==1) || (e.buttons===undefined && e.which==1));
}

$.fn.panorama=function(options){
  $(this).each(function(){
    if ($(this).data('pano')) {
    } else {
      var panorama=new Panorama($.extend(true,{},options,{
        container: this
      }));
    }
  });
  return this;
}
