@import("constants.js")
@import("lib/utils.js")
@import("lib/uidialog.js")
@import("classes/DSArtboard.js")

var app = undefined
var Settings = require('sketch/settings')
var Style = require('sketch/dom').Style


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
        this.pathToBrandLess = Settings.settingForKey(SettingKeys.PLUGIN_PATH_TO_BRAND_LESS)
        if(undefined==this.pathToBrandLess) this.pathToBrandLess = ''        
        this.pathToTokensLess = Settings.settingForKey(SettingKeys.PLUGIN_PATH_TO_TOKENS_LESS)
        if(undefined==this.pathToTokensLess) this.pathToTokensLess = ''        
        this.pathToSketchStylesJSON = Settings.settingForKey(SettingKeys.PLUGIN_PATH_TO_SKETCHSTYLES_LESS)
        if(undefined==this.pathToSketchStylesJSON) this.pathToSketchStylesJSON = ''
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
        log('1')
        const dialog = new UIDialog("Apply UI Tokens to Sketch styles",NSMakeRect(0, 0, 500, 240),"Apply")

        dialog.addTextInput("pathToBrandLess","Path to Brand Colors (LESS file)[Optional]",this.pathToBrandLess,'e.g. ~/Work/brand1.less',450)  
        dialog.addButton("selectPathToBrandLess","Select",function(){
          const newPath = Utils.askFilePath(dialog.views['pathToBrandLess'].stringValue()+"")
          if (newPath != null) {
            dialog.views['pathToBrandLess'].setStringValue(newPath)
          }
          return
        })

        log('2')

        dialog.addTextInput("pathToTokensLess","Path to UI Tokens (LESS file)",this.pathToTokensLess,'e.g. ~/Work/ui-tokens.less',450)  
        dialog.addButton("selectPathToTokensLess","Select",function(){
          const newPath = Utils.askFilePath(dialog.views['pathToTokensLess'].stringValue()+"")
          if (newPath != null) {
            dialog.views['pathToTokensLess'].setStringValue(newPath)
          }
          return
        })


        log('3')

        dialog.addTextInput("pathToSketchStylesJSON","Path to Sketch Styles (JSON file)",this.pathToSketchStylesJSON,'e.g. ~/Work/sketch-styles.json',450)  
        dialog.addButton("selectPathToSketchStylesJSON","Select",function(){
          const newPath = Utils.askFilePath(dialog.views['pathToSketchStylesJSON'].stringValue()+"")
          if (newPath != null) {
            dialog.views['pathToSketchStylesJSON'].setStringValue(newPath)
          }
          return
        })

        log('4')

        while(true){
            const result = dialog.run()        
            if(!result) return false
    
            this.pathToBrandLess = dialog.views['pathToBrandLess'].stringValue()+""
            this.pathToTokensLess = dialog.views['pathToTokensLess'].stringValue()+""
            if(""==this.pathToTokensLess) continue
            this.pathToSketchStylesJSON = dialog.views['pathToSketchStylesJSON'].stringValue()+""
            if(""==this.pathToSketchStylesJSON) continue


            break
        }
    
        dialog.finish()

        Settings.setSettingForKey(SettingKeys.PLUGIN_PATH_TO_BRAND_LESS, this.pathToBrandLess)
        Settings.setSettingForKey(SettingKeys.PLUGIN_PATH_TO_TOKENS_LESS, this.pathToTokensLess)
        Settings.setSettingForKey(SettingKeys.PLUGIN_PATH_TO_SKETCHSTYLES_LESS, this.pathToSketchStylesJSON)

        return true
    }

    _getTokensText(){
        var tokensStr = ''

        if(this.pathToBrandLess!=''){
            tokensStr = tokensStr + Utils.readFile(this.pathToBrandLess)
        }

        tokensStr = tokensStr + Utils.readFile(this.pathToTokensLess)

        return tokensStr
    }


    _applyLess() {
        var tokensStr = Utils.readFile(this.pathToSketchStylesJSON)
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

            for(var sketchPath of sketchPaths){
                if(sketchPath.indexOf("__")==0) continue //Path to Sketch object undefined
                var sketchObj = this._getObjByPath(sketchPath)
                if(undefined==sketchObj){
                    this.logError("Can not find Sketch layer by path: "+sketchPath)
                    continue
                }

                // Apply Styles
                if(
                    ('font-size' in token) || ('text-color' in token)
                    || ('font-weight' in token) || ('text-transform' in token)
                )
                    this._applyTextStyle(token,tokenName,sketchObj)               
                if('fill-color' in token)
                    this._applyFillColor(token,tokenName,sketchObj,token['fill-color'])
                 if('shadow' in token)
                    this._applyShadow(token,tokenName,sketchObj,token['shadow'])
                if(('border-color' in token) || ('border-width' in token) || ('border-position' in token))
                    this._applyBorderStyle(token,tokenName,sketchObj)                        
                if('shape-radius' in token)
                    this._applyShapeRadius(token,tokenName,sketchObj)

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
        var args = [scriptPath]
        if(this.pathToBrandLess!='') args.push(this.pathToBrandLess)
        args.push(this.pathToTokensLess)
        args.push(pathToLessJSON)

        const runResult = Utils.runCommand("/usr/local/bin/node",args)

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
        
        if(color!=""){
            var opacity = token['fill-color-opacity']
            if(undefined!=opacity) color = color + Utils.opacityToHex(opacity)                

            var fill = {
                color: color,
                fill: Style.FillType.Color
            }
            obj.slayer.style.fills = [fill]
            
        }else{
            obj.slayer.style.fills = []
        }

        return this._syncSharedStyle(tokenName,obj)        
    }
 

    _applyShadow(token, tokenName, obj, shadow) {
        
        if(shadow!=""){
            var shadow = Utils.splitCSSShadow(shadow)            
            shadow.enabled = true
            shadow.type = 'Shadow'
            obj.slayer.style.shadows = [shadow]
        }else{
            obj.slayer.style.shadows = []
        }

        return this._syncSharedStyle(tokenName,obj)        
    }

    _applyShapeRadius(token, tokenName, obj) {
        
        var radius = token['shape-radius']

        if(radius!=""){                   
            obj.nlayer.children().forEach(function(e){
                if(e.class() == 'MSRectangleShape') {
                    log(e)
                    e.cornerRadiusFloat = parseFloat(radius)
                }
            });

            //obj.slayer.style.borderOptions = [shadow]
        }else{
            //obj.slayer.style.shadows = []
        }

        return this._syncSharedStyle(tokenName,obj)        
    } 


    _applyBorderStyle(token,tokenName, obj){
        
        var border = {
        }
        
        // process color
        if(('border-color' in token)){
            var color = token['border-color']
            var opacity = token['border-color-opacity']
            if(undefined!=opacity) color = color + Utils.opacityToHex(opacity)
            border.color = color        
        }

        // process width
        if('border-width' in token){
            border.thickness = token['border-width']
        }

         // process position
        if('border-position' in token){
            var conversion = {
                'center':     Style.BorderPosition.Center,
                'inside':     Style.BorderPosition.Inside,
                'outside':    Style.BorderPosition.Outside
            }
            if( !(token['border-position'] in conversion) ){
                return this.logError('Wrong border-position for token: '+tokenName)
            }

            border.position = conversion[ token['border-position'] ]
        }
       
       
        // save new border in style
        obj.slayer.style.borders = [border]


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


    _applyTextStyle(token,tokenName, obj){
        // read token attribues
        var fontSize = token['font-size']
        var color = token['text-color']
        var fontWeight = token['font-weight']
        var transform = token['text-transform']
        
        //// SET FONT SIZE
        if(undefined!=fontSize){                      
            obj.slayer.style.fontSize = parseFloat(fontSize.replace("px",""))
        }
        
        //// SET FONT WEIGHT
        if(undefined!=fontWeight){
            var weights = {
                'regular':5,
                'semi-bold':8,
                'bold':9
            }

            if(undefined==weights[fontWeight]){
                return this.logError('Wrong font weight for token: '+tokenName)
            }
            
            obj.slayer.style.fontWeight = weights[fontWeight]
        }

         // SET TEXT COLOR
         if(undefined!=color){
            let opacity = token['text-color-opacity']
            let opacityHEX = undefined!=opacity?Utils.opacityToHex(opacity):''

            obj.slayer.style.textColor = color + opacityHEX
        }
        // SET TEXT TRANSFORM
        if(undefined!=transform){
            obj.slayer.style.textTransform = transform
        }
    
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
