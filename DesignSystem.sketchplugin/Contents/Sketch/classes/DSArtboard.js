@import("constants.js")
@import("lib/utils.js")
@import("classes/DSLayer.js")

Sketch = require('sketch/dom')

class DSArtboard extends DSLayer {

    static getArtboardGroupsInPage(page, context, includeNone = true) {
        const artboardsSrc = page.artboards();
        const artboards = [];

        artboardsSrc.forEach(function(artboard){
            if( !artboard.isKindOfClass(MSSymbolMaster)){
              artboards.push(artboard);
            }
        });
      
        return Utils.getArtboardGroups(artboards, context);  
      }
      

    // nlayer: ref to native MSLayer Layer
    // myParent: ref to parent DSLayer
    constructor(nlayer) {
        super(nlayer, undefined)
    }



}
