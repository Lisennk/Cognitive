import {toggleNonDrawingHammers} from './hammer_events.js';
import {logDrawing, logErasure} from './logger.js';
import {resetState} from './main.js';

export var drawing_enabled = false;
export var drawingToolFunctions;

/**
 * Sets the flag for drawing events and functionality on the canvas.
 * @param  {Boolean} isEnabled [description]
 * @return {[type]}            [description]
 */
export function toggleDrawing(isEnabled) {
  if (isEnabled === drawing_enabled) return;

  let pad = document.getElementById("d3_container");

  if(isEnabled !== undefined) drawing_enabled = isEnabled;
  else drawing_enabled = !drawing_enabled;

  if (drawing_enabled) pad.classList.add("drawable");
  else pad.classList.remove("drawable");
  
  toggleNonDrawingHammers(!drawing_enabled); //Turn off node interactions
}

export function initDrawing() {
  return new Promise( (resolve, reject)=> {
    let svg;
    let penColor = "black";
    let penThickness = 3;
    let penLineType = "solid";
    let dashLength = 5;
    let eraser_enabled;
    const thicknesses = [ 3, 6, 9, 12 ];

    /**
     * Calculates the mid-point between the two points A and B and then returns
     * the mid-point.
     * 
     * @param {any} pointA The point A.
     * @param {any} pointB The point B.
     * @returns The mid-point between point A and point B.
     */
    const midPointBetween = (pointA, pointB) => {
      return {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2
      };
    }

    /**
     * Generates a path with regard to thickness of each point in path. This
     * implementation was done by @clemens.
     * 
     * @param {any} points Path points with x- and y-position and a thickness per
     * point.
     * @returns The path as string.
     */
    const generatePath = (points) => {

      const newPoints = [];
      newPoints.push(points[0]);

      for (let j = 1; j < points.length - 1; j++) {
        let p1 = points[j - 1];
        let p = points[j];
        let p2 = points[j + 1];
        let c = {
          x: p2.x - p1.x,
          y: p2.y - p1.y
        };
        let n = {
          x: -c.y,
          y: c.x
        };
        let len = Math.sqrt(n.x * n.x + n.y * n.y);
        if (len === 0) continue;
        let u = {
          x: n.x / len,
          y: n.y / len
        };

        newPoints.push({
          x: p.x + u.x * p.thickness,
          y: p.y + u.y * p.thickness
        });
      }
      newPoints.push(points[points.length - 1]);

      for (let j = points.length - 2; j > 0; j--) {
        let p1 = points[j + 1];
        let p = points[j];
        let p2 = points[j - 1];
        let c = {
          x: p2.x - p1.x,
          y: p2.y - p1.y
        };
        let n = {
          x: -c.y,
          y: c.x
        };
        let len = Math.sqrt(n.x * n.x + n.y * n.y);
        if (len == 0) continue;
        let u = {
          x: n.x / len,
          y: n.y / len
        };

        newPoints.push({
          x: p.x + u.x * p.thickness,
          y: p.y + u.y * p.thickness
        });
      }
      let p1 = newPoints[0];
      let p2 = newPoints[1];
      let pathString = "M" + p1.x + " " + p1.y;
      for (let j = 1; j < newPoints.length; j++) {
        let midPoint = midPointBetween(p1, p2);
        if (isNaN(p1.x) || isNaN(p1.y) || isNaN(midPoint.x) || isNaN(midPoint.y)) {
          console.log("NaN");
        }
        pathString = pathString += " Q " + p1.x + " " + p1.y + " " + midPoint.x + " " + midPoint.y;
        p1 = newPoints[j];
        p2 = newPoints[j + 1];
      }

      return pathString;
    }


    const onPenDown = (pen, points, path) => {
      const { x, y, thickness } = pen;

      const point = { x, y, thickness };
      points.push(point);

      path.setAttribute("d", generatePath(points));
      path.setAttribute("fill", pen.color);
      path.setAttribute("stroke-dasharray", penLineType === "dashed" ? dashLength : "")

      svg.appendChild(path);
    }

    const onPenMove = (pen, points, path) => {
      const { x, y, thickness } = pen;

      const point = { x, y, thickness };
      points.push(point);

      path.setAttribute("d", generatePath(points));
    }

    const createToolFunctions = () =>{
      let toolFunctions = {};

      toolFunctions.clearCanvas = () => {
        Array.from(document.querySelector("#canvas").querySelectorAll("path")).forEach(svg => {
          svg.remove();
        });
      };

      toolFunctions.toggleEraser = (isEnabled) => {
        eraser_enabled = isEnabled !== undefined ? isEnabled : !eraser_enabled;
      }

      toolFunctions.setPenThickness = (thickness) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        eraser_enabled = false;

        penThickness = thickness;
      }

      toolFunctions.setPenColor = (color) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          penColor = color;
          console.log("PenColor: ", penColor);
      }

      /**
       * Sets the pen's settings to make solid or dashed lines
       * @param  {String} type "solid" or "dashed"
       * @return none
       */
      toolFunctions.setPenLineType = (type) => {
        switch(type){
          case "solid":
          case "dashed":
            penLineType = type;
            break;
          default:
            penLineType = "solid";
            break
        }
      }

      return toolFunctions;
    };
    console.log("CREATING TOOL FUNCTIONS");
    drawingToolFunctions = createToolFunctions();

    const getMousePenPoint = (event) => {
      let transformable = event.target.closest('.transformable') || event.target.closest('.transformable-local');

      // This is a hack and workaround because the outermost canvas uses the body as hammer target and therefore, we try
      // to find the actual drawable.
      if (!transformable) {
        transformable = event.target.querySelector('.transformable-local');
      }

      if (transformable) {
        let penPoint = new Transformer.Point(event.clientX, event.clientY);
        return transformable.transformer.fromGlobalToLocal(penPoint);
      }
      return {
        x: event.clientX,
        y: event.clientY
      };
    }

    const getTouchPenPoint = (event, touch) => {
      let transformable = event.target.closest('.transformable') || event.target.closest('.transformable-local');

      // This is a hack and workaround because the outermost canvas uses the body as hammer target and therefore, we try
      // to find the actual drawable.
      if (!transformable) {
        transformable = event.target.querySelector('.transformable-local');
      }

      if (transformable) {
        let penPoint = new Transformer.Point(touch.clientX, touch.clientY);
        return transformable.transformer.fromGlobalToLocal(penPoint);
      }
      return {
        x: touch.clientX,
        y: touch.clientY
      };
    }

    const getPenThickness = (event, force) => {
      let transformable = event.target.closest('.transformable') || event.target.closest('.transformable-local');

      // This is a hack and workaround because the outermost canvas uses the body as hammer target and therefore, we try
      // to find the actual drawable.
      if (!transformable) {
        transformable = event.target.querySelector('.transformable-local');
      }

      if (transformable) {
        const globalScale = transformable.transformer.globalScale;
        return (globalScale.x) * force * 3;
      }

      return force * 3;
    }

    const ns = "http://www.w3.org/2000/svg";
    let path = null;
    let points = [];
    let timeout;

    canvas.addEventListener("mousedown", event => {
      if (!drawing_enabled) return;
      mouseDown++;
      
      if (!eraser_enabled) {
        
        if (event.target.closest('.instrument-tool')) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (timeout) {
          clearTimeout(timeout);
        }
        window.isManipulationEnabled = false;

        let drawable = event.target.closest('.drawable');
        if (!drawable) {
          drawable = event.target.querySelector('.drawable');
        }
        svg = drawable.querySelector(':scope>svg');

        if (!svg) {
          svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svg.setAttribute("xlink", "http://www.w3.org/1999/xlink");
          svg.setAttribute("xmlns:xlink", "");
          svg.setAttribute("class", "drawing-canvas")

          drawable.insertBefore(svg, drawable.firstElementChild);
        }

        path = document.createElementNS(ns, "path");
        points.length = 0;

        const pen = getMousePenPoint(event);
        pen.thickness = penThickness ? penThickness : 3;
        pen.color = penColor ? penColor : "black";

        onPenDown(pen, points, path);
      }
      
      else {
//        console.log("Eraser Mode On");
        
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        if (!hoveredEle) return;
        hoveredEle.parentNode.removeChild(hoveredEle);
        logErasure("mouse", hoveredEle);
        original_color = null;
        hoveredEle = null;
      }
    }, true);

    canvas.addEventListener("mousemove", event => {
      if (!drawing_enabled) return;
      if (mouseDown === 0) return;

      if (!eraser_enabled) {
        if (mouseUp >= 1 && mouseDown >= 1) {
          logDrawing("mouse", path);
          resetState();
          return;
        }

        if (path === null) return;

        if (event.target.closest('.instrument-tool')) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const pen = getMousePenPoint(event);
        pen.thickness = penThickness ? penThickness : 3;
        pen.color = penColor ? penColor : "black";

        onPenMove(pen, points, path);
      }
      
      else {
//        console.log("Eraser Mode On");
        
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        if (!hoveredEle) return;
        hoveredEle.parentNode.removeChild(hoveredEle);
        logErasure("mouse", hoveredEle);
        original_color = null;
        hoveredEle = null;
      }
      
    }, true);

    canvas.addEventListener("mouseup", event => {
      if (!drawing_enabled) return;
      if (eraser_enabled) {
        resetState();
        return;
      }
      mouseUp++;

      timeout = setTimeout(() => {
        window.isManipulationEnabled = true;
      }, 250);
    }, true);
    
    canvas.addEventListener("mouseover", event => {
      if (!drawing_enabled || !eraser_enabled) return;
      if (event.target.tagName != "path") return;
      hoveredEle = event.target;
      original_color = hoveredEle.getAttribute("fill");
      hoveredEle.setAttribute("fill", "red");
    }, true);
    
    canvas.addEventListener("mouseout", event => {
      if (!drawing_enabled || !eraser_enabled) return;
      if (!hoveredEle) return;
      hoveredEle.setAttribute("fill", original_color);
      original_color = null;
      hoveredEle = null;
    }, true);
    


    /*
     * Touch events for touch surface.
     * Event: touchstart
     */
    window.addEventListener("touchstart", event => {
      if (!drawing_enabled) return;   // Not in Drawing Mode
      
      if (!eraser_enabled) {          // In Drawing Mode, Not in Eraser Mode
        if (event.touches.length !== 1) return;
        let touch = event.touches[0];
        if (touch.force === 0) return;
        if (event.target.closest('.instrument-tool')) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (timeout) {
          clearTimeout(timeout);
        }
        window.isManipulationEnabled = false;

        let drawable = event.target.closest('.drawable');
        if (!drawable) {
          drawable = event.target.querySelector('.drawable');
        }
        svg = drawable.querySelector(':scope>svg');

        if (!svg) {
          svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svg.setAttribute("xlink", "http://www.w3.org/1999/xlink");
          svg.setAttribute("xmlns:xlink", "");
          svg.setAttribute("class", "drawing-canvas")

          drawable.insertBefore(svg, drawable.firstElementChild);
        }

        path = document.createElementNS(ns, "path");
        points.length = 0;

        const pen = getTouchPenPoint(event, touch);
        pen.thickness = getPenThickness(event, touch.force);
        pen.color = penColor ? penColor : "black";

        onPenDown(pen, points, path);
      }
      
      else {                          // In Eraser Mode
//        console.log("eraser mode open");
        
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        if (event.target.tagName == "path") {
          let toRemove = event.target;
          toRemove.parentNode.removeChild(toRemove);
          // logErasure("touch", toRemove);
        }
        
      }
      
      
    }, {capture: true, passive: false});

    /*
     * Touch events for touch surface.
     * Event: touchmove
     */
    window.addEventListener("touchmove", event => {
      if (!drawing_enabled) return;
      if (!eraser_enabled) {
        if (event.touches.length !== 1) return;
        let touch = event.touches[0];
        if (touch.force === 0) return;

        if (event.target.closest('.instrument-tool')) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const pen = getTouchPenPoint(event, touch);
        pen.thickness = getPenThickness(event, touch.force);
        pen.color = penColor ? penColor : "black";

        onPenMove(pen, points, path);
      }
      
      else {
//        console.log("eraser mode open");
        
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        if (event.target.tagName == "path") {
          let toRemove = event.target;
          toRemove.parentNode.removeChild(toRemove);
          // logErasure("touch", toRemove);
        }
      }
    }, {capture: true, passive: false});

    /*
     * Touch events for touch surface.
     * Event: touchmove
     * We will need this code later to avoid unintended manipulation of
     * the pad. It works together with the manipulation instrument.
     */
    window.addEventListener("touchend", event => {
      if (!drawing_enabled) return;
      if (eraser_enabled) return;
      timeout = setTimeout(() => {
        window.isManipulationEnabled = true;
      }, 250);
      // logDrawing("touch", path);
    }, {capture: true, passive: true});

    resolve(true);
  });
}
