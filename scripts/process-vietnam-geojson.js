const fs = require('fs');

// Read the GeoJSON file
const data = JSON.parse(fs.readFileSync('./vn.json', 'utf8'));

// Vietnam bounds (approximate)
const minLon = 102;
const maxLon = 115;
const minLat = 7;
const maxLat = 24;

// Normalize coordinates to 0-1 range
function normalize(lon, lat) {
  const x = (lon - minLon) / (maxLon - minLon);
  const y = (lat - minLat) / (maxLat - minLat);
  return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
}

// Simplify a polygon by taking every Nth point
function simplifyPolygon(coords, factor = 10) {
  const result = [];
  for (let i = 0; i < coords.length; i += factor) {
    result.push(coords[i]);
  }
  // Ensure the polygon closes
  if (result.length > 0 &&
      (result[0][0] !== result[result.length-1][0] ||
       result[0][1] !== result[result.length-1][1])) {
    result.push(result[0]);
  }
  return result;
}

// Extract all polygons
const allPolygons = [];
let mainlandPolygon = null;
let maxPoints = 0;

data.features.forEach(feature => {
  if (feature.geometry.type === 'MultiPolygon') {
    feature.geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        // Normalize and simplify
        const normalized = ring.map(([lon, lat]) => normalize(lon, lat));
        const simplified = simplifyPolygon(normalized, 8);

        allPolygons.push({
          points: simplified,
          count: ring.length
        });

        // Track the largest polygon (mainland)
        if (ring.length > maxPoints) {
          maxPoints = ring.length;
          mainlandPolygon = simplified;
        }
      });
    });
  } else if (feature.geometry.type === 'Polygon') {
    feature.geometry.coordinates.forEach(ring => {
      const normalized = ring.map(([lon, lat]) => normalize(lon, lat));
      const simplified = simplifyPolygon(normalized, 8);

      allPolygons.push({
        points: simplified,
        count: ring.length
      });

      if (ring.length > maxPoints) {
        maxPoints = ring.length;
        mainlandPolygon = simplified;
      }
    });
  }
});

// Sort by size (largest first)
allPolygons.sort((a, b) => b.count - a.count);

// Output mainland (largest polygon)
console.log('// Vietnam mainland outline (largest polygon)');
console.log('const VIETNAM_MAINLAND: [number, number][] = [');
if (mainlandPolygon) {
  mainlandPolygon.forEach(([x, y], i) => {
    const comma = i < mainlandPolygon.length - 1 ? ',' : '';
    console.log(`  [${x}, ${y}]${comma}`);
  });
}
console.log('];');

console.log('\n// Total polygons found:', allPolygons.length);
console.log('// Mainland points:', mainlandPolygon?.length);

// Output top 10 largest polygons (islands)
console.log('\n// Major islands (next largest polygons)');
console.log('const VIETNAM_ISLANDS: [number, number][][] = [');
for (let i = 1; i < Math.min(15, allPolygons.length); i++) {
  if (allPolygons[i].count > 50) { // Only include significant islands
    console.log('  [');
    allPolygons[i].points.forEach(([x, y], j) => {
      const comma = j < allPolygons[i].points.length - 1 ? ',' : '';
      console.log(`    [${x}, ${y}]${comma}`);
    });
    console.log('  ],');
  }
}
console.log('];');
