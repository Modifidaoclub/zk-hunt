import {createWorld, EntityID} from '@latticexyz/recs';
import {setupDevSystems} from './setup';
import {
  createActionSystem,
  defineBoolComponent,
  defineCoordComponent,
  defineNumberComponent,
  defineStringComponent,
  setupContracts
} from '@latticexyz/std-client';
import {defineLoadingStateComponent} from './components';
import {SystemTypes} from '../../../../contracts/types/SystemTypes';
import {SystemAbis} from '../../../../contracts/types/SystemAbis.mjs';
import {GameConfig, getNetworkConfig} from './config';
import {Coord} from '@latticexyz/utils';
import {BigNumberish} from 'ethers';
import {defineMapDataComponent} from './components/MapDataComponent';
import {defineHitTilesComponent} from './components/HitTilesComponent';
import {Direction} from '../../constants';

/**
 * The Network layer is the lowest layer in the client architecture.
 * Its purpose is to synchronize the client components with the contract components.
 */
export async function createNetworkLayer(config: GameConfig) {
  console.log('Network config', config);

  // --- WORLD ----------------------------------------------------------------------
  const world = createWorld();

  // --- COMPONENTS -----------------------------------------------------------------
  const components = {
    LoadingState: defineLoadingStateComponent(world),
    Position: defineCoordComponent(world, {
      id: 'Position',
      metadata: {
        contractId: 'zkhunt.component.Position',
      },
    }),
    // TODO change this and mapData to components that can represent uint256
    PositionCommitment: defineStringComponent(world, {
      id: 'PositionCommitment',
      metadata: {contractId: 'zkhunt.component.PositionCommitment'}
    }),
    MapData: defineMapDataComponent(world),
    ControlledBy: defineStringComponent(world, {
      id: 'ControlledBy',
      metadata: {contractId: 'zkhunt.component.ControlledBy'}
    }),
    JungleMoveCount: defineNumberComponent(world, {
      id: 'JungleMoveCount',
      metadata: {contractId: 'zkhunt.component.JungleMoveCount'}
    }),
    HitTiles: defineHitTilesComponent(world),
    PotentialHit: defineStringComponent(world, {
      id: 'PotentialHit',
      metadata: {contractId: 'zkhunt.component.PotentialHit'}
    }),
    Dead: defineBoolComponent(world, {
      id: 'Dead',
      metadata: {contractId: 'zkhunt.component.Dead'}
    }),
  };

  // --- SETUP ----------------------------------------------------------------------
  const {txQueue, systems, txReduced$, network, startSync, encoders} = await setupContracts<typeof components,
    SystemTypes>(getNetworkConfig(config), world, components, SystemAbis);

  // --- ACTION SYSTEM --------------------------------------------------------------
  const actions = createActionSystem(world, txReduced$);

  // --- API ------------------------------------------------------------------------
  function spawn(controller: string) {
    systems['zkhunt.system.Spawn'].executeTyped(controller);
  }

  function plainsMove(entity: EntityID, newPosition: Coord) {
    systems['zkhunt.system.PlainsMove'].executeTyped(entity, newPosition);
  }

  function jungleEnter(entity: EntityID, newPosition: Coord, commitment: BigNumberish, proofData: string[]) {
    systems['zkhunt.system.JungleEnter'].executeTyped(entity, newPosition, commitment, proofData);
  }

  function jungleMove(entity: EntityID, commitment: BigNumberish, proofData: string[]) {
    systems['zkhunt.system.JungleMove'].executeTyped(entity, commitment, proofData);
  }

  function jungleExit(entity: EntityID, oldPosition: Coord, oldPositionNonce: number, newPosition: Coord) {
    systems['zkhunt.system.JungleExit'].executeTyped(entity, oldPosition, oldPositionNonce, newPosition);
  }

  function createHit(entity: EntityID, direction: Direction) {
    systems['zkhunt.system.HitCreation'].executeTyped(entity, direction);
  }

  function jungleHitAvoid(entity: EntityID, proofData: string[]) {
    systems['zkhunt.system.JungleHitAvoid'].executeTyped(entity, proofData);
  }

  function jungleHitReceive(entity: EntityID, position: Coord, nonce: number) {
    systems['zkhunt.system.JungleHitReceive'].executeTyped(entity, position, nonce);
  }

  // --- CONTEXT --------------------------------------------------------------------
  const context = {
    world,
    components,
    txQueue,
    systems,
    txReduced$,
    startSync,
    network,
    actions,
    api: {spawn, plainsMove, jungleEnter, jungleMove, jungleExit, createHit, jungleHitAvoid, jungleHitReceive},
    dev: setupDevSystems(world, encoders, systems),
  };

  return context;
}