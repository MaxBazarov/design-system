@import("constants.js")
@import("lib/utils.js")
@import("lib/uidialog.js")
@import("classes/DSArtboard.js")

var app = undefined

class DSApp {
    constructor(context) {
        this.doc = context.document
        this.context = context
        this.UI = require('sketch/ui')
        this.Settings = require('sketch/settings');

        this.pages = {}

        this.myLayers = []
        this.artboardGroups = []
        this.symDict = {}

        this.less = undefined

        this.pagesDict = []
        this.pageIDsDict = []
    
        this.errors = []

        // init global variable
        app = this
    }

    // Tools

    log(msg) {
        if (!Constants.LOGGING) return
        log(msg)
    }

    logLayer(msg) {
        if (!Constants.LAYER_LOGGING) return
        log(msg)
    }


    logError(error) {
        log("[ ERROR ] " + error)
        this.errors.push(error)
    }

    stopWithError(error) {
        const UI = require('sketch/ui')
        UI.alert('Error', error)
        exit = true
    }

    // Public methods

    run() {
        var path = '/Users/baza/Documents/Projects/less/yellow.json'
        if (!this.loadLess(path)) return false

        this._initPages()

        this._applyLess()

        return true
    }

    // Internal

    _applyLess() {
        this._applyLessVar("brand-color-5", "Styles/Buttons/Raised/Primary/Back","fill-color")
        this._applyLessVar("brand-color-5", "Styles/Buttons/Submit/Ok/Back","fill-color")

        //this._applyTextColor("brand-color-5", "Styles/Buttons/Raised/Primary Back")
    }

    loadLess(path) {
        var error = null
        var lessJSONStr = NSString.stringWithContentsOfURL_encoding_error(NSURL.fileURLWithPath_isDirectory(path, false), NSUTF8StringEncoding, error);

        this.less = JSON.parse(lessJSONStr)
        return true
    }

    _getObjByPath(objPath){
        var names = objPath.split('/')
        var objects = this.pages
        var obj = undefined
        for(var objName of names){
            obj = objects[objName]
            if(undefined==obj) break
            objects = obj.childs
        }

        if (undefined == obj) {
            this.UI.alert("Alert", "Can not find Sketch layer by path '" + objPath + "'")
            return null
        }

        return obj
    }

    _getLessVar(lessName){
        var lessVar = this.less[lessName]
        if (undefined == lessVar) {
            this.UI.alert("Alert", "Can not find less variable for '" + lessName + "'")
            return null
        }
        return lessVar
    }

    _applyLessVar(lessName, objPath,styleType) {
        if('fill-color'==styleType) return this._applyFillColor(lessName, objPath)
    }

    _applyFillColor(lessName, objPath) {
        var color = this._getLessVar(lessName)
        if(undefined == color) return false    

        var obj = this._getObjByPath(objPath)
        if( undefined==obj)  return false
        
        let fills = obj.slayer.style.fills
        if(undefined==fills) return app.logError('No fills for '+objPath)
    
        fills =  fills.filter(function(el){return el.enabled})
        if(0==fills.length) return app.logError('No enabled fills for '+objPath)

        fills[0].color = color

        obj.slayer.sharedStyle.style = obj.slayer.style
        obj.slayer.sharedStyle.sketchObject.resetReferencingInstances()
        //var sharedStyle = obj.slayer.sharedStyle
        //sharedStyle.syncWithSharedStyle(obj.slayer.style)
    }

    _applyTextColor(lessName, objPath) {
        var color = this._getLessVar(lessName)
        if(undefined == color) return false    

        var obj = this._getObjByPath(objPath)
        if( undefined==obj)  return false
        
        let fills = obj.slayer.style.fills
        if(undefined==fills) return app.logError('No fills for '+objPath)
    
        fills =  fills.filter(function(el){return el.enabled})
        if(0==fills.length) return app.logError('No enabled fills for '+objPath)

        fills[0].color = color

        var sharedStyle = obj.slayer.sharedStyle
        obj.slayer.style.syncWithSharedStyle(sharedStyle)

    }

    _initPages() {
        const layerCollector  = new DSLayerCollector() 

        this.doc.pages().forEach(function (page) {
            let sartboards = DSArtboard.getArtboardGroupsInPage(page, this.context, false)
            if (!sartboards.length) return

            log("_initPages: page="+page.name())

            let artboards = layerCollector.collectArtboardsLayers(" ",sartboards)

            this.pages[page.name()] = {
                name: page.name(),
                childs: artboards
            } 

        }, this)

    }


}
