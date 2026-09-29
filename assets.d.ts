/**
 * Metro resolves a `.db` file to an asset module id. Expo already treats `db` as an asset
 * extension (see the plan), so the only thing missing is the type.
 */
declare module '*.db' {
  const assetId: number;
  export default assetId;
}
