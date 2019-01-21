@import("constants.js")
@import("lib/utils.js")
@import("lib/uidialog.js")
@import("classes/DSArtboard.js")

var app = undefined
var Settings = require('sketch/settings')


class DSApp {
    constructor(context) {
        this.doc = context.document
        this.context = context
        this.UI = require('sketch/ui')
        
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

        // load settings
        this.pathToLess = Settings.settingForKey(SettingKeys.PLUGIN_PATH_TO_LESS)
        if(undefined==this.pathToLess) this.pathToLess = ''        
        this.pathToTokens = Settings.settingForKey(SettingKeys.PLUGIN_PATH_TO_TOKENS)
        if(undefined==this.pathToTokens) this.pathToTokens = ''
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
        if(!this._showDialog()) return false

        this._initPages()


        if( !this.loadLess()) return false        
        if( !this._applyLess() ) return false

        return true
    }

    // Internal


    _showDialog(){
        const dialog = new UIDialog("Apply LESS file to Sketch styles",NSMakeRect(0, 0, 500, 200),"Apply")

        dialog.addTextInput("pathToLess","Path to LESS file",this.pathToLess,'e.g. ~/Work/green.less',450)  
        dialog.addButton("selectPathToLess","Select",function(){
          const newPath = Utils.askFilePath(dialog.views['pathToLess'].stringValue()+"")
          if (newPath != null) {
            dialog.views['pathToLess'].setStringValue(newPath)
          }
          return
        })

        dialog.addTextInput("pathToTokens","Path to tokens JSON file",this.pathToTokens,'e.g. ~/Work/tokens.json',450)  
        dialog.addButton("selectPathToTokens","Select",function(){
          const newPath = Utils.askFilePath(dialog.views['pathToTokens'].stringValue()+"")
          if (newPath != null) {
            dialog.views['pathToTokens'].setStringValue(newPath)
          }
          return
        })

        while(true){
            const result = dialog.run()        
            if(!result) return false
    
            this.pathToLess = dialog.views['pathToLess'].stringValue()+""
            if(""==this.pathToLess) continue
            this.pathToTokens = dialog.views['pathToTokens'].stringValue()+""
            if(""==this.pathToTokens) continue

            break
        }
    
        dialog.finish()

        Settings.setSettingForKey(SettingKeys.PLUGIN_PATH_TO_LESS, this.pathToLess)
        Settings.setSettingForKey(SettingKeys.PLUGIN_PATH_TO_TOKENS, this.pathToTokens)

        return true
    }


    _applyLess() {
        var tokensStr = Utils.readFile(this.pathToTokens)
        var tokens = JSON.parse(tokensStr)

        for(var tokenName of Object.keys(tokens)){
            // skip comments
            if(tokenName.indexOf("__")==0) continue

            log('_applyLess: tokenID: '+tokenName)

            // work with token
            var token = tokens[tokenName]
            var styleValue = ""            

            // get info from LESS file 
            var lessName =  token['less']
            if(lessName.indexOf("__")==0) continue // Less Variable not defined
            var styleValue = this._getLessVar(lessName)            

            // get sketch object by path
            var sketchPaths = token['sketch']
            if(!Array.isArray(sketchPaths))
                sketchPaths = [sketchPaths]

            for(var sketchPath of sketchPaths){
                if(sketchPath.indexOf("__")==0) continue //Path to Sketch object undefined
                var sketchObj = this._getObjByPath('sketchPath')

                // apply style
                var styleType = this._getStyleByTokenName(tokenName)

                if('fill-color'==styleType) return this._applyFillColor(tokenName,sketchObj,styleValue)
                else if('text-color'==styleType) return this._applyTextColor(tokenName,sketchObj,styleValue)
                else if('border-color'==styleType) return this._applyBorderColor(tokenName,sketchObj,styleValue)
            }
        }
    }

    loadLess() {
        const tempFolder = Utils.getPathToTempFolder()

        // Copy less2json conversion script 
        const scriptPath = Utils.copyScript('nsconvert.js',tempFolder)
        if(undefined==scriptPath) return false

        // Run less2json 
        const pathToLessJSON = tempFolder + "/nsdata.less.json"
        const runResult = Utils.runCommand("/usr/local/bin/node",[scriptPath,this.pathToLess,pathToLessJSON])

        if(!runResult.result){
            this.UI.alert('Can not transform LESS file to JSON', runResult.output)
            return false
        }    
        
        // load json file
        var error = null
        var lessJSONStr = NSString.stringWithContentsOfURL_encoding_error(NSURL.fileURLWithPath_isDirectory(pathToLessJSON, false), NSUTF8StringEncoding, error);

        this.less = JSON.parse(lessJSONStr)
        return true
    }

    _getStyleByTokenName(tokenName){
        if(tokenName.endsWith('_color')) return "text-color"
        if(tokenName.endsWith('_bg')) return "fill-color"
        if(tokenName.endsWith('_border')) return "border-color"

        return undefined
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
        // cut first @
        if(lessName.indexOf("@")==0) 
            lessName = lessName.substring(1,lessName.length)

        var lessVar = this.less[lessName]
        if (undefined == lessVar) {
            this.UI.alert("Alert", "Can not find less variable for '" + lessName + "'")
            return null
        }
        return lessVar
    }

 
    _applyFillColor(tokenName, obj, color) {
        let fills = obj.slayer.style.fills
        if(undefined==fills) return app.logError('No fills for '+tokenName)
    
        fills =  fills.filter(function(el){return el.enabled})
        if(0==fills.length) return app.logError('No enabled fills for '+tokenName)

        fills[0].color = color

        // propagate new shared style to all
        obj.slayer.sharedStyle.style = obj.slayer.style
        obj.slayer.sharedStyle.sketchObject.resetReferencingInstances()

        return true
    }


    _applyBorderColor(tokenName, obj, color){

        var borders = obj.slayer.style.borders
        if(0==borders.length){
            return this.logError('No border for '+tokenName)
        }
        borders[0].color = color

        // propagate new shared style to all
        obj.slayer.sharedStyle.style = obj.slayer.style
        obj.slayer.sharedStyle.sketchObject.resetReferencingInstances()

        return true
    }

    _applyTextColor(tokenName, obj, color){

        var immutableColor = MSImmutableColor.colorWithSVGString_(color)
        var msColor = MSColor.alloc().initWithImmutableObject_(immutableColor)

        ////

        var orgTextStyle =   obj.slayer.style.sketchObject.textStyle()        
        const textAttribs = orgTextStyle.attributes()
        
        const textTransformAttribute = textAttribs.MSAttributedStringTextTransformAttribute
        const kernAttr = textAttribs.NSKern

        var attributes = {
            'NSColor': NSColor.colorWithRed_green_blue_alpha(msColor.red(),msColor.green(),msColor.blue(),1),
            'NSFont' : textAttribs.NSFont.copy(),
            'NSParagraphStyle': textAttribs.NSParagraphStyle.copy()
        };
        if(textTransformAttribute) 
            attributes['MSAttributedStringTextTransformAttribute'] = textTransformAttribute.copy()
        if(kernAttr) 
            attributes['NSKern'] = kernAttr.copy()

        /////
        var textStyle = MSTextStyle.styleWithAttributes_(attributes);
        textStyle.verticalAlignment = orgTextStyle.verticalAlignment()
        /////

        obj.slayer.style.sketchObject.setTextStyle_(textStyle)

        obj.slayer.sharedStyle.style = obj.slayer.style
        obj.slayer.sharedStyle.sketchObject.resetReferencingInstances()

        return true
    }

    _applyTextFont(lessName, objPath,obj) {
        var color = this._getLessVar(lessName)
        if(undefined == color) return false    

        var immutableColor = MSImmutableColor.colorWithSVGString_(color)
        var msColor = MSColor.alloc().initWithImmutableObject_(immutableColor)

        var orgTextStyle =   obj.slayer.style.sketchObject.textStyle()        
        
        //log(orgTextStyle.attributes())

        var attributes = {
            'NSColor': NSColor.colorWithRed_green_blue_alpha(msColor.red(),msColor.green(),msColor.blue(),1),
            'NSFont' : orgTextStyle.attributes().NSFont.copy(),
            'NSParagraphStyle': orgTextStyle.attributes().NSParagraphStyle.copy()
        };
        var style = MSStyle.alloc().init();
        var textStyle = MSTextStyle.styleWithAttributes_(attributes);
        //style.setTextStyle_(textStyle);
        obj.slayer.style.sketchObject.setTextStyle_(textStyle)

        //var textStyle =   obj.slayer.style.sketchObject.textStyle()        
        //textStyle.attributes().MSAttributedStringColorAttribute = immutableColor

        //obj.slayer.style.sketchObject.setTextStyle_(textStyle)
        /*
        

        var colorAttributes = obj.slayer.sharedStyle.sketchObject.style().primitiveTextStyle().attributes().MSAttributedStringColorAttribute
        colorAttributes.blue = msColor.blue()
        colorAttributes.green = msColor.green()
        colorAttributes.red = msColor.red()

        */

        //obj.slayer.sharedStyle.sketchObject.resetReferencingInstances()

        return true
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
