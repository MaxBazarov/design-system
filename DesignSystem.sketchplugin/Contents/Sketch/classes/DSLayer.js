@import("constants.js")
@import("lib/utils.js")
@import("exporter/child-finder.js")

var ResizingConstraint = {
    NONE: 0,
    RIGHT: 1 << 0,
    WIDTH: 1 << 1,
    LEFT: 1 << 2,
    BOTTOM: 1 << 3,
    HEIGHT: 1 << 4,
    TOP: 1 << 5
}


Sketch = require('sketch/dom')

class DSLayer {

    // nlayer: ref to native MSLayer Layer
    // myParent: ref to parent DSLayer
    constructor(nlayer,myParent) {
        this.nlayer = nlayer
        this.name = nlayer.name() + ""
        this.parent = myParent
        this.objectID = nlayer.objectID()
        this.originalID = undefined
        this.symbolMaster = undefined
        this.slayer = Sketch.fromNative(nlayer)
        this.artboard = myParent ? myParent.artboard : this
    
        // define type    
        this.isArtboard = false
        this.isGroup = false
        this.isSymbolInstance = false

        this.customLink = undefined

        if(nlayer.isKindOfClass(MSLayerGroup)) this.isGroup = true
        if(nlayer.isKindOfClass(MSSymbolMaster)) this.isGroup = true
        if(nlayer.isKindOfClass(MSSymbolInstance)){
            this.isSymbolInstance = true
            this.symbolMaster = nlayer.symbolMaster()
        }
        if(nlayer.isKindOfClass(MSArtboardGroup))  this.isArtboard = true
        
        this.childs = []  
        this.hotspots = [] 
        
        this.frame = undefined
        this.orgFrame = undefined            
    }


}

class DSLayerCollector {
    constructor() {        
    }
    
    collectArtboardsLayers(prefix,sartboards){                
        log( prefix+"collectArtboardsLayers: running...")
        const layers = {}
        sartboards.forEach(function (artboardGroup) {
            const artboard = artboardGroup[0].artboard;
            let child = this.getCollectLayer(prefix+" ",artboard,undefined)
            layers[child.name] = child            
            log( prefix+"collectArtboardsLayers: find artboard "+child.name)
        }, this);
        
        log( prefix+"collectArtboardsLayers: done!")
        return layers
    }

    getCollectLayer(prefix,nlayerOrg,myParent){
        let nlayer = nlayerOrg
        
        let myLayer = undefined
        if(myParent==undefined)
            myLayer = new DSArtboard(nlayer)
        else
            myLayer = new DSLayer(nlayer,myParent) 
    

        app.log(prefix + nlayer.name()+ " "+nlayer.objectID())

        if(myLayer.isGroup){
            myLayer.childs =  this.getCollectLayerChilds(prefix+" ",nlayer.layers(),myLayer)
        }
          
        return myLayer
    }

    getCollectLayerChilds(prefix,layers, myParent){
        const newChilds = {}     

        layers.forEach(function (childLayer) {                      
            const newLayer = this.getCollectLayer(prefix+" ",childLayer,myParent)
            if(newLayer==null) return

            newChilds[newLayer.name] = newLayer            
        }, this);
        return newChilds
    }


}
