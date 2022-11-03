import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  defineComponentSystem,
  EntityIndex,
  getComponentValue,
  getComponentValueStrict,
  removeComponent,
  setComponent,
  updateComponent
} from '@latticexyz/recs';
import {getSelectedEntity} from '../components/SelectedComponent';
import {ComponentValueFromComponent, lastElementOf, normalizedDiff} from '../../../utils/misc';
import {getGodIndexStrict} from '../../../utils/entity';
import {getMapTileMerkleData, getMapTileValue, getParsedMapDataFromComponent} from '../../../utils/mapData';
import {TileType} from '../../../constants';
import {getRandomNonce} from '../../../utils/random';
import {setPersistedComponent} from '../../../utils/persistedComponent';
import {jungleEnterProver, jungleMoveProver} from '../../../utils/zkProving';
import {drawRect} from '../../../utils/drawing';

export function createMovePathSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {MapData},
    api: {plainsMove, jungleEnter, jungleMove, jungleExit},
  } = network;

  const {
    scenes: {Main: {input, objectPool}},
    components: {
      CursorTilePosition, Selected, PotentialMovePath, MovePath, PendingMovePosition,
      LocalPosition, Nonce, ActionSourcePosition
    },
  } = phaser;

  const updatePotentialMovePath = (entity: EntityIndex, swapTraverseXFirst = false) => {
    const cursorPosition = getComponentValue(CursorTilePosition, getGodIndexStrict(world));
    if (!cursorPosition) return;

    // '!=' acts as XOR to flip value if swapTraverseXFirst is true
    const oldPotentialMovePath = getComponentValue(PotentialMovePath, entity);
    const traverseXFirst = oldPotentialMovePath?.traverseXFirst != swapTraverseXFirst;
    const continueFromPath = !!oldPotentialMovePath?.continueFromPath;
    const currMovePath = getComponentValue(MovePath, entity);
    const xValues = [] as number[];
    const yValues = [] as number[];
    const axisKeys: ('x' | 'y')[] = traverseXFirst ? ['x', 'y'] : ['y', 'x'];
    const prevPathPosition = continueFromPath && currMovePath?.xValues?.length ? {
      x: lastElementOf(currMovePath?.xValues as number[]),
      y: lastElementOf(currMovePath?.yValues as number[]),
    } : {...getComponentValueStrict(ActionSourcePosition, entity)};
    axisKeys.forEach(axisKey => {
      const dir = normalizedDiff(prevPathPosition[axisKey], cursorPosition[axisKey]);
      while (prevPathPosition[axisKey] !== cursorPosition[axisKey]) {
        prevPathPosition[axisKey] += dir;
        xValues.push(prevPathPosition.x);
        yValues.push(prevPathPosition.y);
      }
    });
    setComponent(PotentialMovePath, entity, {
      xValues, yValues, traverseXFirst, continueFromPath
    });
  };

  // Update potential move path when cursor moves
  defineComponentSystem(world, CursorTilePosition, () => {
    const selectedEntity = getSelectedEntity(Selected);
    if (selectedEntity !== undefined) {
      updatePotentialMovePath(selectedEntity);
    }
  });

  // Updates the potential move path when selecting/deselecting an entity
  defineComponentSystem(world, Selected, ({entity, value}) => {
    if (value[0]) {
      updatePotentialMovePath(entity);
    } else {
      removeComponent(PotentialMovePath, entity);
    }
  });

  // Updates traverseXFirst for the potential move path when pressing R
  input.onKeyPress(keys => keys.has('R'), () => {
    const selectedEntity = getSelectedEntity(Selected);
    if (selectedEntity !== undefined) {
      updatePotentialMovePath(selectedEntity, true);
    }
  });

  // Handles confirmation of the potential path
  input.click$.subscribe(() => {
    const selectedEntity = getSelectedEntity(Selected);
    if (selectedEntity !== undefined) {
      const currPath = getComponentValue(MovePath, selectedEntity);
      const newPathSegment = getComponentValueStrict(PotentialMovePath, selectedEntity);

      if (newPathSegment.xValues.length > 0) {
        let xValues: number[];
        let yValues: number[];

        // Either continues from the current move path, or overwrites it
        if (newPathSegment.continueFromPath) {
          xValues = [...(currPath?.xValues as number[]), ...newPathSegment.xValues];
          yValues = [...(currPath?.yValues as number[]), ...newPathSegment.yValues];

          // Self-intersection path reduction
          const positionIndices = new Map<string, number>();
          let largestDuplicateIndex: number | undefined;
          for (let index = 0; index < xValues.length; ++index) {
            const id = JSON.stringify([xValues[index], yValues[index]]);
            if (positionIndices.has(id)) {
              largestDuplicateIndex = index;
            } else {
              positionIndices.set(id, index);
            }
          }

          // If there is a self intersection of the new path, remove the redundant portion between
          // the intersection elements
          if (largestDuplicateIndex !== undefined) {
            const firstIndex = positionIndices.get(
              JSON.stringify([xValues[largestDuplicateIndex], yValues[largestDuplicateIndex]])
            ) as number;
            xValues.splice(firstIndex, largestDuplicateIndex - firstIndex);
            yValues.splice(firstIndex, largestDuplicateIndex - firstIndex);
          }
        } else {
          // Includes the pending move position in the resulting path when creating a new path while
          // an old one already exists, otherwise a gap is created
          const pendingMovePosition = getComponentValue(PendingMovePosition, selectedEntity);
          if (pendingMovePosition) {
            xValues = [pendingMovePosition.x, ...newPathSegment.xValues];
            yValues = [pendingMovePosition.y, ...newPathSegment.yValues];
          } else {
            xValues = newPathSegment.xValues;
            yValues = newPathSegment.yValues;
          }
        }

        setComponent(MovePath, selectedEntity, {xValues, yValues});
        updateComponent(PotentialMovePath, selectedEntity, {continueFromPath: true});
        updatePotentialMovePath(selectedEntity);
      }
    }
  });

  // TODO maybe make this a more generic system for drawing any collection of rects???
  type PathType = ComponentValueFromComponent<typeof MovePath>;
  const drawTileRects = (
    entity: EntityIndex, id: string, currPath: PathType | undefined, prevPath: PathType | undefined,
    fillColor: number, fillAlpha = 0.4
  ) => {
    if (currPath) {
      currPath.xValues.forEach((x, index) => {
        const position = {x, y: currPath.yValues[index]};
        drawRect(objectPool, `${id}-${entity}-${index}`, position, fillColor, fillAlpha);
      });
    }

    // Deletes any rects if needed
    const prevCount = prevPath?.xValues?.length ?? 0;
    const currCount = currPath?.xValues?.length ?? 0;
    for (let index = currCount; index < prevCount; ++index) {
      objectPool.remove(`${id}-${entity}-${index}`);
    }
  };

  // Handles drawing and removal of potential move path rects
  defineComponentSystem(world, PotentialMovePath, ({entity, value}) => {
    const [currPotentialMovePath, prevPotentialMovePath] = value;
    drawTileRects(entity, 'PotentialMovePathRect', currPotentialMovePath, prevPotentialMovePath, 0x0000ff, 0.2);
  });

  // Makes a move if possible
  const attemptMove = (entityIndex: EntityIndex) => {
    const movePath = getComponentValueStrict(MovePath, entityIndex);

    // Do not start a new move if there is already a pending move
    if (getComponentValue(PendingMovePosition, entityIndex) || movePath.xValues.length === 0) {
      return;
    }

    const oldPosition = getComponentValueStrict(LocalPosition, entityIndex);
    const newPosition = {x: movePath.xValues[0], y: movePath.yValues[0]};
    const parsedMapData = getParsedMapDataFromComponent(MapData);
    const oldTileType = getMapTileValue(parsedMapData, oldPosition);
    const newTileType = getMapTileValue(parsedMapData, newPosition);
    const entityID = world.entities[entityIndex];

    if (oldTileType === TileType.PLAINS) {
      if (newTileType === TileType.PLAINS) {
        plainsMove(entityID, newPosition);
      } else {
        // New random nonce every time upon entering the jungle
        const nonce = getRandomNonce();
        setPersistedComponent(Nonce, entityIndex, {value: nonce});
        jungleEnterProver({...newPosition, nonce}).then(({proofData, publicSignals}) => {
          jungleEnter(entityID, newPosition, publicSignals[0], proofData);
        });
      }
    } else if (newTileType === TileType.PLAINS) {
      const nonce = getComponentValueStrict(Nonce, entityIndex).value;
      jungleExit(entityID, oldPosition, nonce, newPosition);
    } else {
      const nonce = getComponentValueStrict(Nonce, entityIndex).value;
      jungleMoveProver({
        oldX: oldPosition.x, oldY: oldPosition.y, oldNonce: nonce,
        newX: newPosition.x, newY: newPosition.y,
        ...getMapTileMerkleData(parsedMapData, newPosition),
      }).then(({proofData, publicSignals}) => {
        jungleMove(entityID, publicSignals[1], proofData);
        setPersistedComponent(Nonce, entityIndex, {value: nonce + 1});
      });
    }
    setComponent(PendingMovePosition, entityIndex, newPosition);
  };

  // Handles attempting moves if the path changes, and drawing and removal of move path rects
  defineComponentSystem(world, MovePath, ({entity, value}) => {
    const [currMovePath, prevMovePath] = value;
    drawTileRects(entity, 'MovePathRect', currMovePath, prevMovePath, 0x0000ff);
    attemptMove(entity);
  });

  // Updates the action source position when the pending move position changes
  defineComponentSystem(world, PendingMovePosition, ({entity, value}) => {
    const pendingMovePosition = value[0];
    const entityPosition = getComponentValueStrict(LocalPosition, entity);
    setComponent(ActionSourcePosition, entity, pendingMovePosition ?? entityPosition);
  });

  // Handles updating the movePath and (indirectly) submitting the next move when a move transaction is
  // confirmed, and updates the potential move path to match the new entity position
  defineComponentSystem(world, LocalPosition, ({entity}) => {
    removeComponent(PendingMovePosition, entity);

    const movePath = getComponentValue(MovePath, entity);
    if (movePath) {
      // Updating the move path also submits the next move if possible
      setComponent(MovePath, entity, {
        xValues: movePath.xValues.slice(1),
        yValues: movePath.yValues.slice(1),
      });
    }

    if (getSelectedEntity(Selected) === entity) {
      updatePotentialMovePath(entity);
    }
  });
}