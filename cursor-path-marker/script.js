var path = [
  {x: 400, y: 200},
  {x: 450, y: 200},
  {x: 500, y: 300},
  {x: 330, y: 400},
  {x: 370, y: 500},
  {x: 550, y: 600},
  {x: 310, y: 800}
];

var debug = false;
var svgItinerary = document.getElementById('svgItinerary');
var svgVoronoi = document.getElementById('svgVoronoi');
var svgDebug = document.getElementById('svgDebug');
var bbox, line1, line2, diagram;
var pointer = document.getElementById('pointer');
var itiPoint = document.getElementById('itiPoint');

function computeSvgPath(path) {
  return path.map(function(point, index) {
    var operator = index === 0 ? 'M' : 'L';
    return operator + ' ' + point.x + ' ' + point.y;
  }).join(' ');
}

function toggleDebug() {
  debug = !debug;
  renderDiagram();
}

var svgPath = computeSvgPath(path);

document.getElementById('itinerary').setAttribute('d', svgPath);

var voronoi =  new Voronoi();
window.setTimeout(onResize, 100);

document.addEventListener('mousemove', function(event) {
  var x = event.pageX;
  var y = event.pageY;
  var isOn1 = false, isOn2 = false;
  var point1, point2;
  moveDebugCircle(pointer, {x:x, y:y});
  if(line1) {
    point1 = getSpPoint(line1[0], line1[1], {x:x, y:y});
    moveDebugCircle(project1, point1);
    isOn1 = point1.intersect;
    if(isOn1) moveItiPoint(point1);
  }
  if(line2) {
    point2 = getSpPoint(line2[0], line2[1], {x:x, y:y});
    moveDebugCircle(project2, point2);
    isOn2 = point2.intersect;
    if(isOn2) moveItiPoint(point2);
  }

  if(isOn1 && isOn2) {
    moveItiPoint(distance(point1, {x:x, y:y}) < distance(point2, {x:x, y:y}) ? point1 : point2)
  }

  if(!isOn1 && !isOn2 && line1 && line2) {
    moveItiPoint(line1[1]);
  }


});

function distance(point1, point2) {
  return Math.sqrt( Math.pow((point1.x-point2.x), 2) + Math.pow((point1.y-point2.y), 2));
}

function moveItiPoint(coord) {
  itiPoint.setAttributeNS(null, 'cx', coord.x);
  itiPoint.setAttributeNS(null, 'cy', coord.y);
}

function moveDebugCircle(el, coord) {
  el.setAttributeNS(null, 'cx', coord.x);
  el.setAttributeNS(null, 'cy', coord.y);
  el.setAttributeNS(null, 'stroke', debug ? 'black' : 'none');
  el.setAttributeNS(null, 'fill', debug ? 'red' : 'none');
}

function getSpPoint(A,B,C){
    var x1=A.x, y1=A.y, x2=B.x, y2=B.y, x3=C.x, y3=C.y;
    var px = x2-x1, py = y2-y1, dAB = px*px + py*py;
    var u = ((x3 - x1) * px + (y3 - y1) * py) / dAB;
    var x = x1 + u * px, y = y1 + u * py;
    return {x:x, y:y, intersect: u > 0 && u < 1};
}

function renderDiagram() {
  empty(svgVoronoi);
  diagram = voronoi.compute(path, bbox);

  diagram.cells.forEach(function(cell, index) {
    var edges = diagram.edges.filter(function(edge) {
      return (edge.lSite && edge.lSite.voronoiId == index) || (edge.rSite && edge.rSite.voronoiId == index);
    });
    var edgesCopy = edges.slice(0);
    var polygon = edges.reduce(function(memo, edge, index) {
      if (memo.length == 0) {
        edgesCopy.splice(edges.indexOf(edge), 1);
        return [edge.va, edge.vb];
      }
      var findFlag = '';
      var pointToPush = edgesCopy.find(function(edge, index) {
        var lastPoint = memo[memo.length - 1];
        if (lastPoint.x == edge.va.x && lastPoint.y == edge.va.y) {
          edgesCopy.splice(edgesCopy.indexOf(edge), 1);
          findFlag = 'vb';
          return true;
        }
        if (lastPoint.x == edge.vb.x && lastPoint.y == edge.vb.y) {
          edgesCopy.splice(edgesCopy.indexOf(edge), 1);
          findFlag = 'va';
          return true;
        }
        return false;
      });
      memo.push(pointToPush[findFlag]);
      return memo;
    }, []);

    var svgEdge = createPath(polygon);
    svgEdge.setAttributeNS(null, 'data-voronoiid', cell.site.voronoiId);
    svgEdge.addEventListener('mouseover', function(event) {
      empty(svgDebug);
      var voronoiId = +event.target.getAttribute('data-voronoiid');
      line1 = path[voronoiId - 1] ? [path[voronoiId - 1], path[voronoiId]] : null;
      line2 = path[voronoiId + 1] ? [path[voronoiId], path[voronoiId + 1]] : null;
      if (line1) svgDebug.appendChild(createPath(line1, {stroke: 'yellow', strokeWidth: '6'}));
      if (line2) svgDebug.appendChild(createPath(line2, {stroke: 'yellow', strokeWidth: '6'}));
    });
    svgVoronoi.appendChild(svgEdge);
  });
}

function empty(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function createPath(polyline, options) {
  options = options || {};
  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttributeNS(null, 'stroke', debug ? options.stroke || 'black' : 'none');
  path.setAttributeNS(null, 'stroke-width', options.strokeWidth || '1');
  path.setAttributeNS(null, 'd', computeSvgPath(polyline));
  path.setAttributeNS(null, 'style', 'fill: none;');
  return path;
}

function onResize() {
  var margin = 0;
  bbox = {
    xl: margin,
    xr: svgVoronoi.width.baseVal.value - margin,
    yt: margin,
    yb: svgVoronoi.height.baseVal.value - margin
  };
  renderDiagram();
}
