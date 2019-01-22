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

        // show final message
        if(this.errors.length>0){
            this.UI.alert('Found errors',this.errors.join("\n\n"))
        }else{
            this.UI.message('Tokens applied')
        }

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

            // work with token
            var token = tokens[tokenName]

            // fill token attribute values from LESS file
            for(var attrName of Object.keys(token)){
                var attrValue= token[attrName]
                if(''==attrValue || attrValue.indexOf("__")==0) continue

                if(attrValue.indexOf("@")==0){
                    var lessValue = this._getLessVar(attrValue)                            
                    if(undefined==lessValue) continue
                    token[attrName] = lessValue               
                }
            }

            var sketchPaths = token['sketch']
            if(!Array.isArray(sketchPaths))
                sketchPaths = [sketchPaths]

            var ignoreAttribs = {
                "sketch": true,
                "text-color-opacity":true,
                "fill-color-opacity":true,
            }

            // apply every style to every object
            for(var attrName of Object.keys(token)){                
                if(attrName.indexOf("__")==0 || ignoreAttribs[attrName]) continue

                var attrValue = token[attrName]

                log('_applyLess: tokenID: '+tokenName+" attribute: "+attrName)
         
                for(var sketchPath of sketchPaths){
                    if(sketchPath.indexOf("__")==0) continue //Path to Sketch object undefined
                    var sketchObj = this._getObjByPath(sketchPath)
                    if(undefined==sketchObj){
                        this.logError("Can not find Sketch layer by path: "+sketchPath)
                        continue
                    }

                    if('border-color'==attrName) this._applyBorderColor(token,tokenName,sketchObj,attrValue)
                    else if('fill-color'==attrName) this._applyFillColor(token,tokenName,sketchObj,attrValue)
                    else if('text-color'==attrName) this._applyTextColor(token,tokenName,sketchObj,attrValue)
                    else if('text-transform'==attrName) this._applyTextTransform(token,tokenName,sketchObj,attrValue)  
                    else if('font-weight'==attrName) this._applyFontWeight(token,tokenName,sketchObj,attrValue)  
                    else if('font-size'==attrName) this._applyFontSize(token,tokenName,sketchObj,attrValue)  
                    else this.logError('Uknown attribute name: '+attrName)  
                }
            }
        }
        
        return true
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
            return undefined
        }

        return obj
    }

    _syncSharedStyle(tokenName,obj){
        if(!obj.slayer.sharedStyle){
            return this.logError('No shared style for some of "'+tokenName+'" styles')
        }
        obj.slayer.sharedStyle.style = obj.slayer.style
        obj.slayer.sharedStyle.sketchObject.resetReferencingInstances()
        return true
    }
    
    
    _getLessVar(lessName){
        // cut first @
        if(lessName.indexOf("@")==0) 
            lessName = lessName.substring(1,lessName.length)

        var lessVar = this.less[lessName]
        if (undefined == lessVar) {
            this.logError("Can not find less variable for '" + lessName + "'")
            return undefined
        }
        return lessVar
    }    
 
    _applyFillColor(token, tokenName, obj, color) {
        var opacity = token['fill-color-opacity']

        if(undefined!=opacity) color = color + Utils.opacityToHex(opacity)        
        
        let fills = obj.slayer.style.fills
        if(undefined==fills) return app.logError('No fills for '+tokenName)
    
        fills =  fills.filter(function(el){return el.enabled})
        if(0==fills.length) return app.logError('No enabled fills for '+tokenName)         

        fills[0].color = color

        return this._syncSharedStyle(tokenName,obj)        
    }


    _applyBorderColor(token,tokenName, obj, color){
        var opacity = token['border-color-opacity']
        if(undefined!=opacity) color = color + Utils.opacityToHex(opacity)

        var borders = obj.slayer.style.borders
        if(0==borders.length){
            return this.logError('No border for '+tokenName)
        }
        borders[0].color = color        

        return this._syncSharedStyle(tokenName,obj)
    }

    _getObjTextData(obj){
        var orgTextStyle =   obj.slayer.style.sketchObject.textStyle()        
        const textAttribs = orgTextStyle.attributes()
        
        const textTransformAttribute = textAttribs.MSAttributedStringTextTransformAttribute
        const colorAttr = textAttribs.NSColor
        const kernAttr = textAttribs.NSKern

        var attributes = {
            'NSFont' : textAttribs.NSFont.copy(),
            'NSParagraphStyle': textAttribs.NSParagraphStyle.copy()
        };
        if(colorAttr) 
            attributes['NSColor'] = colorAttr.copy()
        if(textTransformAttribute) 
            attributes['MSAttributedStringTextTransformAttribute'] = textTransformAttribute.copy()
        if(kernAttr) 
            attributes['NSKern'] = kernAttr.copy()

        return {
            'attributes':attributes,
            'orgTextStyle':orgTextStyle
        }
    }

    _applyTextColor(token,tokenName, obj, color){
        var opacity = token['text-color-opacity']

        var immutableColor = MSImmutableColor.colorWithSVGString_(color)
        var msColor = MSColor.alloc().initWithImmutableObject_(immutableColor)

        ////
        const alpha = undefined!=opacity?opacity:1

        const data = this._getObjTextData(obj)
        data['attributes']['NSColor'] = NSColor.colorWithRed_green_blue_alpha(msColor.red(),msColor.green(),msColor.blue(),alpha)
       
        /////
        var textStyle = MSTextStyle.styleWithAttributes_(data['attributes']);
        textStyle.verticalAlignment = data['orgTextStyle'].verticalAlignment()
        /////

        obj.slayer.style.sketchObject.setTextStyle_(textStyle)

        return this._syncSharedStyle(tokenName,obj)
    }

    _applyFontSize(token,tokenName, obj,fontSize){
        obj.slayer.style.fontSize = parseFloat(fontSize)

        return this._syncSharedStyle(tokenName,obj)
    }


    _applyFontWeight(token,tokenName, obj,fontWeight){
        log('fontWeight='+ obj.slayer.style.fontWeight)

        //obj.slayer.style.fontSize = parseFloat(fontSize)

        return this._syncSharedStyle(tokenName,obj)
    }    

    _applyTextTransform(token,tokenName, obj, transform){
        var transformAttr = 0
        if('uppercase'==transform) transformAttr = 1
        else if('lowercase'==transform) transformAttr = 2
        else if('capitalise'==transform) transformAttr = 0
        else return this.logError('Uknown texttransform:'+transform)

        const data = this._getObjTextData(obj)
        data['attributes']['MSAttributedStringTextTransformAttribute'] = transformAttr
      
        /////        
        var textStyle = MSTextStyle.styleWithAttributes_(data['attributes']);
        textStyle.verticalAlignment = data['orgTextStyle'].verticalAlignment()
        /////

        obj.slayer.style.sketchObject.setTextStyle_(textStyle)

        return this._syncSharedStyle(tokenName,obj)
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
