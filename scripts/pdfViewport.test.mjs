import assert from 'node:assert/strict';
import test from 'node:test';
import { visiblePdfRegion, regionFitZoom } from '../app/resources/prep/pdfViewport.mjs';

test('a shared corner cannot allocate a canvas beyond the viewer zoom limit', () => {
  const region = visiblePdfRegion(
    {left:0,top:0,right:3000,bottom:4200,width:3000,height:4200},
    {left:2997,top:4196,right:4000,bottom:5000});
  assert.ok(region.width <= 0.0011 && region.height <= 0.0011);
  assert.equal(regionFitZoom({width:600,height:840},{width:1000,height:800},region),5);
});

test('ordinary shared crops still fit naturally', () => {
  assert.equal(regionFitZoom({width:600,height:840},{width:600,height:420},
    {x:0,y:0,width:1,height:0.5}),1);
  assert.equal(regionFitZoom({width:600,height:840},{width:0,height:420},
    {x:0,y:0,width:1,height:0.5}),null);
});
