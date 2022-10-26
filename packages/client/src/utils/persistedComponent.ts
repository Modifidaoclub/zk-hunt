import {Component, ComponentValue, EntityID, EntityIndex, Schema, setComponent} from '@latticexyz/recs';

// TODO get rid of the worldAddress params in these two functions once the worldAddress can
// be accessed through the world object
function getWorldAddress() {
  return new URLSearchParams(window.location.search).get('worldAddress');
}

// Sets the value of a local component as well as persisting the value to localStorage
export function setPersistedComponent<S extends Schema>(
  component: Component<S>,
  entity: EntityIndex,
  value: ComponentValue<S>,
  persist = true,
) {
  setComponent(component, entity, value);
  if (persist) {
    const entityID = component.world.entities[entity];
    const worldAddress = getWorldAddress();
    localStorage.setItem(
      `persistedComponentValue-${worldAddress}-${component.id}-${entityID}`, JSON.stringify(value)
    );
  }
}

// Restores any found persisted component values from local storage
export function restorePersistedComponents<S extends Schema[]>(
  components: Record<string, Component<S[number]>>
) {
  const world = Object.values(components)[0].world;
  const worldAddress = getWorldAddress();
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('persistedComponentValue')) {
      const [_, restoredWorldAddress, componentId, entityId] = key.split('-');

      // Only restore if related to the current world, otherwise delete
      if (restoredWorldAddress === worldAddress) {
        const entityIndex = world.registerEntity({id: entityId as EntityID});
        const value = JSON.parse(localStorage.getItem(key)!);
        setComponent(components[componentId], entityIndex, value);
      } else {
        localStorage.removeItem(key);
      }
    }
  });
}