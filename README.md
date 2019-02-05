# design-system
Sketch.app plugin to apply UI tokens and LESS styles to Sketch styles

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
4. Specify JSON and LESS files according to screenshot

<img width="755" height="538" src="https://raw.githubusercontent.com/MaxBazarov/design-system/master/Examples/One/Illustration.png"/>


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
"border-color":          "#000000",
"border-width":          "2", //px
"shape-radius":          "5", //px
"shadow":                "0 10px 20px 2 #00000033",
```

## Requirements
Some styles, such as text font/transformation/etc require the latest Sketch 53
