export function existingLayers(
  map: { getLayer: (id: string) => unknown },
  ids: readonly string[],
): string[] {
  return ids.filter((id) => Boolean(map.getLayer(id)));
}
