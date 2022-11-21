pragma solidity >=0.8.0;

contract HitTileOffsetListDefinitions {
  int8[2][4][32] spearHitTileOffsetList = [
    [[int8(1), 0], [int8(2), 0], [int8(3), 0], [int8(4), 0]],
    [[int8(1), 0], [int8(2), 0], [int8(3), -1], [int8(4), -1]],
    [[int8(1), 0], [int8(2), -1], [int8(3), -1], [int8(4), -2]],
    [[int8(1), -1], [int8(2), -2], [int8(3), -2], [int8(4), -3]],
    [[int8(1), -1], [int8(2), -2], [int8(3), -3], [int8(4), -4]],
    [[int8(1), -1], [int8(2), -2], [int8(2), -3], [int8(3), -4]],
    [[int8(0), -1], [int8(1), -2], [int8(1), -3], [int8(2), -4]],
    [[int8(0), -1], [int8(0), -2], [int8(1), -3], [int8(1), -4]],
    [[int8(0), -1], [int8(0), -2], [int8(0), -3], [int8(0), -4]],
    [[int8(0), -1], [int8(0), -2], [int8(-1), -3], [int8(-1), -4]],
    [[int8(0), -1], [int8(-1), -2], [int8(-1), -3], [int8(-2), -4]],
    [[int8(-1), -1], [int8(-2), -2], [int8(-2), -3], [int8(-3), -4]],
    [[int8(-1), -1], [int8(-2), -2], [int8(-3), -3], [int8(-4), -4]],
    [[int8(-1), -1], [int8(-2), -2], [int8(-3), -2], [int8(-4), -3]],
    [[int8(-1), 0], [int8(-2), -1], [int8(-3), -1], [int8(-4), -2]],
    [[int8(-1), 0], [int8(-2), 0], [int8(-3), -1], [int8(-4), -1]],
    [[int8(-1), 0], [int8(-2), 0], [int8(-3), 0], [int8(-4), 0]],
    [[int8(-1), 0], [int8(-2), 0], [int8(-3), 1], [int8(-4), 1]],
    [[int8(-1), 0], [int8(-2), 1], [int8(-3), 1], [int8(-4), 2]],
    [[int8(-1), 1], [int8(-2), 2], [int8(-3), 2], [int8(-4), 3]],
    [[int8(-1), 1], [int8(-2), 2], [int8(-3), 3], [int8(-4), 4]],
    [[int8(-1), 1], [int8(-2), 2], [int8(-2), 3], [int8(-3), 4]],
    [[int8(0), 1], [int8(-1), 2], [int8(-1), 3], [int8(-2), 4]],
    [[int8(0), 1], [int8(0), 2], [int8(-1), 3], [int8(-1), 4]],
    [[int8(0), 1], [int8(0), 2], [int8(0), 3], [int8(0), 4]],
    [[int8(0), 1], [int8(0), 2], [int8(1), 3], [int8(1), 4]],
    [[int8(0), 1], [int8(1), 2], [int8(1), 3], [int8(2), 4]],
    [[int8(1), 1], [int8(2), 2], [int8(2), 3], [int8(3), 4]],
    [[int8(1), 1], [int8(2), 2], [int8(3), 3], [int8(4), 4]],
    [[int8(1), 1], [int8(2), 2], [int8(3), 2], [int8(4), 3]],
    [[int8(1), 0], [int8(2), 1], [int8(3), 1], [int8(4), 2]],
    [[int8(1), 0], [int8(2), 0], [int8(3), 1], [int8(4), 1]]
  ]; 
}