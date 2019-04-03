# design-system
Sketch.app plugin to apply design tokens (specified in LESS format) to Sketch layers (with shared styles)

## Installation
1. Download [Design System plugin](https://github.com/MaxBazarov/design-system/raw/master/DesignSystem.sketchplugin.zip)
2. Unarchive and install
3. Download and install [Node.js](https://nodejs.org/en/download/)
4. Instal _less_ using the following Terminal commands:
```
sudo -s  
npm i less -g 
```

## Usage
1. Download [example](https://github.com/MaxBazarov/design-system/raw/master/Examples/One.zip) and unarchive it into some local folder.
2. Open Widget Library.sketch file in Sketch.app
3. Run Plugins > Design System > Apply Design Tokens menu command
4. Specify LESS and JSON  files according to screenshot

<img width="755" height="538" src="https://raw.githubusercontent.com/MaxBazarov/design-system/master/Examples/One/Illustration.png"/>

5. Repeat the same operation, but select "tokens-blue.less" file. See how styles and widgets look now.


## Features
The following styles are supporting.
```
Text Layers:
-----------------------------------------
"font-size":             "12.0",   
"font-weight":           "bold", // "bold" or "regular" or "semibold"
"text-color":            "#FFFFFF"
"text-color-opacity":    "63%", // "63%" or "0.42"
"text-transform":        "uppercase",  // "uppercase", "lowercase", and "none"

Shape Layers:
-----------------------------------------
"fill-color":            "#B0AFB1",
"fill-color-opacity":    "63%", // "63%" or "0.42"

"fill-gradient-type":    "linear", // or "radial" or "angular" 
"fill-color-from":        "#B0AFB1",
"fill-color-from-opacity": "63%", // "63%" or "0.42"
"fill-color-to":        "#B0AFB1",
"fill-color-to-opacity": "63%", // "63%" or "0.42"


"border-color":          "#000000",
"border-width":          "2", //px
"border-position":       "center", // center or inside or outside
"shape-radius":          "5", //px !!ATTENTION!! Shared styles don't include Radius, 
                              // so you need to apply it on layers or symbols directly
"shape-radius":          "5;5;0;0",
"shadow":                "0 10px 20px 2 rgba(0,0,0,0.1)",
```

## Requirements
Some styles, such as text font/transformation/etc require the latest Sketch 53
