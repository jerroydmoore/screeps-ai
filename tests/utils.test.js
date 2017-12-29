require('./screeps-load-globals');
const expect = require('chai').expect;
const utils = require('../utils');

describe('Utils Package', function() {
    let matrix;
    beforeEach(function () {
        matrix = [];
        // The first two columns and rows are too close to the edge of the room
        // origin is 6,4, range 2;
        matrix[0] = undefined;
        matrix[1] = undefined;
        matrix[2] = undefined;
        matrix[3] = undefined;
        matrix[4] = [0,0,0,0,0,0,0];
        matrix[5] = [0,0,0,0,0,0,0];
        matrix[6] = [0,0,0,0,0,0,0];
        matrix[7] = [0,0,0,0,0,0,0];
        matrix[8] = [0,0,0,0,0,0,0];
    });
    describe('_countQualifiedSpacesInRange()', function() {
        it('should count spaces around it', function() {
            matrix[6] = [0,0,0,1,9,0,0];
            matrix[7] = [0,0,0,0,2,3,0];
            let actual = utils._countQualifiedSpacesInRange(matrix, 6, 4, 1, [1,2]);
            expect(actual).to.equal(6);
        });
    });
    describe('markNearby()', function() {
        it('should mark all neighbors when range is 1, and ignore items not in its replacement member list', () => {

            matrix[6] = [0,0, 0, 0, 9, 0, 0];
            matrix[7] = [0,0, 0, 9, 9, 0, 0];

            utils.markNearby(matrix, 6, 4, [0], 1, 1);
            expect(matrix[4]).to.eql([0,0, 0, 0, 0, 0, 0]);
            expect(matrix[5]).to.eql([0,0, 0, 1, 1, 1, 0]);
            expect(matrix[6]).to.eql([0,0, 0, 1, 9, 1, 0]);
            expect(matrix[7]).to.eql([0,0, 0, 9, 9, 1, 0]);
            expect(matrix[8]).to.eql([0,0, 0, 0, 0, 0, 0]);
        });
        it('should mark all neighbors with a checkered pattern', () => {
            matrix[6] = [0,0, 0, 0, 9, 0, 0];
            matrix[7] = [0,0, 0, 9, 9, 0, 0];

            let isCheckered = true;
            utils.markNearby(matrix, 6, 4, [0], 1, 1, isCheckered);
            expect(matrix[4]).to.eql([0,0, 0, 0, 0, 0, 0]);
            expect(matrix[5]).to.eql([0,0, 0, 0, 1, 0, 0]);
            expect(matrix[6]).to.eql([0,0, 0, 1, 9, 1, 0]);
            expect(matrix[7]).to.eql([0,0, 0, 9, 9, 0, 0]);
            expect(matrix[8]).to.eql([0,0, 0, 0, 0, 0, 0]);
        });
    });

    describe('*getCoordsWithinRange()', function() {
        it('should yield coordinates starting from the origin', function() {
            // The first two columns and rows are too close to the edge of the room
            matrix[4] = [0,0,15,17,19,21,23];
            matrix[5] = [0,0, 9, 3, 5, 7,10];
            matrix[6] = [0,0,11, 1, 0, 2,12];
            matrix[7] = [0,0,13, 4, 6, 8,14];
            matrix[8] = [0,0,16,18,20,22,24];

            let expected = Array.from(Array(25).keys()),
                origin = {x: 6, y: 4},
                generator = utils.getCoordsWithinRange(origin, 2),
                actual = Array.from(generator).map(([i,j]) => matrix[i][j]);
            
            expect(actual).to.eql(expected);
        });
    });


});
