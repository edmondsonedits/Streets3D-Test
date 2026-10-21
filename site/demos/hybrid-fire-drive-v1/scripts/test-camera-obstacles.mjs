import assert from 'node:assert/strict';
import {buildCameraObstacles,cameraSegmentFraction} from '../camera-obstacles.mjs';
const boxes=buildCameraObstacles([{wallPositions:[4,0,-1,6,8,1],roofPositions:[5,10,0]}]);
assert.equal(boxes.length,1);assert.equal(cameraSegmentFraction([0,3,0],[10,3,0],boxes,0),.4);
assert.equal(cameraSegmentFraction([0,12,0],[10,12,0],boxes,0),1);
assert.equal(cameraSegmentFraction([0,3,4],[10,3,4],boxes,0),1);
assert.equal(cameraSegmentFraction([5,3,0],[10,3,0],boxes,0),0);
assert.equal(cameraSegmentFraction([0,3,0],[10,3,0],[...boxes,{min:[2,0,-1],max:[3,5,1]}],0),.2);
console.log('Camera obstruction tests passed');
