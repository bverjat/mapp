import Ember from 'ember';
import d3lper from 'mapp/utils/d3lper';
import {isChrome} from 'mapp/utils/browser-check';
import zoom2 from 'mapp/utils/d3-zoom2';

let zoom;

export default Ember.Mixin.create({

  zoomInit(d3g) {

    // DRAG & ZOOM
    zoom = zoom2()
      .scaleExtent([1, 12])
      .band(0.5)
      .on("zoom", (scale, translate) => {
        
        this.zoomAndDrag(scale, translate);

      })
      .scale(this.get('graphLayout.zoom'));
    
    this.addObserver('graphLayout.zoom', () => zoom.scale(this.get('graphLayout.zoom')) );
    
    let updateTxTy = () => {
      let p = this.get('projection');
      zoom.translate([
        this.get('relTx'),
        this.get('relTy')
      ]);
    }
    this.addObserver('relTx', 'relTy', updateTxTy);
    updateTxTy();

    d3g.call(zoom);

  },

  relTx: Ember.computed('graphLayout.tx', {
    get() {
      return this.get('graphLayout.tx')*this.get('projection').initialTranslate[0];
    },
    set(k, v) {
      this.set('graphLayout.tx', v/this.get('projection').initialTranslate[0]);
      return v;
    }
  }),

  relTy: Ember.computed('graphLayout.ty', {
    get() {
      return this.get('graphLayout.ty')*this.get('projection').initialTranslate[1];
    },
    set(k, v) {
      this.set('graphLayout.ty', v/this.get('projection').initialTranslate[1]);
      return v;
    }
  }),

  zoomAndDrag(scale, translate) {
    
    let mapG = this.d3l().select("g.map"),
        projection = this.get('projection'),
        t = projection.initialTranslate,
        ds = projection.scale() / projection.resolution,
        rs = scale/ds,
        tx = projection.translate()[0]*rs - t[0] * scale,
        ty = projection.translate()[1]*rs - t[1] * scale;
    
    mapG
      .attr({
        tx: translate[0],
        ty: translate[1],
        s: scale
      })
      .transition().duration(400).ease("cubic-out")
      .attr({
        "transform": `${d3lper.translate({tx: translate[0] - tx, ty: translate[1] - ty})} scale(${rs})`
      })
      .each("end", () => {
        
        mapG.attr("transform", null)
          .selectAll("g.layers .shape")
          .attr("transform", null);
        
        this.get('graphLayout').beginPropertyChanges();
        
        this.setProperties({
          "graphLayout.zoom": parseFloat(mapG.attr("s")),
          relTx: parseFloat(mapG.attr("tx")),
          relTy: parseFloat(mapG.attr("ty"))
        });
        
        this.scaleProjection(projection);
        
        this.get('graphLayout').endPropertyChanges();
        
        this.projectAndDraw();
        
      });
    
    if (isChrome()) {
      mapG.selectAll("g.layers .shape").each(function() {
        
        let el = d3.select(this),
          elBox = el.node().getBBox(),
          cx = elBox.x + elBox.width / 2,
          cy = elBox.y + elBox.height / 2;
      
        el.attr("transform", `${d3lper.translate({tx: -cx*(1/rs-1), ty: -cy*(1/rs-1)})} scale(${1/rs})`);
        
      });
    }
    
    
  },
  
  zoomAndDragChange: function() {
    
    let projection = this.get('projection'),
        ds = projection.scale() / projection.resolution,
        tx = projection.translate()[0] - projection.initialTranslate[0]*ds,
        ty = projection.translate()[1] - projection.initialTranslate[1]*ds,
        shiftX = tx - this.get('relTx'),
        shiftY = ty - this.get('relTy');
   
    if (Math.abs(ds - this.get('graphLayout.zoom')) > 0.1 
        || Math.abs(shiftX) > 0.1 || Math.abs(shiftY) > 0.1) {
      
      let {w, h} = this.getSize(),
		      vOf = this.get('graphLayout').vOffset(h),
          hOf = this.get('graphLayout').hOffset(w),
          m = this.get('graphLayout.margin');
       
      if (Math.abs(shiftX) <= 0.1 && Math.abs(shiftY) <= 0.1) {
        zoom.toPoint(
          this.get('graphLayout.zoom'),
          (w - 2*hOf - m.l - m.t) / 2 + hOf + m.l,
          (h - 2*vOf - m.t - m.b) / 2 + vOf + m.t
        );
      } else {
        zoom.toScaleAndTranslate(
          this.get('graphLayout.zoom'),
          this.get('relTx'),
          this.get('relTy')
        );
      }
      
    }
    
  }.observes('graphLayout.zoom', 'graphLayout.tx', 'graphLayout.ty')

});
