/*                                                                                                                                                                                                                 
 * freepano - WebGL panorama viewer
 *
 * Copyright (c) 2015 FOXEL SA - http://foxel.ch
 * Please read <http://foxel.ch/license> for more information.
 *
 *
 * Author(s):
 *
 *      Luc Deschenaux <luc.deschenaux@freesurf.ch>
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
 
// this file must be loaded after jquery.freepano.poi.js
// this file must be loaded before jquery.freepano.poi.loader.js

function POI_thumb(options) {
  if (!this instanceof POI_thumb) {
    return new POI_thumb(options);
  }
  $.extend(true,this,POI_thumb.prototype.defaults,options);
  this.init();
}

$.extend(POI_thumb.prototype,{

    defaults: {
      width: 64,
      height: 64,
      flipY: false,  // note: when flipY is true, canvas is replaced
      renderTargetOptions: {
        minFilter: THREE.LinearFilter,
        stencilBuffer: false,
        depthBuffer: false
      },
      cameraOptions: {
        fov: 30,
        nearPlane: Camera.prototype.defaults.nearPlane,
        farPlane: Camera.prototype.defaults.farPlane
      }
    },

    init: function poiThumb_init() {

      var poiThumb=this;
      var panorama=poiThumb.panorama;

      poiThumb.renderTarget=new THREE.WebGLRenderTarget(
        poiThumb.width,
        poiThumb.height,
        poiThumb.renderTargetOptions
      );

      poiThumb.scene=new THREE.Scene();

      poiThumb.camera=new THREE.PerspectiveCamera(
        poiThumb.cameraOptions.fov,
        poiThumb.width/poiThumb.height,
        poiThumb.cameraOptions.nearPlane,
        poiThumb.cameraOptions.farPlane
      );

    }, // poiThumb_init

    // update panorama.poiThumb on panorama ready
    on_panorama_ready: function poiThumb_onPanoramaReady(e){

      var panorama=this;
      var poiThumb=panorama.poiThumb;

      poiThumb.update();

      poiThumb.dispatch('ready');

    }, // poiThumb_onPanoramaReady

    update: function poiThumb_update(name){

      var poiThumb=this;
      var panorama=poiThumb.panorama;

      var poilist;
      if (name){
        // if poiThumb.image exists, update
        if (panorama.poi.list[name].thumb) {
          panorama.poi.list[name].thumb.init();
          return;
        }
        poilist={};
        poilist[name]=panorama.poi.list[name];
      } else {
        poilist=panorama.poi.list;
      }

      // borrow panorama sphere
      poiThumb.scene.add(panorama.sphere.object3D);

      $.each(poilist,function(name){
        var poi=this;
        if (!poi.thumb) {
          var canvas=document.createElement('canvas');
          canvas.className='poithumb';
          panorama.poi.list[name].thumb=new poiThumb.image({
            panorama: panorama,
            poiThumb: poiThumb,            
            poiname: name,
            canvas: canvas
          });
        }
      });

      panorama.scene.add(panorama.sphere.object3D);

    }, // poiThumb_update

    getImage: function poiThumb_getImage(name){

      var poiThumb=this;
      var panorama=poiThumb.panorama;
      var poi=panorama.poi.list[name];
    
      // borrow panorama sphere
      poiThumb.scene.add(panorama.sphere.object3D);

      var canvas=poiThumb.canvas||document.createElement('canvas');
      var image=new poiThumb.image({
            panorama: panorama,
            poiThumb: poiThumb,
            poiname: name,
            canvas: canvas
       });
       
      panorama.scene.add(panorama.sphere.object3D);

      return image;

    }, // poiThumb_getImage

    image: function poiThumb_image(options){
      if (!this instanceof poiThumb_image) {
        return new poiThumb_image(options);
      }
      $.extend(true,this,poiThumb_image.defaults,options);
      this.init();
    },

    // instantiate panorama.poiThumb on panorama init
    on_panorama_preinit: function poiThumb_on_panorama_preinit() {
      var panorama=this;
      panorama.poiThumb=new POI_thumb({panorama: panorama});
    } // on_panorama_preinit

});

// extend POI_thumb.image prototype
$.extend(true,POI_thumb.prototype.image.prototype,{

    defaults: {
    },

    init: function poiThumb_image_init() {
      var image=this;
      var panorama=this.panorama;
      var poiThumb=this.poiThumb;

      var vector;
      if (panorama.poi.list[image.poiname].instance) {
          vector=panorama.poi.list[image.poiname].instance.object3D.position;
      } else {
        // compute object position
        var poi=panorama.poi.list[image.poiname];
        var coords=poi.coords;
        var phi=coords.lon*Math.PI/180;
        var theta=coords.lat*Math.PI/180;
        vector=new THREE.Vector3(0,0,-1);
        vector.applyAxisAngle(new THREE.Vector3(1,0,0),theta);
        vector.applyAxisAngle(new THREE.Vector3(0,1,0),-phi);
      }

      poiThumb.camera.lookAt(vector);
      // render thumbnail to framebuffer
      panorama.renderer.render(poiThumb.scene,poiThumb.camera,poiThumb.renderTarget,true);

      // read thumbnail image data
      var w=poiThumb.width;
      var h=poiThumb.height;
      image.canvas.width=w;
      image.canvas.height=h;
      var ctx=image.canvas.getContext('2d');

      var bitmap=new Uint8Array(w*h*4);
      image.imageData=ctx.createImageData(w,h);

      var gl=panorama.renderer.getContext();                                                                    
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);

      image.imageData.data.set(bitmap);

      // draw thumbnail
      ctx.putImageData(image.imageData,0,0);

      if (poiThumb.flipY) {
        // flip image vertically
        var canvas=document.createElement('canvas');
        canvas.height=h;
        canvas.width=w;
        ctx=canvas.getContext('2d');
        ctx.scale(1,-1);
        ctx.drawImage(image.canvas,0,0,w,-h);
        image.canvas=canvas;   
      }
      
      image.ctx=ctx;

    } // POIThumb.image_init

});

// subscribe to Panorama events
Panorama.prototype.dispatchEventsTo(POI_thumb.prototype);

// setup event dispatcher for POI_thumb
setupEventDispatcher(POI_thumb.prototype);

